import { describe, expect, it, vi } from 'vitest'
import { buildBrief } from '@/lib/agent/brief'
import { MIN_ACTIVE_APPS, MIN_ACTIVE_DAYS, assessReadiness } from '@/lib/agent/readiness'
import type { SynthesisOutcome } from '@/lib/agent/model'
import { timelineOf, TODAY } from './fixtures'

/**
 * The whole agent, end to end, with no database and no network — which is the
 * property the seam was built for (spec 4.2: "feed it fixture summaries from
 * four apps and assert the brief it writes").
 */

const ok = (text: string) =>
  vi.fn(async (): Promise<SynthesisOutcome> => ({ ok: true, text, model: 'test/model' }))

/** Four apps with a fortnight of real history, and a stall to talk about. */
function richTimelines() {
  return [
    timelineOf('diet', 'iiiooooooooooo', { trend: 'ffffffffffffff' }),
    timelineOf('learn', 'iiioooooooooob'),
    timelineOf('train', 'ooooooooooobbb'),
    timelineOf('ops', 'ooooooooaaaaaa'),
  ]
}

describe('silence below the minimum', () => {
  it('declines to speak, and says why, on a nearly empty account', async () => {
    const brief = await buildBrief({
      timelines: [timelineOf('diet', 'iiiiiiiiiiiioo')],
      today: TODAY,
      synthesise: ok('should never be called'),
    })
    expect(brief.status).toBe('not-enough-data')
    expect(brief.synthesis).toBeNull()
    expect(brief.reason).toContain('at least')
  })

  it('shows nothing rather than a hedged half-brief', async () => {
    // The tempting mistake is to print two of the rules' findings under a
    // heading that says "not enough data". That is the confident-voice-on-thin-
    // evidence failure the gate exists to prevent, so the list is empty.
    const brief = await buildBrief({ timelines: [timelineOf('diet', 'iiiiiiiiiiiioo')], today: TODAY })
    expect(brief.observations).toEqual([])
    expect(brief.proposals).toEqual([])
  })

  it('never spends a token when it has decided to stay quiet', async () => {
    const synthesise = ok('nope')
    await buildBrief({ timelines: [timelineOf('diet', 'iiiiiiiiiiiioo')], today: TODAY, synthesise })
    expect(synthesise).not.toHaveBeenCalled()
  })

  it('needs two apps, because one app has no cross-app sentence to write', () => {
    const oneApp = assessReadiness([timelineOf('diet', 'iooooooooooooo')])
    expect(oneApp.ready).toBe(false)
    expect(oneApp.activeApps).toBeLessThan(MIN_ACTIVE_APPS)

    const twoApps = assessReadiness([
      timelineOf('diet', 'iooooooooooooo'),
      timelineOf('ops', 'ooooooooooooob'),
    ])
    expect(twoApps.ready).toBe(true)
    expect(twoApps.activeDays).toBeGreaterThanOrEqual(MIN_ACTIVE_DAYS)
  })

  it('does not count an app whose fortnight is one day repeated fourteen times', () => {
    // Found by running against a real three-day-old account, not by a fixture.
    // Ops publishes `ok` and "Nothing due today." whether it holds no tasks at
    // all or you are simply on top of them, so `status !== 'idle'` credited
    // fourteen days of history to an app that had never been opened — and the
    // gate then approved a brief built on one app and three days of food.
    const untouched = assessReadiness([
      timelineOf('diet', 'iiiiiiiiiiiooo'),
      timelineOf('ops', 'oooooooooooooo'),
    ])
    expect(untouched.ready).toBe(false)
    expect(untouched.activeApps).toBe(1)
  })
})

describe('the rules always run, and always survive the model', () => {
  it('produces the deterministic brief with no synthesiser at all', async () => {
    const brief = await buildBrief({ timelines: richTimelines(), today: TODAY })
    expect(brief.observations.length).toBeGreaterThan(0)
    expect(brief.synthesis).toBeNull()
    expect(brief.model).toBeNull()
  })

  it('keeps the observations when the model is out of budget', async () => {
    const brief = await buildBrief({
      timelines: richTimelines(),
      today: TODAY,
      synthesise: async () => ({ ok: false, failure: 'budget-exhausted', detail: 'spent' }),
    })
    expect(brief.status).toBe('observations-only')
    expect(brief.observations.length).toBeGreaterThan(0)
    expect(brief.synthesisFailure).toBe('budget-exhausted')
    expect(brief.reason).toBe('spent')
  })

  it('keeps the observations when the provider is rate limiting', async () => {
    const brief = await buildBrief({
      timelines: richTimelines(),
      today: TODAY,
      synthesise: async () => ({ ok: false, failure: 'rate-limited', detail: 'slow down' }),
    })
    expect(brief.synthesisFailure).toBe('rate-limited')
    expect(brief.observations.length).toBeGreaterThan(0)
  })
})

