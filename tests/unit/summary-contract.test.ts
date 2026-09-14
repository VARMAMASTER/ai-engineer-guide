import { describe, it, expect } from 'vitest'
import { isStale, orderSummaries, type AppSummary } from '@/lib/summary'
import { dietSummary } from '@/lib/diet/summary'
import { trainSummary } from '@/lib/train/summary'
import { opsSummary } from '@/lib/ops/summary'
import { learnSummary } from '@/lib/learn/summary'
import type { Plan, TrainingProfile } from '@/lib/train/types'

/**
 * The seam, tested across every app at once.
 *
 * `lib/summary` is the only thing that crosses a mini-app boundary: each app
 * publishes an `AppSummary`, and Today and the agent consume that and nothing
 * else. Three separate agents built the three providers, and each could only
 * see its own app — so each app's own suite proves its provider returns
 * *something*, and none of them can prove the three agree.
 *
 * That is exactly where a seam rots. This file is the only place the contract
 * is checked as a contract.
 *
 * The three take deliberately different inputs — Diet a calendar date, Train a
 * `today` string, Ops a `Date` — which is fine, because the provider is generic
 * over its input. What must not differ is what comes out.
 */

const TODAY = '2026-09-14'

/*
 * The fixtures are annotated rather than inferred on purpose.
 *
 * This file was committed with `plan` missing `daysPerWeek`. Every runtime test
 * passed — a missing property throws nothing when no code path reads it — and
 * `pnpm test` was green, so the defect reached the branch and only surfaced in
 * `pnpm build`. Naming the types makes the compiler check the fixture against
 * the schema it is standing in for, which is the whole reason a fixture exists.
 */
const PROFILE: TrainingProfile = {
  goal: 'hypertrophy',
  experience: 'intermediate',
  availableDays: 3,
  equipment: ['dumbbell'],
  injuries: [],
}

const PLAN: Plan = { daysPerWeek: 3, split: 'full_body', days: [], notes: [] }

function summaries(): AppSummary[] {
  return [
    dietSummary({ date: TODAY, entries: [] }),
    trainSummary({
      profile: PROFILE,
      plan: PLAN,
      sessions: [],
      today: TODAY,
    }),
    opsSummary({ tasks: [], goals: [], now: new Date(`${TODAY}T09:00:00`) }),
    // Learn joined this file late: it was the one app with no provider, which
    // meant the half of the product the other three are arranged around was
    // invisible to both of the seam's legitimate consumers. Added here rather
    // than only in its own suite, because this is the only place the four are
    // checked as agreeing with each other.
    learnSummary({ startDate: null, completed: {}, today: TODAY }),
  ]
}

describe('every app satisfies the AppSummary contract', () => {
  it('produces a summary from empty data rather than throwing', () => {
    // A brand-new account has nothing in any app. If a provider throws on empty
    // input, Today is blank on the one day a user is most likely to look at it.
    expect(() => summaries()).not.toThrow()
    expect(summaries()).toHaveLength(4)
  })

  it('fills every required field with something usable', () => {
    for (const s of summaries()) {
      expect(s.appId, 'appId').toMatch(/^[a-z]+$/)
      expect(s.title.trim().length, `${s.appId} title`).toBeGreaterThan(0)
      expect(s.href, `${s.appId} href`).toMatch(/^\//)
      expect(['ok', 'behind', 'attention', 'idle']).toContain(s.status)
      expect(s.date, `${s.appId} date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('writes a headline that is a sentence, not a restated metric', () => {
    // The contract asks for "one sentence a person would say out loud". A
    // provider returning "Calories: 1,840" satisfies the type and defeats the
    // point, so the shape is checked: real words, not a bare label-colon-number.
    for (const s of summaries()) {
      expect(s.headline.trim().length, `${s.appId} headline`).toBeGreaterThan(0)
      expect(s.headline, `${s.appId} headline reads as a label, not a sentence`).not.toMatch(
        /^[A-Za-z ]+:\s*[\d.,]+$/,
      )
    }
  })

  it('keeps to at most three metrics — more than three is a dashboard, not a card', () => {
    for (const s of summaries()) {
      expect(s.metrics.length, `${s.appId} metric count`).toBeLessThanOrEqual(3)
      for (const m of s.metrics) {
        expect(m.label.trim().length, `${s.appId} metric label`).toBeGreaterThan(0)
        expect(typeof m.value, `${s.appId} metric value is pre-formatted`).toBe('string')
        if (m.fraction !== undefined) {
          // A fraction drives a meter, so an out-of-range value paints a bar
          // past its own track.
          expect(m.fraction, `${s.appId} fraction`).toBeGreaterThanOrEqual(0)
          expect(m.fraction, `${s.appId} fraction`).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('gives every app a distinct id, so Today cannot key two cards the same', () => {
    const ids = summaries().map((s) => s.appId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('dates the summary to the day it describes, so staleness is detectable', () => {
    for (const s of summaries()) {
      expect(isStale(s, TODAY), `${s.appId} should not be stale for ${TODAY}`).toBe(false)
      expect(isStale(s, '2026-09-15'), `${s.appId} should be stale for tomorrow`).toBe(true)
    }
  })
})

describe('ordering', () => {
  it('floats whatever needs attention above whatever is fine', () => {
    // A fixed app order buries the one app that is actually off track behind
    // whichever app happens to be listed first.
    const make = (appId: string, status: AppSummary['status']): AppSummary => ({
      appId,
      title: appId,
      href: `/${appId}`,
      status,
      headline: 'x',
      metrics: [],
      date: TODAY,
    })
    const ordered = orderSummaries([
      make('a', 'idle'),
      make('b', 'ok'),
      make('c', 'attention'),
      make('d', 'behind'),
    ])
    expect(ordered.map((s) => s.appId)).toEqual(['c', 'd', 'b', 'a'])
  })

  it('is stable and total, so the card order does not flicker between renders', () => {
    const make = (appId: string): AppSummary => ({
      appId,
      title: appId,
      href: `/${appId}`,
      status: 'ok',
      headline: 'x',
      metrics: [],
      date: TODAY,
    })
    const input = [make('train'), make('diet'), make('ops')]
    expect(orderSummaries(input).map((s) => s.appId)).toEqual(
      orderSummaries([...input].reverse()).map((s) => s.appId),
    )
  })
})
