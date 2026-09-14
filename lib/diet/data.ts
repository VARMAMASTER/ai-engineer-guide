/**
 * The shape Diet is stored in, and the codecs between that and the domain.
 *
 * This file is the whole persistence contract and it does NO I/O. That is not
 * an accident of layering: `lib/diet` is pure by rule (spec 4.2, and
 * `tests/unit/diet/boundaries.test.ts` enforces it), so the row shapes and the
 * translation live here where they can be asserted against hand-written rows,
 * and the queries live in `app/diet/_data/` where the database clients are.
 *
 * Three decisions are made here once, rather than at every call site.
 *
 *  1. **`entry_date` is derived, never accepted.** `entryToRow` computes the
 *     day from the meal's own timestamp. The database cannot check the two
 *     agree — every expression comparing a `date` to text is STABLE rather than
 *     IMMUTABLE, which Postgres refuses in a check constraint — so the only way
 *     they can disagree is if something other than this function writes a row.
 *  2. **Numbers are coerced on the way in.** PostgREST renders `numeric` as a
 *     JSON number, but a driver or a future view that hands back `"1850.00"`
 *     would otherwise produce `"1850.00" + 320` = a string, and the first place
 *     it would surface is a day total that reads `1850.00320`.
 *  3. **A half-filled profile is `undefined`, not a default.** Mifflin-St Jeor
 *     with a guessed height is a confident wrong number, which is the one thing
 *     `lib/diet/energy.ts` exists to avoid. Absent inputs yield no profile, and
 *     the TDEE reports `unavailable` with a reason instead.
 */
import { z } from 'zod'
import {
  ACTIVITY_MULTIPLIERS,
  DEFAULT_EATING_WINDOW,
  foodItemSchema,
  logEntrySchema,
  weightReadingSchema,
  type DietTargets,
  type EatingWindow,
  type FoodItem,
  type LogEntry,
  type UserProfile,
  type WeightReading,
} from './types'
import { storedForecastSchema, type StoredForecast } from './forecast'
import { dateOf } from './time'

/* ------------------------------------------------------------------ rows -- */

/** `public.diet_profile`, as selected. Every analysis input is nullable. */
export interface DietProfileRow {
  sex: string | null
  age_years: number | null
  height_cm: number | string | null
  activity: string | null
  goal: string | null
  target_kcal: number | string | null
  target_protein_g: number | string | null
  kcal_band: number | string | null
  window_start: string | null
  window_end: string | null
  window_enabled: boolean | null
}

/** `public.diet_food`, as selected. */
export interface DietFoodRow {
  id: string
  name: string
  serving_label: string
  serving_grams: number | string | null
  kcal_per_serving: number | string
  protein_g_per_serving: number | string
  source: string
  use_count?: number | null
  last_used_at?: string | null
}

/** `public.diet_entry`, as selected. */
export interface DietEntryRow {
  id: string
  food_id: string | null
  name: string
  servings: number | string
  kcal: number | string
  protein_g: number | string
  at_local: string
  entry_date: string
}

/** `public.diet_weight`, as selected. */
export interface DietWeightRow {
  id: string
  reading_date: string
  kg: number | string
  at_local: string | null
}

/** `public.diet_forecast`, as selected. */
export interface DietForecastRow {
  id: string
  made_on: string
  for_date: string
  horizon_days: number
  kg: number | string | null
  low_kg: number | string
  high_kg: number | string
  basis: string
  confidence: string
}

/**
 * Everything one user's Diet holds, loaded once per page.
 *
 * Loaded as a whole rather than per-widget because every analytic in
 * `lib/diet` is a fold over the same two arrays — a measured TDEE reads 28 days
 * of intake AND 28 days of weight — and five narrow queries would be five round
 * trips to compute one card.
 */
export interface DietSnapshot {
  /** `undefined` until the Mifflin inputs and a weight are all present. */
  profile: UserProfile | undefined
  targets: DietTargets | undefined
  window: EatingWindow
  foods: FoodItem[]
  entries: LogEntry[]
  weights: WeightReading[]
  forecasts: StoredForecast[]
}

/* --------------------------------------------------------------- codecs -- */

const num = z.coerce.number()

function n(value: number | string | null | undefined): number {
  return num.parse(value)
}

function optionalNum(value: number | string | null | undefined): number | undefined {
  return value === null || value === undefined ? undefined : num.parse(value)
}

