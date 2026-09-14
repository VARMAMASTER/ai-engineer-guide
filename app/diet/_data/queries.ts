import { createClient } from '@/lib/db/server'
import { requireUser, type CurrentUser } from '@/lib/auth/user'
import {
  buildProfile,
  rowToEntry,
  rowToFood,
  rowToStoredForecast,
  rowToTargets,
  rowToWeight,
  rowToWindow,
  type DietEntryRow,
  type DietFoodRow,
  type DietForecastRow,
  type DietProfileRow,
  type DietSnapshot,
  type DietWeightRow,
} from '@/lib/diet/data'
import { weightTrend } from '@/lib/diet/trend'

/**
 * Reading one user's Diet, on the server.
 *
 * Everything the app needs is fetched ONCE, as a whole, rather than per widget.
 * The reason is in `lib/diet` rather than here: a measured TDEE is a fold over
 * 28 days of intake AND 28 days of weight, the eating-window report needs the
 * day before the first day it reports on, and the trend is an EWMA over the
 * entire weight history. Five narrow queries would be five round trips to
 * compute one card, and three of them would be the same rows.
 *
 * These read through the REQUEST-SCOPED client, so RLS does the scoping. The
 * `.eq('user_id', ...)` filters below are therefore belt-and-braces, not the
 * mechanism — a bug in one of them cannot return another user's rows.
 */

/** Days of intake history loaded. 28 is the longest analytic window; this is ~4x. */
const ENTRY_HISTORY_DAYS = 120

const FOOD_COLUMNS =
  'id, name, serving_label, serving_grams, kcal_per_serving, protein_g_per_serving, source, use_count, last_used_at'
const ENTRY_COLUMNS = 'id, food_id, name, servings, kcal, protein_g, at_local, entry_date'
const WEIGHT_COLUMNS = 'id, reading_date, kg, at_local'
const FORECAST_COLUMNS =
  'id, made_on, for_date, horizon_days, kg, low_kg, high_kg, basis, confidence'
const PROFILE_COLUMNS =
  'sex, age_years, height_cm, activity, goal, target_kcal, target_protein_g, kcal_band, window_start, window_end, window_enabled'

