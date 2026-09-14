/**
 * Energy and body composition (spec 5.1.2).
 *
 * The important function here is `measureTdee`. Mifflin-St Jeor is a population
 * regression carrying roughly +/-15% individual error — on 2,400 kcal that is
 * +/-360, which is large enough to make a planned deficit imaginary. Once there
 * are two weeks of both intake and weight, expenditure can be solved for from
 * the data the user is already collecting:
 *
 *     TDEE ~= mean daily intake - (delta trend weight in kg * 7700 / days)
 *
 * Note both halves of that: **trend** weight, not a raw reading (a 1.5 kg water
 * swing over 14 days is 825 kcal/day of pure noise), and mean intake over the
 * days actually **logged**, never over the period length.
 *
 * The return type is a discriminated union, and that is the point rather than
 * an implementation detail. Under 70% coverage there is no `kcal` field to
 * read: `TdeeProvisional` carries a range and declares `kcal?: never`, so a
 * component that tries to render a confident number from patchy data fails to
 * compile instead of shipping a plausible lie.
 */
import { z } from 'zod'
import {
  ACTIVITY_MULTIPLIERS,
  isoDateSchema,
  logEntrySchema,
  userProfileSchema,
  weightReadingSchema,
  type IsoDate,
  type LogEntry,
  type UserProfile,
  type WeightReading,
} from './types'
import { diffDays, trailingDates } from './time'
import { dailyTotals, totalsByDate } from './aggregate'
import { dailyMeanWeights, trendChange, trendOn, weightTrend } from './trend'

/** Energy in one kilogram of body mass. The conventional 7,700 kcal. */
export const KCAL_PER_KG = 7700

/** Days of both intake and weight before measured replaces formula. */
export const MEASURED_TDEE_MIN_DAYS = 14

/** Below this share of days logged, only a range may be reported. */
export const LOW_CONFIDENCE_COVERAGE = 0.7

/** Mifflin's individual error, used to widen the formula estimate to a range. */
export const FORMULA_RELATIVE_ERROR = 0.15

/** Mifflin-St Jeor basal metabolic rate, kcal/day. */
export function bmr(profile: UserProfile): number {
  const p = userProfileSchema.parse(profile)
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.ageYears
  return p.sex === 'male' ? base + 5 : base - 161
}

/** BMR times the activity multiplier. A population estimate, nothing more. */
export function formulaTdee(profile: UserProfile): number {
  const p = userProfileSchema.parse(profile)
  return bmr(p) * ACTIVITY_MULTIPLIERS[p.activity]
}

export type BmiCategory =
  | 'underweight'
  | 'healthy'
  | 'overweight'
  | 'obese-i'
  | 'obese-ii'
  | 'obese-iii'

export interface BmiResult {
  bmi: number
  category: BmiCategory
}

/** BMI and its WHO category. Heights are centimetres. */
export function bmi(weightKg: number, heightCm: number): BmiResult {
  const kg = z.number().min(20).max(500).parse(weightKg)
  const cm = z.number().min(100).max(250).parse(heightCm)
  const m = cm / 100
  const value = kg / (m * m)
  return { bmi: value, category: bmiCategory(value) }
}

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight'
  if (value < 25) return 'healthy'
  if (value < 30) return 'overweight'
  if (value < 35) return 'obese-i'
  if (value < 40) return 'obese-ii'
  return 'obese-iii'
}

interface TdeeCoverage {
  /** Length of the rolling window actually used, 14-28 days. */
  windowDays: number
  /** Days inside the window with at least one logged entry. */
  daysOfIntake: number
  /** Days inside the window with at least one weight reading. */
  daysOfWeight: number
  /** `min(daysOfIntake, daysOfWeight) / windowDays`, 0-1. */
  coverage: number
}

/** Not enough data, and no profile to fall back on. Carries no number at all. */
export interface TdeeUnavailable extends TdeeCoverage {
  kind: 'unavailable'
  reason: string
  daysNeeded: number
  kcal?: never
  lowKcal?: never
  highKcal?: never
}

/** The population formula, in use until measured can take over. */
export interface TdeeFromFormula extends TdeeCoverage {
  kind: 'formula'
  basis: 'mifflin-st-jeor'
  confidence: 'population-estimate'
  kcal: number
  lowKcal: number
  highKcal: number
  /** Why the formula rather than the measurement. Shown to the user verbatim. */
  reason: string
  /** Days of logging still needed before measured takes over. */
  daysUntilMeasured: number
}

