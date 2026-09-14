import { describe, it, expect } from 'vitest'
import {
  TREND_ALPHA,
  dailyMeanWeights,
  trendChange,
  trendOn,
  weightTrend,
} from '@/lib/diet/trend'
import { dailyWeights, weigh } from './fixtures'

describe('weight trend (EWMA)', () => {
  it('uses the documented Hacker’s Diet smoothing factor', () => {
    expect(TREND_ALPHA).toBe(0.1)
  })

  it('matches a hand-computed EWMA, gap included', () => {
    // Hand-computed with alpha = 0.1:
    //   t0 = 80                                   (the first reading seeds it)
    //   t1 = 80 + 0.1 * (82 - 80)         = 80.2
    //   gap of 10 days, so the effective alpha is 1 - 0.9^10 = 0.6513215599
    //   t2 = 80.2 + 0.6513215599 * (84 - 80.2) = 82.67502192762
    const series = weightTrend([
      weigh('2026-01-01', 80),
      weigh('2026-01-02', 82),
      weigh('2026-01-12', 84),
    ])
    expect(series.map((p) => p.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-12'])
    expect(series[0].trendKg).toBe(80)
    expect(series[1].trendKg).toBeCloseTo(80.2, 10)
    expect(series[2].gapDays).toBe(10)
    expect(series[2].trendKg).toBeCloseTo(82.67502192762, 9)
  })

  it('absorbs a 2 kg one-day water swing into roughly 200 g of trend', () => {
    const flat = dailyWeights('2026-01-01', 10, () => 80)
    const withSpike = [...flat, weigh('2026-01-11', 82)]
    const series = weightTrend(withSpike)
    expect(series[series.length - 1].trendKg).toBeCloseTo(80.2, 10)
  })

  it('is empty for no data and seeds on a single reading', () => {
    expect(weightTrend([])).toEqual([])
    const one = weightTrend([weigh('2026-01-01', 77.4)])
    expect(one).toHaveLength(1)
    expect(one[0].trendKg).toBe(77.4)
    expect(one[0].gapDays).toBe(0)
  })

  it('averages duplicate weigh-ins on one day rather than taking the last', () => {
    const means = dailyMeanWeights([
      weigh('2026-01-01', 80),
      weigh('2026-01-01', 81),
      weigh('2026-01-01', 82),
    ])
    expect(means).toEqual([{ date: '2026-01-01', kg: 81 }])
    expect(weightTrend([weigh('2026-01-01', 80), weigh('2026-01-01', 82)])[0].trendKg).toBe(81)
  })

  it('lets the trend snap to reality after a 40-day gap instead of crawling', () => {
    const series = weightTrend([weigh('2026-01-01', 90), weigh('2026-02-10', 80)])
    // 1 - 0.9^40 = 0.9852191171, so the six-week-old trend is nearly discarded:
    // 90 + 0.9852191171 * (80 - 90) = 80.1478088294.
    expect(series[1].gapDays).toBe(40)
    expect(series[1].trendKg).toBeCloseTo(80.1478088294, 8)
    expect(series[1].trendKg).toBeLessThan(80.5)
  })

  it('does not treat missing days as zero-weight readings', () => {
    const sparse = weightTrend([
      weigh('2026-01-01', 80),
      weigh('2026-01-20', 80),
      weigh('2026-02-15', 80),
    ])
    for (const p of sparse) expect(p.trendKg).toBeCloseTo(80, 10)
  })

  it('sorts unordered readings before smoothing', () => {
    const a = weightTrend([weigh('2026-01-02', 82), weigh('2026-01-01', 80)])
    const b = weightTrend([weigh('2026-01-01', 80), weigh('2026-01-02', 82)])
    expect(a).toEqual(b)
  })

  it('rejects an absurd reading at the boundary', () => {
    expect(() => weightTrend([weigh('2026-01-01', -5)])).toThrow()
    expect(() => weightTrend([weigh('2026-01-01', 900)])).toThrow()
    expect(() => weightTrend([weigh('01-01-2026', 80)])).toThrow()
    expect(() => weightTrend([weigh('2026-02-30', 80)])).toThrow()
  })

  it('rejects a smoothing factor outside (0, 1]', () => {
    expect(() => weightTrend([weigh('2026-01-01', 80)], 0)).toThrow(/alpha/)
    expect(() => weightTrend([weigh('2026-01-01', 80)], 1.5)).toThrow(/alpha/)
  })
})

describe('trendOn', () => {
  const series = weightTrend([weigh('2026-01-01', 80), weigh('2026-01-10', 79)])

  it('reports how stale the trend it returns is', () => {
    const at = trendOn(series, '2026-01-15')
    expect(at?.fromDate).toBe('2026-01-10')
    expect(at?.staleDays).toBe(5)
  })

  it('refuses to extrapolate backwards', () => {
    expect(trendOn(series, '2025-12-31')).toBeNull()
    expect(trendOn([], '2026-01-01')).toBeNull()
  })
})

describe('trendChange', () => {
  it('reports a weekly rate over the elapsed days', () => {
    const series = weightTrend([weigh('2026-01-01', 80), weigh('2026-01-15', 79)])
    const change = trendChange(series, '2026-01-01', '2026-01-15')
    expect(change?.days).toBe(14)
    expect(change?.deltaKg).toBeCloseTo(series[1].trendKg - 80, 10)
    expect(change?.kgPerWeek).toBeCloseTo(((series[1].trendKg - 80) / 14) * 7, 10)
  })

  it('returns null rather than dividing by zero days', () => {
    const series = weightTrend([weigh('2026-01-01', 80)])
    expect(trendChange(series, '2026-01-01', '2026-01-20')).toBeNull()
    expect(trendChange([], '2026-01-01', '2026-01-20')).toBeNull()
  })
})
