import { describe, it, expect } from 'vitest'
import {
  ACTIVITY_MULTIPLIERS,
  bmi,
  bmiCategory,
  bmr,
  describeTdeeBasis,
  formulaTdee,
  isConfidentTdee,
  measureTdee,
  tdeeMidpoint,
  tdeeRange,
  tdeeRelativeHalfWidth,
} from '@/lib/diet'
import { PROFILE, dailyEntries, dailyWeights, dates, entry, weigh } from './fixtures'

describe('Mifflin-St Jeor', () => {
  it('matches the hand-computed BMR for the male form', () => {
    // 10*80 + 6.25*175 - 5*30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75
    expect(bmr(PROFILE)).toBeCloseTo(1748.75, 10)
  })

  it('matches the hand-computed BMR for the female form', () => {
    // 10*62 + 6.25*163 - 5*34 - 161 = 620 + 1018.75 - 170 - 161 = 1307.75
    expect(
      bmr({ ...PROFILE, sex: 'female', weightKg: 62, heightCm: 163, ageYears: 34 }),
    ).toBeCloseTo(1307.75, 10)
  })

  it('applies the activity multiplier to reach a formula TDEE', () => {
    expect(ACTIVITY_MULTIPLIERS.moderate).toBe(1.55)
    expect(formulaTdee(PROFILE)).toBeCloseTo(1748.75 * 1.55, 10)
  })

  it('rejects an impossible profile at the boundary', () => {
    expect(() => bmr({ ...PROFILE, ageYears: -3 })).toThrow()
    expect(() => bmr({ ...PROFILE, heightCm: 0 })).toThrow()
    expect(() => bmr({ ...PROFILE, weightKg: 5 })).toThrow()
  })
})

describe('BMI', () => {
  it('computes and categorises', () => {
    // 80 / 1.75^2 = 26.1224...
    expect(bmi(80, 175).bmi).toBeCloseTo(26.122448979591837, 10)
    expect(bmi(80, 175).category).toBe('overweight')
  })

  it('uses the standard category boundaries', () => {
    expect(bmiCategory(18.4)).toBe('underweight')
    expect(bmiCategory(18.5)).toBe('healthy')
    expect(bmiCategory(24.9)).toBe('healthy')
    expect(bmiCategory(25)).toBe('overweight')
    expect(bmiCategory(30)).toBe('obese-i')
    expect(bmiCategory(35)).toBe('obese-ii')
    expect(bmiCategory(40)).toBe('obese-iii')
  })

  it('rejects absurd inputs rather than returning a huge number', () => {
    expect(() => bmi(80, 0)).toThrow()
    expect(() => bmi(-80, 175)).toThrow()
  })
})

/**
 * The reference dataset: 28 consecutive days, 2,000 kcal logged every day, a
 * weight reading every day at 80.0 kg for the first fortnight and 79.0 kg for
 * the second.
 */
const REF_ENTRIES = dailyEntries('2026-01-01', 28, 2000, 150)
const REF_WEIGHTS = dailyWeights('2026-01-01', 28, (i) => (i < 14 ? 80 : 79))
const REF_AS_OF = '2026-01-28'

