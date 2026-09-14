/**
 * Weight forecast, forecast scoring, and the muscle-gain ceiling (spec 5.1.2).
 *
 * Two rules from the spec shape this module.
 *
 * **"A forecast that is never checked is decoration."** So a forecast is a
 * record, not a render: `toStoredForecast` turns one into something a caller
 * can keep, and `scoreForecasts` grades the kept ones against the trend that
 * actually happened. The scoring is deliberately unflattering — it reports mean
 * absolute error in kilograms, and a forecast whose target date has no trend
 * point near it is counted as unscored rather than quietly dropped.
 *
 * **Confidence propagates.** A forecast built on a provisional TDEE is itself
 * provisional and has no `kg` field, exactly as `TdeeProvisional` has no
 * `kcal`. The uncertainty compounds with the horizon: at a 30-day horizon a
 * +/-300 kcal band on expenditure is +/-1.2 kg of predicted weight, which is
 * the whole result. Hiding that behind a single number is how a tracker ends up
 * lying to someone about their own body.
 */
import { z } from 'zod'
import { isoDateSchema, type IsoDate } from './types'
import { KCAL_PER_KG, type TdeeEstimate } from './energy'
import { addDays, diffDays } from './time'
import { trendOn, type TrendPoint } from './trend'

export interface ForecastInput {
  /** The date the forecast is made on. */
  asOf: IsoDate
  /** Days ahead to project. */
  horizonDays: number
  /** Current **trend** weight. A raw reading here would forecast water. */
  currentTrendKg: number
  /** Expenditure, with its confidence attached. */
  tdee: TdeeEstimate
  /** The intake the forecast assumes — planned target or recent mean. */
  meanIntakeKcal: number
}

interface ForecastCommon {
  madeOn: IsoDate
  forDate: IsoDate
  horizonDays: number
  startKg: number
  lowKg: number
  highKg: number
  /** Intake minus expenditure, kcal/day. Negative is a deficit. */
  dailyBalanceKcal: number
  basis: 'measured' | 'mifflin-st-jeor'
}

export interface ForecastUnavailable {
  kind: 'unavailable'
  reason: string
  kg?: never
  lowKg?: never
  highKg?: never
}

export interface ForecastPoint extends ForecastCommon {
  kind: 'point'
  confidence: 'high' | 'population-estimate'
  kg: number
}

/** A forecast from a low-confidence TDEE. Carries a band and no point. */
export interface ForecastRange extends ForecastCommon {
  kind: 'range'
  confidence: 'low'
  kg?: never
  warning: string
}

export type WeightForecast = ForecastUnavailable | ForecastPoint | ForecastRange

const forecastInputSchema = z.object({
  asOf: isoDateSchema,
  horizonDays: z.number().int().min(1).max(365),
  currentTrendKg: z.number().min(20).max(500),
  meanIntakeKcal: z.number().min(0).max(20_000),
})

/**
 * Project trend weight forward at 7,700 kcal per kilogram.
 *
 * Linear on purpose. Expenditure does fall as weight falls, but modelling that
 * over a horizon of weeks adds less than the +/-15% already acknowledged in the
 * expenditure estimate, and a curve implies a precision that is not there.
 */
export function forecastWeight(input: ForecastInput): WeightForecast {
  const { asOf, horizonDays, currentTrendKg, meanIntakeKcal } = forecastInputSchema.parse(input)
  const { tdee } = input

  // Narrowed here rather than via `tdeeRange` alone, so that the compiler
  // keeps enforcing the "no point estimate without confidence" rule below.
  if (tdee.kind === 'unavailable') {
    return {
      kind: 'unavailable',
      reason: 'No expenditure estimate yet, so there is nothing honest to project from.',
    }
  }
  const range = { lowKcal: tdee.lowKcal, highKcal: tdee.highKcal }

  const at = (expenditure: number) =>
    currentTrendKg + ((meanIntakeKcal - expenditure) / KCAL_PER_KG) * horizonDays

  // A lower expenditure means a larger surplus, hence the higher weight.
  const highKg = at(range.lowKcal)
  const lowKg = at(range.highKcal)
  const common = {
    madeOn: asOf,
    forDate: addDays(asOf, horizonDays),
    horizonDays,
    startKg: currentTrendKg,
    lowKg,
    highKg,
    basis: tdee.basis,
  }

  if (tdee.kind === 'provisional') {
    return {
      kind: 'range',
      confidence: 'low',
      dailyBalanceKcal: meanIntakeKcal - (range.lowKcal + range.highKcal) / 2,
      warning: tdee.warning,
      ...common,
    }
  }

  return {
    kind: 'point',
    confidence: tdee.kind === 'measured' ? 'high' : 'population-estimate',
    kg: at(tdee.kcal),
    dailyBalanceKcal: meanIntakeKcal - tdee.kcal,
    ...common,
  }
}