function isoDaysAgo(days: number): string {
  const ms = Date.now() - days * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * The whole Diet snapshot for the signed-in user.
 *
 * `requireUser` here as well as in the proxy, for the reason the account page
 * gives: the proxy's matcher is a regular expression, and a regular expression
 * is exactly the kind of thing that stops matching one day without telling
 * anyone.
 *
 * A query error is not swallowed into an empty array. An empty Diet and a
 * broken Diet look identical on screen, and one of them must not be logged
 * over — so the error is returned and the page says so.
 */
export async function loadDietSnapshot(
  next: string,
): Promise<{ user: CurrentUser; snapshot: DietSnapshot; error: string | null }> {
  const user = await requireUser(next)
  const supabase = await createClient()

  // The lower bound is generous rather than exact. It is computed from the
  // server's clock, which is not the user's, so a day either side is expected —
  // which is fine for a history bound and would not be fine for "today".
  const since = isoDaysAgo(ENTRY_HISTORY_DAYS + 1)

  const [profileResult, foodResult, entryResult, weightResult, forecastResult] = await Promise.all([
    supabase.from('diet_profile').select(PROFILE_COLUMNS).eq('user_id', user.id).maybeSingle(),
    supabase
      .from('diet_food')
      .select(FOOD_COLUMNS)
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('name')
      .limit(500),
    supabase
      .from('diet_entry')
      .select(ENTRY_COLUMNS)
      .eq('user_id', user.id)
      .gte('entry_date', since)
      .order('at_local', { ascending: true })
      .limit(5000),
    supabase
      .from('diet_weight')
      .select(WEIGHT_COLUMNS)
      .eq('user_id', user.id)
      .order('reading_date', { ascending: true })
      .limit(2000),
    supabase
      .from('diet_forecast')
      .select(FORECAST_COLUMNS)
      .eq('user_id', user.id)
      .order('for_date', { ascending: true })
      .limit(200),
  ])

  const error =
    profileResult.error?.message ??
    foodResult.error?.message ??
    entryResult.error?.message ??
    weightResult.error?.message ??
    forecastResult.error?.message ??
    null

  const profileRow = (profileResult.data ?? null) as DietProfileRow | null
  const foods = ((foodResult.data ?? []) as DietFoodRow[]).map(rowToFood)
  const entries = ((entryResult.data ?? []) as DietEntryRow[]).map(rowToEntry)
  const weights = ((weightResult.data ?? []) as DietWeightRow[]).map(rowToWeight)
  const forecasts = ((forecastResult.data ?? []) as DietForecastRow[]).map(rowToStoredForecast)

  // The formula's weight input is the TREND, not the last thing the scale said.
  // A 1.5 kg water swing through Mifflin-St Jeor is ~20 kcal/day of pure noise
  // on the BMR, and the trend is what every other number in Diet is built from.
  const series = weightTrend(weights)
  const trendKg = series.length > 0 ? series[series.length - 1].trendKg : null

  return {
    user,
    error,
    snapshot: {
      profile: buildProfile(profileRow, trendKg),
      targets: rowToTargets(profileRow),
      window: rowToWindow(profileRow),
      foods,
      entries,
      weights,
      forecasts,
    },
  }
}

/** A weight reading with the row id it can be deleted by. */
export interface IdentifiedWeight {
  id: string
  reading: ReturnType<typeof rowToWeight>
}

/**
 * The Weight page's own, narrower read.
 *
 * `WeightReading` deliberately has no `id` — it is a measurement, and the
 * analytics fold over it never needs to address one. The screen that lets you
 * DELETE a reading does, so it fetches the ids alongside rather than the whole
 * snapshot growing a field only one page uses.
 */
export async function loadWeightPage(next: string): Promise<{
  user: CurrentUser
  rows: IdentifiedWeight[]
  heightCm: number | null
  error: string | null
}> {
  const user = await requireUser(next)
  const supabase = await createClient()

  const [weightResult, profileResult] = await Promise.all([
    supabase
      .from('diet_weight')
      .select(WEIGHT_COLUMNS)
      .eq('user_id', user.id)
      .order('reading_date', { ascending: true })
      .limit(2000),
    supabase.from('diet_profile').select('height_cm').eq('user_id', user.id).maybeSingle(),
  ])

  const rows = ((weightResult.data ?? []) as DietWeightRow[]).map((row) => ({
    id: row.id,
    reading: rowToWeight(row),
  }))
  const rawHeight = (profileResult.data as { height_cm: number | string | null } | null)?.height_cm
  const heightCm =
    rawHeight === null || rawHeight === undefined ? null : Number(rawHeight)

  return {
    user,
    rows,
    heightCm: heightCm !== null && Number.isFinite(heightCm) ? heightCm : null,
    error: weightResult.error?.message ?? profileResult.error?.message ?? null,
  }
}

/**
 * The Setup page's read: the raw profile ROW plus the library.
 *
 * The row rather than a `UserProfile`, because this screen edits columns — a
 * half-filled profile is a legitimate state here and `buildProfile` would
 * collapse it to `undefined`, which is the right answer for an analytic and the
 * wrong one for a form.
 */
export async function loadDietSetupPage(next: string): Promise<{
  user: CurrentUser
  profile: DietProfileRow | null
  foods: ReturnType<typeof rowToFood>[]
}> {
  const user = await requireUser(next)
  const supabase = await createClient()

  const [profileResult, foodResult] = await Promise.all([
    supabase.from('diet_profile').select(PROFILE_COLUMNS).eq('user_id', user.id).maybeSingle(),
    supabase
      .from('diet_food')
      .select(FOOD_COLUMNS)
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('name')
      .limit(500),
  ])

  return {
    user,
    profile: (profileResult.data ?? null) as DietProfileRow | null,
    foods: ((foodResult.data ?? []) as DietFoodRow[]).map(rowToFood),
  }
}
