/**
 * Diet domain types and their zod schemas.
 *
 * Diet is a bounded context (spec section 4.2): nothing here imports from
 * `lib/train`, `lib/ops` or the learning modules, and nothing here performs
 * I/O. Every function in `lib/diet` takes data in and returns data out, which
 * is what lets the arithmetic be tested against hand-computed values without a
 * database in sight.
 *
 * Two decisions in here are load-bearing and are made once, at the type level,
 * rather than repeated as comments at every call site:
 *
 *  1. **An entry's time is the meal's time, not the row's.** Back-dating an
 *     entry at 23:00 for yesterday's lunch must record 13:00 yesterday (spec
 *     5.1.1). `at` and `date` describe the meal; `loggedAt` exists only for
 *     audit and is never read by analytics.
 *  2. **Local time, not UTC.** An 18:30 meal is outside a 12:00-18:00 window
 *     regardless of where the user was standing, and a UTC day boundary would
 *     split an evening. Dates are `YYYY-MM-DD` strings and times are `HH:MM`
 *     strings, so no `Date` object and therefore no DST shift can reach the
 *     arithmetic.
 */
import { z } from 'zod'

/** Local calendar date, `YYYY-MM-DD`. Never a UTC date. */
export type IsoDate = string
/** Local wall-clock time of day, `HH:MM`, 24-hour. */
export type LocalTime = string
/** Local timestamp, `YYYY-MM-DDTHH:MM`. No zone: it is wall-clock by design. */
export type LocalTimestamp = string

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const LOCAL_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const LOCAL_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/

function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1) return false
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return d <= last
}

export const isoDateSchema = z
  .string()
  .regex(ISO_DATE_RE, 'expected a YYYY-MM-DD local date')
  .refine(isRealDate, 'not a real calendar date')

export const localTimeSchema = z.string().regex(LOCAL_TIME_RE, 'expected a HH:MM local time')

export const localTimestampSchema = z
  .string()
  .regex(LOCAL_TIMESTAMP_RE, 'expected a YYYY-MM-DDTHH:MM local timestamp')
  .refine((s) => isRealDate(s.slice(0, 10)), 'not a real calendar date')

/**
 * **What state the food was weighed in.** This is not a label, it is the
 * difference between a correct entry and one that is out by a factor of three.
 *
 * 100 g of dry brown rice is ~362 kcal. The same rice cooked weighs ~300 g, so
 * 100 g of *cooked* rice is ~120 kcal. A plan that says "brown rice 100 g" and
 * a user who weighs it out of the pot disagree by 240 kcal, and nothing on
 * screen looks wrong — both numbers are plausible, both are in grams, and the
 * error is invisible in every total it feeds. The same trap sits under raw vs
 * cooked chicken (~30% water loss) and dry vs boiled chana (~2.2x).
 *
 * So the basis travels with the food rather than living in its name, and every
 * surface that shows a gram quantity is expected to show the basis beside it.
 *
 *  - `dry`        — weighed uncooked and unsoaked: rice, dal, whole pulses.
 *  - `raw`        — weighed raw but not dehydrated: chicken, fresh vegetables.
 *  - `cooked`     — weighed after cooking: a curry, boiled chana, sprouts.
 *  - `as-served`  — weight or count is the thing you eat: an egg, a slice of
 *                   bread, curd, paneer, oil. No conversion applies.
 */
export const WEIGHT_BASES = ['dry', 'raw', 'cooked', 'as-served'] as const
export type WeightBasis = (typeof WEIGHT_BASES)[number]
export const weightBasisSchema = z.enum(WEIGHT_BASES)

/** How a basis reads next to a quantity. `as-served` adds nothing. */
export const WEIGHT_BASIS_LABEL: Record<WeightBasis, string> = {
  dry: 'dry',
  raw: 'raw',
  cooked: 'cooked',
  'as-served': '',
}

/**
 * A food, as the user's library holds it. Energy and protein are **per
 * serving**, already resolved: the library is the place that knows whether a
 * serving is 100 g or one roti, and no consumer should have to.
 *
 * `carbGPerServing` and `fatGPerServing` are OPTIONAL, and that is deliberate
 * rather than laziness. Every food in the library predating them has none, and
 * an Open Food Facts product routinely has energy and nothing else; defaulting
 * the missing ones to zero would render a day as "0 g fat" instead of "not
 * known", which is the same class of lie as painting an unlogged day as zero.
 * Consumers that need a macro split must handle `undefined` and say so.
 */