export function rowToFood(row: DietFoodRow): FoodItem {
  return foodItemSchema.parse({
    id: row.id,
    name: row.name,
    servingLabel: row.serving_label,
    servingGrams: optionalNum(row.serving_grams),
    kcalPerServing: n(row.kcal_per_serving),
    proteinGPerServing: n(row.protein_g_per_serving),
    source: row.source,
  })
}

/** The insertable half of a food row. `user_id` is added by the caller. */
export function foodToRow(food: FoodItem): Omit<DietFoodRow, 'use_count' | 'last_used_at'> {
  const f = foodItemSchema.parse(food)
  return {
    id: f.id,
    name: f.name,
    serving_label: f.servingLabel,
    serving_grams: f.servingGrams ?? null,
    kcal_per_serving: f.kcalPerServing,
    protein_g_per_serving: f.proteinGPerServing,
    source: f.source,
  }
}

export function rowToEntry(row: DietEntryRow): LogEntry {
  return logEntrySchema.parse({
    id: row.id,
    foodId: row.food_id ?? undefined,
    name: row.name,
    servings: n(row.servings),
    kcal: n(row.kcal),
    proteinG: n(row.protein_g),
    at: row.at_local,
    // Deliberately NOT `row.entry_date`. The timestamp is the fact; the date
    // column is an index on it. If a hand-written row ever disagreed, the
    // timestamp is the one the eating window is judged from, so it wins here
    // too rather than the two halves of a row being read from two places.
    date: dateOf(row.at_local),
  })
}

/**
 * The insertable half of an entry row.
 *
 * `entry_date` is derived from `at` rather than taken from `entry.date`, which
 * is what keeps the grouping column and the timestamp from drifting apart. A
 * meal logged at 23:00 for yesterday's lunch carries yesterday's date here
 * because its `at` says 13:00 yesterday, not because the caller remembered to
 * pass the right day.
 */
export function entryToRow(entry: LogEntry): Omit<DietEntryRow, 'entry_date'> & {
  entry_date: string
  logged_at?: string
} {
  const e = logEntrySchema.parse(entry)
  return {
    id: e.id,
    food_id: e.foodId ?? null,
    name: e.name,
    servings: e.servings,
    kcal: e.kcal,
    protein_g: e.proteinG,
    at_local: e.at,
    entry_date: dateOf(e.at),
  }
}

export function rowToWeight(row: DietWeightRow): WeightReading {
  return weightReadingSchema.parse({
    date: row.reading_date,
    kg: n(row.kg),
    at: row.at_local ?? undefined,
  })
}

export function weightToRow(id: string, reading: WeightReading): DietWeightRow {
  const w = weightReadingSchema.parse(reading)
  return { id, reading_date: w.date, kg: w.kg, at_local: w.at ?? null }
}

export function rowToStoredForecast(row: DietForecastRow): StoredForecast {
  return storedForecastSchema.parse({
    id: row.id,
    madeOn: row.made_on,
    forDate: row.for_date,
    horizonDays: row.horizon_days,
    kg: row.kg === null ? null : n(row.kg),
    lowKg: n(row.low_kg),
    highKg: n(row.high_kg),
    basis: row.basis,
    confidence: row.confidence,
  })
}

export function storedForecastToRow(f: StoredForecast): DietForecastRow {
  const parsed = storedForecastSchema.parse(f)
  return {
    id: parsed.id,
    made_on: parsed.madeOn,
    for_date: parsed.forDate,
    horizon_days: parsed.horizonDays,
    kg: parsed.kg,
    low_kg: parsed.lowKg,
    high_kg: parsed.highKg,
    basis: parsed.basis,
    confidence: parsed.confidence,
  }
}

/* -------------------------------------------------------------- profile -- */

/** The window, with the owner's 12:00-18:00 default when there is no row. */
export function rowToWindow(row: DietProfileRow | null | undefined): EatingWindow {
  if (!row || !row.window_start || !row.window_end) return DEFAULT_EATING_WINDOW
  return {
    start: row.window_start,
    end: row.window_end,
    enabled: row.window_enabled ?? true,
  }
}

/**
 * Targets, or `undefined` when they are not both set.
 *
 * All-or-nothing because `dietTargetsSchema` takes them as one object: a row
 * with a calorie target and no protein target would otherwise become a protein
 * target of zero, which every logged day then "meets".
 */
