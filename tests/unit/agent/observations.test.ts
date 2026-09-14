import { describe, expect, it } from 'vitest'
import { THRESHOLDS, observe } from '@/lib/agent/observations'
import { timelineOf, TODAY } from './fixtures'

/**
 * The rules, tested as pure functions — which is the reason the rules/model
 * split exists in the first place. Every fact the brief can state is produced
 * here, so every fact the brief can state is asserted here.
 */

function ids(timelines: Parameters<typeof observe>[0]): string[] {
  return observe(timelines).map((o) => o.id)
}

describe('an app with no history is never judged', () => {
  it('says nothing about an app that has simply never been used', () => {
    // Fourteen idle days on a brand-new account means "new", not "slipping".
    // A brief that opened by telling a first-day user they had skipped a
    // fortnight of food logging would be both wrong and cruel.
    expect(ids([timelineOf('diet', 'iiiiiiiiiiiiii')])).toEqual([])
  })

  it('needs the app to have been used on the minimum number of days first', () => {
    const justUnder = 'i'.repeat(11) + 'o'.repeat(THRESHOLDS.minActiveDaysToJudge - 1)
    const justOver = 'i'.repeat(11) + 'o'.repeat(THRESHOLDS.minActiveDaysToJudge)
    expect(ids([timelineOf('diet', justUnder)])).toEqual([])
    expect(ids([timelineOf('diet', justOver)])).toContain('diet-quiet-days')
  })
})

describe('quiet days', () => {
  it('counts days with nothing logged, and says how many out of how many', () => {
    const [observation] = observe([timelineOf('diet', 'iiiiiooooooooo')])
    expect(observation.id).toBe('diet-quiet-days')
    expect(observation.text).toBe('You logged no food at all on 5 of the last 14 days.')
    expect(observation.figures).toEqual(['5', '14'])
  })

  it('stays quiet below the threshold — two missed days is weather', () => {
    const under = 'i'.repeat(THRESHOLDS.quietDaysWorthSaying - 1) + 'o'.repeat(12)
    expect(ids([timelineOf('diet', under)])).not.toContain('diet-quiet-days')
  })

  it('escalates to act when it is most of the window', () => {
    const [observation] = observe([timelineOf('diet', 'iiiiiiiiiooooo')])
    expect(observation.severity).toBe('act')
  })
})

describe('the weight stall — the spec\'s own example', () => {
  it('reports a run that is still running, not a count', () => {
    const observations = observe([
      timelineOf('diet', 'oooooooooooooo', { trend: 'dddffffffffff' + 'f' }),
    ])
    const stall = observations.find((o) => o.id === 'diet-weight-flat')
    expect(stall?.text).toContain('flat for 11 days running')
    expect(stall?.figures).toContain('11')
  })

  it('does not fire when the run was broken yesterday', () => {
    // Twelve flat days and then a move is a trend that started moving, and
    // saying "flat for twelve days" about it would be true of the past and
    // false about now.
    const observations = observe([
      timelineOf('diet', 'oooooooooooooo', { trend: 'ffffffffffffd' + 'd' }),
    ])
    expect(observations.map((o) => o.id)).not.toContain('diet-weight-flat')
  })

  it('needs a long enough run before it counts as a stall at all', () => {
    const shortRun = 'u'.repeat(14 - THRESHOLDS.flatRunWorthSaying + 1) +
      'f'.repeat(THRESHOLDS.flatRunWorthSaying - 1)
    const observations = observe([timelineOf('diet', 'oooooooooooooo', { trend: shortRun })])
    expect(observations.map((o) => o.id)).not.toContain('diet-weight-flat')
  })
})

describe('runs in Train and Ops', () => {
  it('counts consecutive off-track days in Train', () => {
    const observations = observe([timelineOf('train', 'ooooooooooobbb')])
    const run = observations.find((o) => o.id === 'train-off-track-run')
    expect(run?.text).toContain('3 days in a row')
  })

  it('counts consecutive days with something overdue in Ops', () => {
    const observations = observe([timelineOf('ops', 'ooooooooaaaaaa')])
    const run = observations.find((o) => o.id === 'ops-overdue-run')
    expect(run?.text).toBe('Something has been overdue in Ops every day for 6 days.')
  })
})

describe('the cross-app facts, which are the reason this exists', () => {
  it('counts the days two apps were quiet together, and phrases it as a count', () => {
    // The same five days quiet in both. Stated as an overlap and nothing more:
    // no mechanism, no "because", no advice. With one person and a fortnight
    // anything stronger is noise, and spec 5.1.2 says reporting noise as
    // insight does real harm.
    const observations = observe([
      timelineOf('diet', 'iiiiiooooooooo'),
      timelineOf('learn', 'iiiiiooooooooo'),
    ])
    const overlap = observations.find((o) => o.id === 'quiet-together-diet-learn')
    expect(overlap?.text).toBe(
      'Of the 5 days with nothing logged in Diet, 5 were also a day with nothing in Learn.',
    )
    expect(overlap?.apps).toEqual(['diet', 'learn'])
    expect(overlap?.text).not.toMatch(/because|caus|leads to/i)
  })

  it('does not claim an overlap when the quiet days do not line up', () => {
    const observations = observe([
      timelineOf('diet', 'iiiiiooooooooo'),
      timelineOf('learn', 'oooooiiiiioooo'),
    ])
    expect(observations.map((o) => o.id)).not.toContain('quiet-together-diet-learn')
  })

  it('names the apps that are off track on the same day', () => {
    const observations = observe([
      timelineOf('diet', 'ooooooooooooob'),
      timelineOf('train', 'ooooooooooooob'),
    ])
    const today = observations.find((o) => o.id === 'off-track-today')
    expect(today?.text).toBe('2 of your apps are off track today at once: Diet, Train.')
  })

  it('does not call one app off track a cross-app fact', () => {
    const observations = observe([
      timelineOf('diet', 'ooooooooooooob'),
      timelineOf('train', 'oooooooooooooo'),
    ])
    expect(observations.map((o) => o.id)).not.toContain('off-track-today')
  })
})

describe('every observation is self-describing', () => {
  it('lists in figures every number it states, so a model cannot smuggle one past', () => {
    const observations = observe([
      timelineOf('diet', 'iiiiiooooooooo', { trend: 'ffffffffffffff' }),
      timelineOf('learn', 'iiiiiooooooooo'),
      timelineOf('ops', 'ooooooooaaaaaa'),
    ])
    expect(observations.length).toBeGreaterThan(0)
    for (const observation of observations) {
      const stated = (observation.text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((f) =>
        f.replace(/,/g, ''),
      )
      for (const figure of stated) {
        expect(
          observation.figures.map((x) => x.replace(/,/g, '')),
          `${observation.id} states ${figure} but does not declare it`,
        ).toContain(figure)
      }
    }
  })

  it('dates nothing to the future and needs no clock to run', () => {
    const observations = observe([timelineOf('diet', 'iiiiiooooooooo', { today: TODAY })])
    expect(observations.every((o) => !o.text.includes('undefined'))).toBe(true)
  })
})