/**
 * A forecast in the shape worth keeping, so it can be scored later.
 *
 * `kg` is `null` for a range forecast — the same "no point estimate" rule, kept
 * intact through storage rather than resolved to a midpoint on the way in.
 */
export interface StoredForecast {
  id: string
  madeOn: IsoDate
  forDate: IsoDate
  horizonDays: number
  kg: number | null
  lowKg: number
  highKg: number
  basis: 'measured' | 'mifflin-st-jeor'
  confidence: 'high' | 'low' | 'population-estimate'
}

export const storedForecastSchema = z.object({
  id: z.string().min(1),
  madeOn: isoDateSchema,
  forDate: isoDateSchema,
  horizonDays: z.number().int().min(1).max(365),
  kg: z.number().min(20).max(500).nullable(),
  lowKg: z.number().min(20).max(500),
  highKg: z.number().min(20).max(500),
  basis: z.enum(['measured', 'mifflin-st-jeor']),
  confidence: z.enum(['high', 'low', 'population-estimate']),
})

/** `null` for an unavailable forecast — there is nothing to score later. */
export function toStoredForecast(id: string, f: WeightForecast): StoredForecast | null {
  if (f.kind === 'unavailable') return null
  return storedForecastSchema.parse({
    id,
    madeOn: f.madeOn,
    forDate: f.forDate,
    horizonDays: f.horizonDays,
    kg: f.kind === 'point' ? f.kg : null,
    lowKg: f.lowKg,
    highKg: f.highKg,
    basis: f.basis,
    confidence: f.confidence,
  })
}

export interface ForecastScore {
  id: string
  madeOn: IsoDate
  forDate: IsoDate
  horizonDays: number
  predictedKg: number | null
  lowKg: number
  highKg: number
  /** The trend weight that actually arrived. */
  actualKg: number
  actualFromDate: IsoDate
  /** How stale the trend point is relative to `forDate`. */
  staleDays: number
  /** `null` when the forecast was a range, which has no point to err from. */
  errorKg: number | null
  absErrorKg: number | null
  withinRange: boolean
  /** Where reality fell relative to the predicted band. */
  verdict: 'within' | 'heavier' | 'lighter'
}

export interface ScoreOptions {
  /**
   * How stale a trend point may be and still count as "what happened".
   * Default 3 days: beyond that the comparison is against a different week.
   */
  maxStaleDays?: number
}

/**
 * Score one kept forecast against the trend series.
 *
 * `null` means unscoreable — either no trend point exists on or before the
 * target date, or the nearest one is too old to be called the outcome. That is
 * reported as an unscored count rather than folded into the error, because
 * silently scoring only the days the user happened to weigh in would flatter
 * the forecast exactly when logging was worst.
 */
export function scoreForecast(
  stored: StoredForecast,
  series: TrendPoint[],
  options: ScoreOptions = {},
): ForecastScore | null {
  const f = storedForecastSchema.parse(stored)
  const maxStale = options.maxStaleDays ?? 3
  const actual = trendOn(series, f.forDate)
  if (!actual || actual.staleDays > maxStale) return null
  if (diffDays(f.madeOn, actual.fromDate) <= 0) return null

  const withinRange = actual.trendKg >= f.lowKg && actual.trendKg <= f.highKg
  const verdict: ForecastScore['verdict'] = withinRange
    ? 'within'
    : actual.trendKg > f.highKg
      ? 'heavier'
      : 'lighter'
  const errorKg = f.kg === null ? null : actual.trendKg - f.kg

  return {
    id: f.id,
    madeOn: f.madeOn,
    forDate: f.forDate,
    horizonDays: f.horizonDays,
    predictedKg: f.kg,
    lowKg: f.lowKg,
    highKg: f.highKg,
    actualKg: actual.trendKg,
    actualFromDate: actual.fromDate,
    staleDays: actual.staleDays,
    errorKg,
    absErrorKg: errorKg === null ? null : Math.abs(errorKg),
    withinRange,
    verdict,
  }
}

