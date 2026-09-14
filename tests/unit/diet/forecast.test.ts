import { describe, it, expect } from 'vitest'
import {
  MONTHLY_MUSCLE_KG,
  forecastWeight,
  measureTdee,
  projectMuscleCeiling,
  scoreForecast,
  scoreForecasts,
  toStoredForecast,
  weightTrend,
  type StoredForecast,
  type TdeeEstimate,
} from '@/lib/diet'
import { PROFILE, dailyEntries, dailyWeights, weigh } from './fixtures'

const REF_ENTRIES = dailyEntries('2026-01-01', 28, 2000, 150)
const REF_WEIGHTS = dailyWeights('2026-01-01', 28, (i) => (i < 14 ? 80 : 79))
const MEASURED = measureTdee({ asOf: '2026-01-28', entries: REF_ENTRIES, weights: REF_WEIGHTS })
const START_KG = 79.2287679245496

describe('weight forecast', () => {
  it('projects at 7,700 kcal per kilogram, hand-computed', () => {
    // TDEE 2219.9439622580767 against 2,000 kcal of intake is a deficit of
    // 219.9439622580767 kcal/day. Over 30 days:
    //   79.2287679245496 - 219.9439622580767 * 30 / 7700 = 78.37184339627137
    const f = forecastWeight({
      asOf: '2026-01-28',
      horizonDays: 30,
      currentTrendKg: START_KG,
      tdee: MEASURED,
      meanIntakeKcal: 2000,
    })
    expect(f.kind).toBe('point')
    if (f.kind !== 'point') throw new Error('expected a point forecast')
    expect(f.forDate).toBe('2026-02-27')
    expect(f.dailyBalanceKcal).toBeCloseTo(-219.9439622580767, 9)
    expect(f.kg).toBeCloseTo(78.37184339627137, 8)
    expect(f.lowKg).toBeLessThan(f.kg)
    expect(f.highKg).toBeGreaterThan(f.kg)
    expect(f.basis).toBe('measured')
    expect(f.confidence).toBe('high')
  })

  it('predicts gain when intake exceeds expenditure', () => {
    const f = forecastWeight({
      asOf: '2026-01-28',
      horizonDays: 30,
      currentTrendKg: START_KG,
      tdee: MEASURED,
      meanIntakeKcal: 3000,
    })
    if (f.kind !== 'point') throw new Error('expected a point forecast')
    expect(f.kg).toBeGreaterThan(START_KG)
    expect(f.dailyBalanceKcal).toBeGreaterThan(0)
  })

  it('carries low confidence through: a provisional TDEE gives a band, not a number', () => {
    const patchy = REF_ENTRIES.filter((_, i) => i % 2 === 0)
    const provisional = measureTdee({
      asOf: '2026-01-28',
      entries: patchy,
      weights: REF_WEIGHTS,
    })
    expect(provisional.kind).toBe('provisional')
    const f = forecastWeight({
      asOf: '2026-01-28',
      horizonDays: 30,
      currentTrendKg: START_KG,
      tdee: provisional,
      meanIntakeKcal: 2000,
    })
    expect(f.kind).toBe('range')
    if (f.kind !== 'range') throw new Error('expected a range forecast')
    expect('kg' in f).toBe(false)
    expect(f.confidence).toBe('low')
    expect(f.highKg - f.lowKg).toBeGreaterThan(4) // +/-30% on TDEE over 30 days
    expect(f.warning).toMatch(/range rather than a number/)
  })

  it('refuses to project when there is no expenditure estimate', () => {
    const none: TdeeEstimate = measureTdee({ asOf: '2026-01-28', entries: [], weights: [] })
    const f = forecastWeight({
      asOf: '2026-01-28',
      horizonDays: 30,
      currentTrendKg: START_KG,
      tdee: none,
      meanIntakeKcal: 2000,
    })
    expect(f.kind).toBe('unavailable')
    expect(toStoredForecast('f1', f)).toBeNull()
  })

  it('labels a formula-based forecast as the population estimate it is', () => {
    const formula = measureTdee({
      asOf: '2026-01-10',
      entries: dailyEntries('2026-01-01', 10, 2000, 150),
      weights: dailyWeights('2026-01-01', 10, () => 80),
      profile: PROFILE,
    })
    const f = forecastWeight({
      asOf: '2026-01-10',
      horizonDays: 30,
      currentTrendKg: 80,
      tdee: formula,
      meanIntakeKcal: 2000,
    })
    if (f.kind !== 'point') throw new Error('expected a point forecast')
    expect(f.confidence).toBe('population-estimate')
    expect(f.basis).toBe('mifflin-st-jeor')
  })

  it('rejects absurd inputs at the boundary', () => {
    const base = { asOf: '2026-01-28', currentTrendKg: START_KG, tdee: MEASURED, meanIntakeKcal: 2000 }
    expect(() => forecastWeight({ ...base, horizonDays: 0 })).toThrow()
    expect(() => forecastWeight({ ...base, horizonDays: -30 })).toThrow()
    expect(() => forecastWeight({ ...base, currentTrendKg: 0, horizonDays: 30 })).toThrow()
    expect(() => forecastWeight({ ...base, meanIntakeKcal: -500, horizonDays: 30 })).toThrow()
  })
})