export const foodItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** "1 roti", "100 g", "1 bowl" — display only. */
  servingLabel: z.string().min(1),
  servingGrams: z.number().positive().max(5000).optional(),
  kcalPerServing: z.number().min(0).max(10_000),
  proteinGPerServing: z.number().min(0).max(1000),
  /** Carbohydrate per serving. `undefined` means unknown, never zero. */
  carbGPerServing: z.number().min(0).max(1000).optional(),
  /** Fat per serving. `undefined` means unknown, never zero. */
  fatGPerServing: z.number().min(0).max(1000).optional(),
  /** What state the serving was weighed in. See `WEIGHT_BASES`. */
  weightBasis: weightBasisSchema.optional(),
  source: z.enum(['library', 'openfoodfacts', 'custom']).default('custom'),
})
export type FoodItem = z.infer<typeof foodItemSchema>

/**
 * One logged meal or snack.
 *
 * `kcal`/`proteinG` are resolved at log time and stored on the row rather than
 * recomputed from `foodId`. Editing a library item must not silently rewrite
 * three weeks of history that a TDEE was measured from.
 */
export const logEntrySchema = z.object({
  id: z.string().min(1),
  foodId: z.string().min(1).optional(),
  /** Denormalised so a deleted library item does not blank the history. */
  name: z.string().min(1),
  servings: z.number().positive().max(100).default(1),
  kcal: z.number().min(0).max(20_000),
  proteinG: z.number().min(0).max(2000),
  /** The **meal's** local timestamp. This is what every analysis reads. */
  at: localTimestampSchema,
  /** The resolved local date of the meal. Authoritative for grouping. */
  date: isoDateSchema,
  /** When the row was created. Audit only — analytics must never read it. */
  loggedAt: localTimestampSchema.optional(),
})
export type LogEntry = z.infer<typeof logEntrySchema>

/** A reading off the scale. Several on one day are normal and are averaged. */
export const weightReadingSchema = z.object({
  date: isoDateSchema,
  kg: z.number().min(20).max(500),
  at: localTimestampSchema.optional(),
})
export type WeightReading = z.infer<typeof weightReadingSchema>

/**
 * Activity multipliers applied to BMR to reach a formula TDEE. These are the
 * conventional Harris-Benedict/Mifflin multipliers; they are a population
 * estimate and the measured TDEE replaces them the moment it can.
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
} as const
export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS

export const dietTargetsSchema = z.object({
  kcal: z.number().min(500).max(10_000),
  proteinG: z.number().min(0).max(500),
  /**
   * Half-width of the "inside target" band, in kcal. Both a large overshoot
   * and a severe undershoot are misses, so the band is two-sided.
   */
  kcalBand: z.number().min(0).max(2000).default(150),
})
export type DietTargets = z.infer<typeof dietTargetsSchema>

export const userProfileSchema = z.object({
  /**
   * Mifflin-St Jeor is defined with a sex term and has no validated form
   * without one; `sex` here is the input that equation takes, nothing more.
   */
  sex: z.enum(['male', 'female']),
  ageYears: z.number().int().min(13).max(120),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(20).max(500),
  activity: z.enum(['sedentary', 'light', 'moderate', 'active', 'very-active']),
  goal: z.enum(['lose', 'maintain', 'gain']),
  targets: dietTargetsSchema.optional(),
})
export type UserProfile = z.infer<typeof userProfileSchema>

/**
 * The eating window (spec 5.1.1). `start` may be later than `end`: a 20:00 to
 * 04:00 window is legal and crosses midnight, so no consumer may assume
 * `start < end`.
 */
export const eatingWindowSchema = z.object({
  start: localTimeSchema,
  end: localTimeSchema,
  /** A disabled window marks nothing. It is not a window of zero length. */
  enabled: z.boolean().default(true),
})
export type EatingWindow = z.infer<typeof eatingWindowSchema>

/** The owner's default, per spec 5.1.1. */
export const DEFAULT_EATING_WINDOW: EatingWindow = { start: '12:00', end: '18:00', enabled: true }

/**
 * Totals for one day.
 *
 * A day with no entries is **invisible, not zero** — the single easiest thing
 * to get wrong in this domain, and it corrupts every mean downstream. The
 * union enforces it: on an unlogged day there is no `kcal` field to read, so
 * `total += day.kcal` does not compile.
 */
export type DayTotals =
  | {
      date: IsoDate
      logged: true
      kcal: number
      proteinG: number
      entryCount: number
    }
  | {
      date: IsoDate
      logged: false
      kcal?: never
      proteinG?: never
      entryCount: 0
    }