interface MeasuredCommon extends TdeeCoverage {
  basis: 'measured'
  lowKcal: number
  highKcal: number
  meanIntakeKcal: number
  trendDeltaKg: number
  /** Elapsed days between the two trend points the delta was taken across. */
  elapsedDays: number
  from: IsoDate
  to: IsoDate
}

/** Measured from the user's own data, at 70% coverage or better. */
export interface TdeeMeasured extends MeasuredCommon {
  kind: 'measured'
  confidence: 'high'
  kcal: number
}

/**
 * Measured, but from patchy logging — under 70% of days.
 *
 * There is no `kcal`. The range is the answer, and `warning` is written to be
 * rendered rather than paraphrased.
 */
export interface TdeeProvisional extends MeasuredCommon {
  kind: 'provisional'
  confidence: 'low'
  kcal?: never
  warning: string
}

export type TdeeEstimate = TdeeUnavailable | TdeeFromFormula | TdeeMeasured | TdeeProvisional

export interface MeasureTdeeInput {
  asOf: IsoDate
  entries: LogEntry[]
  weights: WeightReading[]
  /** Optional. Without it, thin data yields `unavailable` rather than a guess. */
  profile?: UserProfile
  /** Rolling window length, clamped to 14-28 (spec 5.1.2). Defaults to 28. */
  windowDays?: number
}

const measureInputSchema = z.object({
  asOf: isoDateSchema,
  entries: z.array(logEntrySchema),
  weights: z.array(weightReadingSchema),
  profile: userProfileSchema.optional(),
  windowDays: z.number().int().min(1).max(365).optional(),
})

/**
 * Half-width of the measured range, as a share of the estimate.
 *
 * A declared heuristic, not a confidence interval — there is no sampling model
 * here to build one from, and dressing it up as statistics would be its own
 * kind of dishonesty. It is 5% at full coverage (scale precision and the
 * 7,700 kcal/kg constant are themselves approximations) and widens linearly to
 * 20% at the 70% threshold and 30% at half coverage.
 */
export function tdeeRelativeHalfWidth(coverage: number): number {
  return 0.05 + 0.5 * (1 - Math.max(0, Math.min(1, coverage)))
}

function formulaEstimate(
  profile: UserProfile,
  cov: TdeeCoverage,
  reason: string,
  daysUntilMeasured: number,
): TdeeFromFormula {
  const kcal = formulaTdee(profile)
  return {
    kind: 'formula',
    basis: 'mifflin-st-jeor',
    confidence: 'population-estimate',
    kcal,
    lowKcal: kcal * (1 - FORMULA_RELATIVE_ERROR),
    highKcal: kcal * (1 + FORMULA_RELATIVE_ERROR),
    reason,
    daysUntilMeasured: Math.max(0, daysUntilMeasured),
    ...cov,
  }
}

/**
 * Measured TDEE over a rolling 14-28 day window, falling back to the formula.
 *
 * Order of the decision, all of it spec 5.1.2:
 *  1. fewer than 14 days of **both** intake and weight -> formula, and say so;
 *  2. otherwise measure, over the longest window in 14-28 days the data spans;
 *  3. under 70% coverage -> a range and a warning, with no point estimate;
 *  4. an implausible result (outside 800-8,000 kcal) -> back to the formula,
 *     because a measurement that says 300 kcal/day is a data-entry problem and
 *     rendering it would be worse than rendering the population estimate.
 */
