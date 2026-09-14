'use client'

import { createClient } from '@/lib/db/client'
import {
  entryToRow,
  foodToRow,
  planDayToRow,
  storedForecastToRow,
  weightToRow,
  type DietProfileRow,
} from '@/lib/diet/data'
import type { StoredForecast } from '@/lib/diet/forecast'
import type { PlanDay } from '@/lib/diet/plan'
import type { FoodItem, LogEntry, WeightReading } from '@/lib/diet/types'

/**
 * Writing Diet, from the browser.
 *
 * Writes are client-side rather than Server Actions on purpose: logging a meal
 * has to feel like a tap, and a Server Action costs a round trip plus a router
 * refresh before the row appears. The page keeps the list in state, writes
 * optimistically, and shows a toast if the write comes back with an error — so
 * the screen and the database disagree only for as long as the request is in
 * flight, and never silently.
 *
 * Every function returns an error STRING rather than throwing. A failed insert
 * is a thing to tell the user about in a toast, not an unhandled rejection that
 * blanks the page they were logging into.
 *
 * `user_id` is passed explicitly on every insert because RLS's `with check`
 * predicate compares it to `auth.uid()` — the policy rejects a row without it
 * rather than filling it in, which is the correct way round: a default would
 * mean an insert that forgot the column succeeded as somebody.
 */

/** A collision-free id for a client-generated row. */
export function newId(): string {
  return crypto.randomUUID()
}

type Result = { error: string | null }

export async function addEntry(userId: string, entry: LogEntry): Promise<Result> {
  const supabase = createClient()
  const { error } = await supabase
    .from('diet_entry')
    .insert({ user_id: userId, ...entryToRow(entry) })
  return { error: error?.message ?? null }
}

/**
 * Insert several entries at once — what "log yesterday again" is.
 *
 * One statement rather than a loop of inserts, so the day either arrives or
 * does not. A partial re-log is worse than a failed one: the user sees some of
 * yesterday on the screen, taps the button again, and now has three of
 * breakfast.
 */
export async function addEntries(userId: string, entries: LogEntry[]): Promise<Result> {
  if (entries.length === 0) return { error: null }
  const supabase = createClient()
  const { error } = await supabase
    .from('diet_entry')
    .insert(entries.map((entry) => ({ user_id: userId, ...entryToRow(entry) })))
  return { error: error?.message ?? null }
}

export async function removeEntry(userId: string, id: string): Promise<Result> {
  const supabase = createClient()
  const { error } = await supabase
    .from('diet_entry')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  return { error: error?.message ?? null }
}

/**
 * Save a food to the library and record that it was just used.
 *
 * `use_count` is passed in rather than incremented in SQL because the caller
 * already holds the library in state and an `rpc` for +1 would be a second
 * round trip on the hot path. A lost increment costs nothing: the column only
 * orders the quick-log list, so the worst case is that a food the user ate
 * twice sorts as if they ate it once.
 */
export async function upsertFood(
  userId: string,
  food: FoodItem,
  options: { used?: boolean; useCount?: number } = {},
): Promise<Result> {
  const supabase = createClient()
  const row: Record<string, unknown> = { user_id: userId, ...foodToRow(food) }
  if (options.used) {
    row.use_count = (options.useCount ?? 0) + 1
    row.last_used_at = new Date().toISOString()
  }
  const { error } = await supabase.from('diet_food').upsert(row, { onConflict: 'user_id,id' })
  return { error: error?.message ?? null }
}

export async function removeFood(userId: string, id: string): Promise<Result> {
  const supabase = createClient()
  const { error } = await supabase.from('diet_food').delete().eq('user_id', userId).eq('id', id)
  return { error: error?.message ?? null }
}

export async function addWeight(
  userId: string,
  id: string,
  reading: WeightReading,
): Promise<Result> {
  const supabase = createClient()
  const { error } = await supabase
    .from('diet_weight')
    .insert({ user_id: userId, ...weightToRow(id, reading) })
  return { error: error?.message ?? null }
}

export async function removeWeight(userId: string, id: string): Promise<Result> {
  const supabase = createClient()
  const { error } = await supabase.from('diet_weight').delete().eq('user_id', userId).eq('id', id)
  return { error: error?.message ?? null }
}

/**
 * Save the whole food library in one statement — what seeding the meal plan is.
 *
 * `upsert` rather than `insert` so a user who seeds twice ends up with one copy
 * of each food rather than a conflict, and so a future correction to a
 * reference value can be re-seeded over the top. `use_count` and `last_used_at`
 * are deliberately NOT written: seeding is not eating, and clearing the
 * quick-log ordering would push the foods this person actually taps to the back
 * of their own list.
 */
export async function upsertFoods(userId: string, foods: FoodItem[]): Promise<Result> {
  if (foods.length === 0) return { error: null }
  const supabase = createClient()
  const { error } = await supabase
    .from('diet_food')
    .upsert(
      foods.map((food) => ({ user_id: userId, ...foodToRow(food) })),
      { onConflict: 'user_id,id' },
    )
  return { error: error?.message ?? null }
}

/** One day of the weekly plan. The unit every edit on the plan screen writes. */
export async function savePlanDay(userId: string, day: PlanDay): Promise<Result> {
  const supabase = createClient()
  const { error } = await supabase.from('diet_plan_day').upsert(
    { user_id: userId, ...planDayToRow(day), updated_at: new Date().toISOString() },
    { onConflict: 'user_id,day' },
  )
  return { error: error?.message ?? null }
}

/**
 * The whole week at once — seeding.
 *
 * One statement rather than seven, for the reason `addEntries` gives: a partial
 * seed is worse than a failed one, because the screen then shows a plan with
 * three days in it and no way to tell whether the other four were never written
 * or were deliberately emptied.
 */
export async function savePlanDays(userId: string, days: PlanDay[]): Promise<Result> {
  if (days.length === 0) return { error: null }
  const supabase = createClient()
  const stamp = new Date().toISOString()
  const { error } = await supabase.from('diet_plan_day').upsert(
    days.map((day) => ({ user_id: userId, ...planDayToRow(day), updated_at: stamp })),
    { onConflict: 'user_id,day' },
  )
  return { error: error?.message ?? null }
}

/** The columns the setup form owns. Anything absent is left exactly as it is. */
export type DietProfilePatch = Partial<DietProfileRow>

export async function saveProfile(userId: string, patch: DietProfilePatch): Promise<Result> {
  const supabase = createClient()
  const { error } = await supabase
    .from('diet_profile')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, {
      onConflict: 'user_id',
    })
  return { error: error?.message ?? null }
}

/**
 * Keep a forecast so it can be graded later.
 *
 * Idempotent by construction: the id is `forecast-<madeOn>-<horizon>`, so
 * opening the trends page four times in a day records one forecast for that
 * day rather than four identical ones inflating the scorecard's denominator.
 */
export async function saveForecast(userId: string, forecast: StoredForecast): Promise<Result> {
  const supabase = createClient()
  const { error } = await supabase
    .from('diet_forecast')
    .upsert({ user_id: userId, ...storedForecastToRow(forecast) }, { onConflict: 'user_id,id' })
  return { error: error?.message ?? null }
}