describe('the model may join the facts and nothing more', () => {
  it('keeps a synthesis whose every number came from the rules', async () => {
    const brief = await buildBrief({
      timelines: richTimelines(),
      today: TODAY,
      synthesise: ok(
        'Your weight trend has not moved in 14 days, and Ops has had something overdue for 6. Those are the same fortnight.',
      ),
    })
    expect(brief.status).toBe('ready')
    expect(brief.synthesis).toContain('same fortnight')
    expect(brief.model).toBe('test/model')
  })

  it('drops a synthesis that states a figure the rules never produced', async () => {
    // The failure this guards is specific: a plausible, confident, invented
    // number on a screen about somebody's body. It is dropped whole rather
    // than edited, because there is no way from here to know which of the
    // surrounding sentences were leaning on it.
    const brief = await buildBrief({
      timelines: richTimelines(),
      today: TODAY,
      synthesise: ok('You are running a 437 kcal surplus, which explains the flat trend.'),
    })
    expect(brief.synthesis).toBeNull()
    expect(brief.synthesisFailure).toBe('unverifiable')
    expect(brief.reason).toContain('437')
    expect(brief.observations.length).toBeGreaterThan(0)
  })

  it('drops a synthesis that turns an overlap into a cause', async () => {
    const brief = await buildBrief({
      timelines: richTimelines(),
      today: TODAY,
      synthesise: ok('Skipping study causes you to stop logging food.'),
    })
    expect(brief.synthesis).toBeNull()
    expect(brief.synthesisFailure).toBe('unverifiable')
  })

  it('drops a synthesis that suggests moving the study plan', async () => {
    // The plan being fixed is the product. A model that offered to reschedule
    // it would be the excuse machine spec 5.4 refuses to build, so the output
    // is rejected even though it breaks no other rule.
    const brief = await buildBrief({
      timelines: richTimelines(),
      today: TODAY,
      synthesise: ok('Consider pushing back the study days you missed to next week.'),
    })
    expect(brief.synthesis).toBeNull()
    expect(brief.synthesisFailure).toBe('unverifiable')
  })
})

describe('when a token is worth spending', () => {
  it('does not buy a sentence when only one app had anything to say', async () => {
    const synthesise = ok('unnecessary')
    const brief = await buildBrief({
      // Ops is used and passes the readiness gate, but nothing in it crossed a
      // threshold, so every observation comes from Diet alone.
      timelines: [timelineOf('diet', 'iiiiiooooooooo'), timelineOf('ops', 'ooooooooooooob')],
      today: TODAY,
      synthesise,
    })
    expect(synthesise).not.toHaveBeenCalled()
    expect(brief.status).toBe('observations-only')
    expect(brief.observations.length).toBeGreaterThan(0)
  })

  it('says so plainly when nothing crossed a threshold', async () => {
    const brief = await buildBrief({
      timelines: [timelineOf('diet', 'ooooooooooooob'), timelineOf('ops', 'booooooooooooo')],
      today: TODAY,
      synthesise: ok('unnecessary'),
    })
    expect(brief.observations).toEqual([])
    expect(brief.reason).toContain('good version')
  })
})

describe('proposals are advice, never an action', () => {
  it('raises them only for facts that warrant doing something', async () => {
    const brief = await buildBrief({ timelines: richTimelines(), today: TODAY })
    expect(brief.proposals.length).toBeGreaterThan(0)
    for (const proposal of brief.proposals) {
      expect(proposal.state).toBe('pending')
      expect(proposal.id.startsWith(`${TODAY}:`)).toBe(true)
    }
  })

  it('never proposes changing the study plan', async () => {
    const brief = await buildBrief({ timelines: richTimelines(), today: TODAY })
    for (const proposal of brief.proposals) {
      expect(`${proposal.title} ${proposal.body}`).not.toMatch(
        /reschedul|push back|skip the (?:plan|study)|move the plan/i,
      )
    }
  })

  it('keeps ids stable across regenerations so a dismissal can stick', async () => {
    const first = await buildBrief({ timelines: richTimelines(), today: TODAY })
    const second = await buildBrief({ timelines: richTimelines(), today: TODAY })
    expect(second.proposals.map((p) => p.id)).toEqual(first.proposals.map((p) => p.id))
  })
})