export function measureTdee(input: MeasureTdeeInput): TdeeEstimate {
  const { asOf, entries, weights, profile } = measureInputSchema.parse(input)

  const requested = Math.max(14, Math.min(28, input.windowDays ?? 28))
  const byDate = totalsByDate(entries)
  const weightDays = dailyMeanWeights(weights)

  const firstEntryDate = [...byDate.keys()].sort()[0]
  const firstWeightDate = weightDays[0]?.date
  const earliest = [firstEntryDate, firstWeightDate].filter(Boolean).sort()[0]
  const spanDays = earliest ? diffDays(earliest, asOf) + 1 : 0
  const windowDays = Math.max(14, Math.min(requested, Math.max(spanDays, 14)))

  const dates = trailingDates(asOf, windowDays)
  const dateSet = new Set(dates)
  const totals = dailyTotals(entries, dates)
  const daysOfIntake = totals.filter((d) => d.logged).length
  const daysOfWeight = weightDays.filter((w) => dateSet.has(w.date)).length
  const coverage = Math.min(daysOfIntake, daysOfWeight) / windowDays
  const cov: TdeeCoverage = { windowDays, daysOfIntake, daysOfWeight, coverage }
  const daysShort = Math.max(
    MEASURED_TDEE_MIN_DAYS - daysOfIntake,
    MEASURED_TDEE_MIN_DAYS - daysOfWeight,
  )

  const unavailable = (reason: string): TdeeUnavailable => ({
    kind: 'unavailable',
    reason,
    daysNeeded: Math.max(0, daysShort),
    ...cov,
  })

  if (daysOfIntake < MEASURED_TDEE_MIN_DAYS || daysOfWeight < MEASURED_TDEE_MIN_DAYS) {
    const reason =
      `Using the population formula: ${daysOfIntake} days of intake and ` +
      `${daysOfWeight} days of weight in the last ${windowDays}, and measuring ` +
      `needs ${MEASURED_TDEE_MIN_DAYS} of each.`
    return profile ? formulaEstimate(profile, cov, reason, daysShort) : unavailable(reason)
  }

  const series = weightTrend(weights)
  // Normally the window's first day; if every reading falls later in the
  // window, measure from the earliest reading inside it rather than refusing.
  let fromDate = dates[0]
  if (!trendOn(series, fromDate)) {
    const firstInWindow = series.find((p) => dateSet.has(p.date))
    if (firstInWindow) fromDate = firstInWindow.date
  }
  const change = trendChange(series, fromDate, asOf)
  if (!change) {
    const reason = 'Weight readings do not span enough days to measure a trend change.'
    return profile ? formulaEstimate(profile, cov, reason, 0) : unavailable(reason)
  }

  const meanIntakeKcal = totals.reduce((s, d) => s + (d.logged ? d.kcal : 0), 0) / daysOfIntake
  const kcal = meanIntakeKcal - (change.deltaKg * KCAL_PER_KG) / change.days

  if (!Number.isFinite(kcal) || kcal < 800 || kcal > 8000) {
    const reason =
      `A measured expenditure of ${Math.round(kcal)} kcal/day is not plausible — ` +
      'check for a mistyped weight or a duplicated entry. Showing the formula instead.'
    return profile ? formulaEstimate(profile, cov, reason, 0) : unavailable(reason)
  }

  const halfWidth = kcal * tdeeRelativeHalfWidth(coverage)
  const common: MeasuredCommon = {
    basis: 'measured',
    lowKcal: kcal - halfWidth,
    highKcal: kcal + halfWidth,
    meanIntakeKcal,
    trendDeltaKg: change.deltaKg,
    elapsedDays: change.days,
    from: change.fromDate,
    to: change.toDate,
    ...cov,
  }

  if (coverage < LOW_CONFIDENCE_COVERAGE) {
    return {
      kind: 'provisional',
      confidence: 'low',
      warning:
        `Only ${Math.round(coverage * 100)}% of the last ${windowDays} days are logged, ` +
        'so this is a range rather than a number. Log more days to narrow it.',
      ...common,
    }
  }

  return { kind: 'measured', confidence: 'high', kcal, ...common }
}

/**
 * The band any consumer may show, for every variant including the ones with no
 * point estimate. Returns `null` only when there is genuinely nothing to say.
 */
export function tdeeRange(e: TdeeEstimate): { lowKcal: number; highKcal: number } | null {
  if (e.kind === 'unavailable') return null
  return { lowKcal: e.lowKcal, highKcal: e.highKcal }
}

/**
 * A single number for arithmetic that must produce one, e.g. a forecast.
 *
 * Named for what it is: taking the midpoint of a low-confidence range is a
 * decision, and it should read as one at the call site. Forecasts built from a
 * provisional estimate must themselves be presented as a range.
 */
export function tdeeMidpoint(e: TdeeEstimate): number | null {
  if (e.kind === 'unavailable') return null
  if (e.kind === 'provisional') return (e.lowKcal + e.highKcal) / 2
  return e.kcal
}

/** Whether a consumer is entitled to render one confident number. */
export function isConfidentTdee(e: TdeeEstimate): e is TdeeMeasured {
  return e.kind === 'measured'
}

/** Plain sentence naming which basis is in use, per "say plainly which". */
export function describeTdeeBasis(e: TdeeEstimate): string {
  switch (e.kind) {
    case 'unavailable':
      return e.reason
    case 'formula':
      return e.reason
    case 'provisional':
      return e.warning
    case 'measured':
      return `Measured from your own ${e.windowDays} days of intake and weight.`
  }
}
