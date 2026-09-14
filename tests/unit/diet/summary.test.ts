import { describe, it, expect } from 'vitest'
import { dietSummary } from '@/lib/diet'
import { isStale, orderSummaries } from '@/lib/summary'
import { TARGETS, WINDOW, dailyWeights, entry, weigh } from './fixtures'

const DATE = '2026-03-14'

describe('diet summary provider', () => {
  it('produces a Today card with at most three metrics', () => {
    const s = dietSummary({
      date: DATE,
      entries: [entry(`${DATE}T13:00`, 900, 70), entry(`${DATE}T17:30`, 700, 55)],
      weights: dailyWeights('2026-03-01', 14, () => 79),
      targets: TARGETS,
      window: WINDOW,
    })
    expect(s.appId).toBe('diet')
    expect(s.href).toBe('/diet')
    expect(s.date).toBe(DATE)
    expect(s.metrics.length).toBeLessThanOrEqual(3)
    expect(s.metrics.map((m) => m.label)).toEqual(['Calories', 'Protein', 'Trend'])
    expect(s.metrics[0].value).toBe('1,600')
    expect(s.metrics[0].of).toBe('/ 2,000')
    expect(s.metrics[0].fraction).toBeCloseTo(1600 / 2000, 10)
    expect(s.metrics[1].value).toBe('125 g')
    expect(s.metrics[2].value).toBe('79.0 kg')
  })

  it('writes a headline that is a sentence, not a metric restated', () => {
    const s = dietSummary({
      date: DATE,
      entries: [entry(`${DATE}T13:00`, 900, 70), entry(`${DATE}T17:30`, 700, 55)],
      targets: TARGETS,
      window: WINDOW,
    })
    expect(s.headline).toBe('400 kcal left today, and you last ate at 17:30.')
    expect(s.status).toBe('ok')
  })

  it('is idle, not zeroed, when nothing has been logged', () => {
    const s = dietSummary({ date: DATE, entries: [], targets: TARGETS })
    expect(s.status).toBe('idle')
    expect(s.headline).toBe('Nothing logged today yet.')
    expect(s.metrics).toEqual([])
  })

  it('calls out an overshoot beyond the target band', () => {
    const s = dietSummary({
      date: DATE,
      entries: [entry(`${DATE}T13:00`, 2400, 120)],
      targets: TARGETS,
      window: WINDOW,
    })
    expect(s.status).toBe('attention')
    expect(s.headline).toBe("You're 400 kcal over target and you last ate at 13:00.")
  })

  it('reports a meal outside the window as a fact, without scolding', () => {
    const s = dietSummary({
      date: DATE,
      entries: [entry(`${DATE}T13:00`, 900, 70), entry(`${DATE}T21:15`, 400, 30)],
      targets: TARGETS,
      window: WINDOW,
    })
    expect(s.status).toBe('behind')
    expect(s.headline).toBe('1 meal landed outside your eating window today.')
  })

  it('stays inside the band when a small overshoot is within tolerance', () => {
    const s = dietSummary({
      date: DATE,
      entries: [entry(`${DATE}T13:00`, 2100, 150)],
      targets: TARGETS,
      window: WINDOW,
    })
    expect(s.status).toBe('ok')
    expect(s.headline).toBe("You're on target for today, and you last ate at 13:00.")
  })

  it('works without targets and without weights', () => {
    const s = dietSummary({ date: DATE, entries: [entry(`${DATE}T13:00`, 1750, 90)] })
    expect(s.metrics.map((m) => m.label)).toEqual(['Calories', 'Protein'])
    expect(s.metrics[0].of).toBeUndefined()
    expect(s.headline).toBe('1,750 kcal so far today, and you last ate at 13:00.')
  })

  it('marks the weight trend direction over the past week', () => {
    const down = dietSummary({
      date: DATE,
      entries: [],
      weights: [weigh('2026-03-01', 82), weigh(DATE, 79)],
    })
    expect(down.metrics[0]).toMatchObject({ label: 'Trend', trend: 'down' })
    const flat = dietSummary({
      date: DATE,
      entries: [],
      weights: dailyWeights('2026-03-01', 14, () => 79),
    })
    expect(flat.metrics[0].trend).toBe('flat')
    const unknown = dietSummary({ date: DATE, entries: [], weights: [weigh(DATE, 79)] })
    expect(unknown.metrics[0].trend).toBe('unknown')
  })

  it('fits the shared AppSummary seam', () => {
    const s = dietSummary({ date: DATE, entries: [], targets: TARGETS })
    expect(isStale(s, DATE)).toBe(false)
    expect(isStale(s, '2026-03-15')).toBe(true)
    expect(orderSummaries([s])).toEqual([s])
  })

  it('rejects a malformed date or entry at the boundary', () => {
    expect(() => dietSummary({ date: 'today', entries: [] })).toThrow()
    expect(() => dietSummary({ date: DATE, entries: [entry(`${DATE}T13:00`, -100)] })).toThrow()
  })
})