export interface ForecastScorecard {
  scored: ForecastScore[]
  /** Forecasts whose outcome could not be established. Not a pass. */
  unscored: number
  /** Over point forecasts only. `null` when none could be scored. */
  meanAbsErrorKg: number | null
  /** Share of scored forecasts whose band contained reality, 0-1 or `null`. */
  withinRangeShare: number | null
}

/** Grade every kept forecast whose target date has passed. */
export function scoreForecasts(
  stored: StoredForecast[],
  series: TrendPoint[],
  options: ScoreOptions = {},
): ForecastScorecard {
  const scored: ForecastScore[] = []
  let unscored = 0
  for (const f of stored) {
    const s = scoreForecast(f, series, options)
    if (s) scored.push(s)
    else unscored += 1
  }
  const withPoint = scored.filter((s) => s.absErrorKg !== null)
  return {
    scored,
    unscored,
    meanAbsErrorKg:
      withPoint.length > 0
        ? withPoint.reduce((sum, s) => sum + (s.absErrorKg ?? 0), 0) / withPoint.length
        : null,
    withinRangeShare:
      scored.length > 0 ? scored.filter((s) => s.withinRange).length / scored.length : null,
  }
}

export type TrainingLevel = 'novice' | 'intermediate' | 'trained'

/**
 * Honest monthly muscle-gain rates, kg/month, as [low, high].
 *
 * The `trained` row is the spec's 0.25-0.5. The other two are the conventional
 * training-age table they come from; they are a ceiling at every level, and a
 * flattering curve is worse than no curve.
 */
export const MONTHLY_MUSCLE_KG: Record<TrainingLevel, readonly [number, number]> = {
  novice: [0.75, 1.0],
  intermediate: [0.5, 0.75],
  trained: [0.25, 0.5],
}

/** Female rates are conventionally taken at about half. Applied, not hidden. */
export const FEMALE_MUSCLE_FACTOR = 0.5

export interface MuscleCeiling {
  /** Not `projection`. This is the most that is available, not the expectation. */
  kind: 'ceiling'
  level: TrainingLevel
  months: number
  perMonthLowKg: number
  perMonthHighKg: number
  lowKg: number
  highKg: number
  note: string
}

/**
 * The muscle a person could add in `months`, at best.
 *
 * Returned as a labelled ceiling rather than an expectation, and the note is
 * meant to be rendered: the number assumes a calorie surplus, consistent
 * progressive overload and enough protein, and most people meeting none of
 * those will see less. Gains also decelerate within a year rather than
 * continuing linearly, so horizons beyond 12 months are refused.
 */
export function projectMuscleCeiling(params: {
  months: number
  level: TrainingLevel
  sex: 'male' | 'female'
}): MuscleCeiling {
  const months = z.number().min(0.5).max(12).parse(params.months)
  const level = z.enum(['novice', 'intermediate', 'trained']).parse(params.level)
  const sex = z.enum(['male', 'female']).parse(params.sex)

  const [low, high] = MONTHLY_MUSCLE_KG[level]
  const factor = sex === 'female' ? FEMALE_MUSCLE_FACTOR : 1
  const perMonthLowKg = low * factor
  const perMonthHighKg = high * factor

  return {
    kind: 'ceiling',
    level,
    months,
    perMonthLowKg,
    perMonthHighKg,
    lowKg: perMonthLowKg * months,
    highKg: perMonthHighKg * months,
    note:
      'A ceiling, not an expectation: it assumes a calorie surplus, consistent ' +
      'progressive overload and enough protein, and it slows as training age rises.',
  }
}