describe('scoring forecasts against what happened', () => {
  const stored = toStoredForecast(
    'f1',
    forecastWeight({
      asOf: '2026-01-28',
      horizonDays: 30,
      currentTrendKg: START_KG,
      tdee: MEASURED,
      meanIntakeKcal: 2000,
    }),
  ) as StoredForecast

  it('keeps a point forecast in a scoreable shape', () => {
    expect(stored.forDate).toBe('2026-02-27')
    expect(stored.kg).toBeCloseTo(78.37184339627137, 8)
    expect(stored.confidence).toBe('high')
  })

  it('reports the error against the trend that actually arrived', () => {
    const series = weightTrend([...REF_WEIGHTS, weigh('2026-02-27', 79)])
    const score = scoreForecast(stored, series)
    expect(score).not.toBeNull()
    expect(score?.actualFromDate).toBe('2026-02-27')
    expect(score?.staleDays).toBe(0)
    // One reading of 79.0 kg thirty days later leaves the trend at
    // 79.2287679245496 + (1 - 0.9^30) * (79 - 79.2287679245496) = 79.00969773729787
    // against a prediction of 78.37184339627137 — the forecast was 0.638 kg light.
    expect(score?.actualKg).toBeCloseTo(79.00969773729787, 9)
    expect(score?.errorKg).toBeCloseTo(0.6378543410264967, 9)
    expect(score?.verdict).toBe('heavier')
    expect(score?.withinRange).toBe(false)
  })

  it('counts a forecast whose outcome is unknown as unscored, never as a hit', () => {
    const noOutcome = weightTrend(REF_WEIGHTS) // nothing after 2026-01-28
    expect(scoreForecast(stored, noOutcome)).toBeNull()
    const card = scoreForecasts([stored], noOutcome)
    expect(card.scored).toHaveLength(0)
    expect(card.unscored).toBe(1)
    expect(card.meanAbsErrorKg).toBeNull()
    expect(card.withinRangeShare).toBeNull()
  })

  it('refuses a trend point that is too stale to be the outcome', () => {
    const stale = weightTrend([...REF_WEIGHTS, weigh('2026-02-20', 79)])
    expect(scoreForecast(stored, stale)).toBeNull() // 7 days stale, limit is 3
    expect(scoreForecast(stored, stale, { maxStaleDays: 10 })?.staleDays).toBe(7)
  })

  it('scores a range forecast on containment, with no point error', () => {
    const patchy = REF_ENTRIES.filter((_, i) => i % 2 === 0)
    const provisional = measureTdee({ asOf: '2026-01-28', entries: patchy, weights: REF_WEIGHTS })
    const range = toStoredForecast(
      'f2',
      forecastWeight({
        asOf: '2026-01-28',
        horizonDays: 30,
        currentTrendKg: START_KG,
        tdee: provisional,
        meanIntakeKcal: 2000,
      }),
    ) as StoredForecast
    expect(range.kg).toBeNull()
    const series = weightTrend([...REF_WEIGHTS, weigh('2026-02-27', 79)])
    const score = scoreForecast(range, series)
    expect(score?.predictedKg).toBeNull()
    expect(score?.errorKg).toBeNull()
    expect(score?.withinRange).toBe(true)
    expect(score?.verdict).toBe('within')
  })

  it('reports mean absolute error over the point forecasts it could score', () => {
    const series = weightTrend([...REF_WEIGHTS, weigh('2026-02-27', 79)])
    const card = scoreForecasts([stored, { ...stored, id: 'f3' }], series)
    expect(card.scored).toHaveLength(2)
    expect(card.unscored).toBe(0)
    expect(card.meanAbsErrorKg).toBeCloseTo(0.6378543410264967, 9)
    expect(card.withinRangeShare).toBe(0)
  })

  it('will not score a forecast against a reading made before it', () => {
    const backwards: StoredForecast = { ...stored, madeOn: '2026-03-01' }
    const series = weightTrend([...REF_WEIGHTS, weigh('2026-02-27', 79)])
    expect(scoreForecast(backwards, series)).toBeNull()
  })
})

describe('muscle-gain ceiling', () => {
  it('uses the honest trained rate from the spec', () => {
    expect(MONTHLY_MUSCLE_KG.trained).toEqual([0.25, 0.5])
  })

  it('is labelled a ceiling, not an expectation', () => {
    const c = projectMuscleCeiling({ months: 6, level: 'trained', sex: 'male' })
    expect(c.kind).toBe('ceiling')
    expect(c.lowKg).toBeCloseTo(1.5, 10)
    expect(c.highKg).toBeCloseTo(3, 10)
    expect(c.note).toMatch(/ceiling, not an expectation/)
  })

  it('halves the rate for the female form, visibly rather than silently', () => {
    const c = projectMuscleCeiling({ months: 6, level: 'trained', sex: 'female' })
    expect(c.perMonthLowKg).toBeCloseTo(0.125, 10)
    expect(c.highKg).toBeCloseTo(1.5, 10)
  })

  it('refuses a horizon long enough to be fiction', () => {
    expect(() => projectMuscleCeiling({ months: 24, level: 'trained', sex: 'male' })).toThrow()
    expect(() => projectMuscleCeiling({ months: 0, level: 'trained', sex: 'male' })).toThrow()
    expect(() =>
      projectMuscleCeiling({
        months: 6,
        level: 'elite' as unknown as 'trained',
        sex: 'male',
      }),
    ).toThrow()
  })
})