describe('measured TDEE', () => {
  it('matches a hand-computed value', () => {
    // Trend seeds at 80.0 on 2026-01-01. After 14 consecutive days at 79.0 the
    // EWMA closes to 79 + 0.9^14 = 79.2287679245496 on 2026-01-28, so over the
    // 27 elapsed days the trend fell by 0.7712320754503992 kg. With a mean
    // intake of 2,000 kcal:
    //   TDEE = 2000 - (-0.7712320754503992 * 7700 / 27) = 2219.9439622580767
    const e = measureTdee({ asOf: REF_AS_OF, entries: REF_ENTRIES, weights: REF_WEIGHTS })
    expect(e.kind).toBe('measured')
    if (e.kind !== 'measured') throw new Error('expected a measured estimate')
    expect(e.windowDays).toBe(28)
    expect(e.elapsedDays).toBe(27)
    expect(e.trendDeltaKg).toBeCloseTo(-0.7712320754503992, 12)
    expect(e.meanIntakeKcal).toBe(2000)
    expect(e.kcal).toBeCloseTo(2219.9439622580767, 9)
    expect(e.coverage).toBe(1)
    // At full coverage the band is +/-5% of the estimate.
    expect(e.lowKcal).toBeCloseTo(2219.9439622580767 * 0.95, 9)
    expect(e.highKcal).toBeCloseTo(2219.9439622580767 * 1.05, 9)
    expect(isConfidentTdee(e)).toBe(true)
    expect(describeTdeeBasis(e)).toMatch(/Measured from your own 28 days/)
  })

  it('beats the formula it replaces, and says which is in use', () => {
    const measured = measureTdee({ asOf: REF_AS_OF, entries: REF_ENTRIES, weights: REF_WEIGHTS })
    if (measured.kind === 'unavailable') throw new Error('expected an estimate')
    expect(measured.basis).toBe('measured')
    expect(Math.abs(tdeeMidpoint(measured)! - formulaTdee(PROFILE))).toBeGreaterThan(400)
  })

  it('stays on the formula below 14 days of both intake and weight', () => {
    const e = measureTdee({
      asOf: '2026-01-13',
      entries: dailyEntries('2026-01-01', 13, 2000, 150),
      weights: dailyWeights('2026-01-01', 13, () => 80),
      profile: PROFILE,
    })
    expect(e.kind).toBe('formula')
    if (e.kind !== 'formula') throw new Error('expected the formula')
    expect(e.basis).toBe('mifflin-st-jeor')
    expect(e.kcal).toBeCloseTo(formulaTdee(PROFILE), 10)
    expect(e.lowKcal).toBeCloseTo(formulaTdee(PROFILE) * 0.85, 10)
    expect(e.daysUntilMeasured).toBe(1)
    expect(e.reason).toMatch(/population formula/)
  })

  it('falls back to the formula when there is weight but no intake', () => {
    const e = measureTdee({
      asOf: REF_AS_OF,
      entries: [],
      weights: REF_WEIGHTS,
      profile: PROFILE,
    })
    expect(e.kind).toBe('formula')
    expect(e.daysOfIntake).toBe(0)
    expect(e.daysOfWeight).toBe(28)
  })

  it('falls back to the formula when there is intake but no weight', () => {
    const e = measureTdee({
      asOf: REF_AS_OF,
      entries: REF_ENTRIES,
      weights: [],
      profile: PROFILE,
    })
    expect(e.kind).toBe('formula')
    expect(e.daysOfWeight).toBe(0)
  })

  it('returns nothing at all — not a guess — with no data and no profile', () => {
    const e = measureTdee({ asOf: REF_AS_OF, entries: [], weights: [] })
    expect(e.kind).toBe('unavailable')
    expect(tdeeRange(e)).toBeNull()
    expect(tdeeMidpoint(e)).toBeNull()
    expect(isConfidentTdee(e)).toBe(false)
    if (e.kind !== 'unavailable') throw new Error('expected unavailable')
    expect(e.daysNeeded).toBe(14)
  })

  it('survives a single day of data', () => {
    const e = measureTdee({
      asOf: '2026-01-01',
      entries: [entry('2026-01-01T13:00', 2000, 150)],
      weights: [weigh('2026-01-01', 80)],
    })
    expect(e.kind).toBe('unavailable')
  })

  it('reports a range and no point estimate under 70% coverage', () => {
    // Intake on only 14 of the 28 days; weight on all 28.
    const patchy = dates('2026-01-01', 28)
      .filter((_, i) => i % 2 === 0)
      .map((d) => entry(`${d}T13:00`, 2000, 150))
    const e = measureTdee({ asOf: REF_AS_OF, entries: patchy, weights: REF_WEIGHTS })
    expect(e.kind).toBe('provisional')
    if (e.kind !== 'provisional') throw new Error('expected a provisional estimate')
    expect(e.confidence).toBe('low')
    expect(e.coverage).toBe(0.5)
    // The point estimate does not exist — not merely hidden.
    expect('kcal' in e).toBe(false)
    expect(e.warning).toMatch(/50% of the last 28 days are logged/)
    // Half-width at 0.5 coverage is 0.05 + 0.5*0.5 = 30%.
    expect(tdeeRelativeHalfWidth(0.5)).toBeCloseTo(0.3, 12)
    const mid = (e.lowKcal + e.highKcal) / 2
    expect(e.lowKcal).toBeCloseTo(mid * 0.7, 9)
    expect(e.highKcal).toBeCloseTo(mid * 1.3, 9)
  })

  it('widens the band exactly at the 70% threshold and no earlier', () => {
    expect(tdeeRelativeHalfWidth(1)).toBeCloseTo(0.05, 12)
    expect(tdeeRelativeHalfWidth(0.7)).toBeCloseTo(0.2, 12)
    // 20 of 28 days is 0.714..., just over the threshold.
    const nearly = dates('2026-01-01', 28)
      .slice(0, 20)
      .map((d) => entry(`${d}T13:00`, 2000, 150))
    expect(measureTdee({ asOf: REF_AS_OF, entries: nearly, weights: REF_WEIGHTS }).kind).toBe(
      'measured',
    )
    const justUnder = dates('2026-01-01', 28)
      .slice(0, 19)
      .map((d) => entry(`${d}T13:00`, 2000, 150))
    expect(measureTdee({ asOf: REF_AS_OF, entries: justUnder, weights: REF_WEIGHTS }).kind).toBe(
      'provisional',
    )
  })

  it('shrinks the rolling window to the span the data covers', () => {
    const e = measureTdee({
      asOf: '2026-01-20',
      entries: dailyEntries('2026-01-01', 20, 2000, 150),
      weights: dailyWeights('2026-01-01', 20, () => 80),
    })
    expect(e.windowDays).toBe(20)
    expect(e.kind).toBe('measured')
  })

  it('clamps a requested window to 14-28 days', () => {
    expect(
      measureTdee({ asOf: REF_AS_OF, entries: REF_ENTRIES, weights: REF_WEIGHTS, windowDays: 3 })
        .windowDays,
    ).toBe(14)
    expect(
      measureTdee({ asOf: REF_AS_OF, entries: REF_ENTRIES, weights: REF_WEIGHTS, windowDays: 90 })
        .windowDays,
    ).toBe(28)
  })

  it('ignores days outside the rolling window, including a 40-day gap', () => {
    const stale = dailyEntries('2025-11-01', 30, 4000, 200)
    const e = measureTdee({
      asOf: REF_AS_OF,
      entries: [...stale, ...REF_ENTRIES],
      weights: REF_WEIGHTS,
    })
    expect(e.kind).toBe('measured')
    if (e.kind !== 'measured') throw new Error('expected a measured estimate')
    expect(e.meanIntakeKcal).toBe(2000)
  })

  it('refuses an implausible measurement and says why', () => {
    // 1,000 kcal a day alongside a 10 kg gain implies negative expenditure.
    const e = measureTdee({
      asOf: REF_AS_OF,
      entries: dailyEntries('2026-01-01', 28, 1000, 80),
      weights: dailyWeights('2026-01-01', 28, (i) => 80 + i * 0.4),
      profile: PROFILE,
    })
    expect(e.kind).toBe('formula')
    if (e.kind !== 'formula') throw new Error('expected the formula')
    expect(e.reason).toMatch(/not plausible/)
  })

  it('rejects malformed input at the boundary', () => {
    expect(() => measureTdee({ asOf: '2026-1-1', entries: [], weights: [] })).toThrow()
    expect(() =>
      measureTdee({ asOf: REF_AS_OF, entries: [], weights: [weigh('2026-01-01', 0)] }),
    ).toThrow()
  })
})