export function rowToTargets(row: DietProfileRow | null | undefined): DietTargets | undefined {
  if (!row) return undefined
  const kcal = optionalNum(row.target_kcal)
  const proteinG = optionalNum(row.target_protein_g)
  if (kcal === undefined || proteinG === undefined) return undefined
  return { kcal, proteinG, kcalBand: optionalNum(row.kcal_band) ?? 150 }
}

const activityKeys = Object.keys(ACTIVITY_MULTIPLIERS)

/**
 * The Mifflin-St Jeor inputs, or `undefined`.
 *
 * `weightKg` is NOT a profile column. Weight is already recorded, repeatedly
 * and with a trend over it, in `diet_weight`; a second copy on the profile
 * would go stale the first time someone weighed themselves without editing
 * their settings, and the formula would then be run on last month's body.
 * Callers pass the current TREND weight (or the latest reading), and with no
 * reading at all there is no profile and the TDEE says so.
 */
export function buildProfile(
  row: DietProfileRow | null | undefined,
  weightKg: number | null | undefined,
): UserProfile | undefined {
  if (!row || weightKg === null || weightKg === undefined) return undefined
  const { sex, age_years: age, activity, goal } = row
  const heightCm = optionalNum(row.height_cm)
  if (sex !== 'male' && sex !== 'female') return undefined
  if (age === null || heightCm === undefined) return undefined
  if (!activity || !activityKeys.includes(activity)) return undefined
  if (goal !== 'lose' && goal !== 'maintain' && goal !== 'gain') return undefined

  return {
    sex,
    ageYears: age,
    heightCm,
    weightKg,
    activity: activity as UserProfile['activity'],
    goal,
    targets: rowToTargets(row),
  }
}

/* ------------------------------------------------------- open food facts -- */

/**
 * One product as Open Food Facts returns it, narrowed to the fields used.
 *
 * Keyless by constraint: the product API takes no key and none is ever sent.
 * Everything is optional because the database is crowd-sourced — a product with
 * a name and no energy is common, and `offProductToFood` drops it rather than
 * inventing a zero.
 */
export interface OffProduct {
  code?: string
  product_name?: string
  product_name_en?: string
  /**
   * A comma-joined string on the legacy CGI endpoint and an array on the
   * search-a-licious one. Both spellings are accepted rather than the caller
   * being trusted to normalise, because getting it wrong renders the brand as
   * "[object Object]" next to a calorie figure and nothing else looks amiss.
   */
  brands?: string | string[]
  serving_size?: string
  nutriments?: Record<string, unknown>
}

function firstBrand(brands: string | string[] | undefined): string {
  if (Array.isArray(brands)) return (brands[0] ?? '').trim()
  return (brands ?? '').split(',')[0]?.trim() ?? ''
}

function offNumber(nutriments: Record<string, unknown> | undefined, key: string): number | null {
  const raw = nutriments?.[key]
  const value = typeof raw === 'string' ? Number(raw) : raw
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/**
 * An Open Food Facts product as a library item, or `null` if it cannot be one.
 *
 * Per-serving figures are preferred and per-100g is the fallback, with the
 * serving label saying WHICH — "100 g" against a packet of biscuits is a real
 * answer, and silently labelling a 100 g figure as "1 serving" would log three
 * times the calories the user meant. A product with no energy at all is
 * dropped: an entry of 0 kcal is worse than no entry, because it is invisible
 * in every total while still counting the day as logged.
 */
export function offProductToFood(product: OffProduct): FoodItem | null {
  const name = (product.product_name_en || product.product_name || '').trim()
  if (!name) return null

  const nutriments = product.nutriments
  const perServingKcal = offNumber(nutriments, 'energy-kcal_serving')
  const per100Kcal = offNumber(nutriments, 'energy-kcal_100g')

  const useServing = perServingKcal !== null && Boolean(product.serving_size)
  const kcal = useServing ? perServingKcal : per100Kcal
  if (kcal === null || kcal > 10_000) return null

  const protein = useServing
    ? (offNumber(nutriments, 'proteins_serving') ?? 0)
    : (offNumber(nutriments, 'proteins_100g') ?? 0)

  const brand = firstBrand(product.brands)
  return foodItemSchema.parse({
    id: `off-${product.code ?? name.toLowerCase().replace(/\W+/g, '-')}`,
    name: brand ? `${name} (${brand})` : name,
    servingLabel: useServing ? (product.serving_size as string).trim().slice(0, 60) : '100 g',
    servingGrams: useServing ? undefined : 100,
    kcalPerServing: kcal,
    proteinGPerServing: Math.min(protein, 1000),
    source: 'openfoodfacts',
  })
}
