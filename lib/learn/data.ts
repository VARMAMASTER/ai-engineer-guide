/**
 * Reading Learn's own tables, on the server.
 *
 * Learn already had a persistence layer for the browser (`lib/progress/sync.ts`
 * and `lib/progress/remote.ts`, which own the localStorage↔account import). What
 * it never had was a plain server-side read, because nothing server-side needed
 * one until Today started showing a Learn card and the agent started reading
 * across all four apps.
 *
 * This is that read and nothing more: two queries, scoped by RLS, into the two
 * fields `learnSummary` takes. The row→blob translation is reused from
 * `lib/progress/remote.ts` rather than rewritten, so there is exactly one place
 * that knows how a completion row becomes a completion.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { rowsToBlob } from '@/lib/progress/remote'
import type { Completed } from '@/lib/progress/selectors'

export interface LearnState {
  /** Day 1 of the 180-day plan, or null if never set. */
  startDate: string | null
  completed: Completed
}

export const EMPTY_LEARN_STATE: LearnState = { startDate: null, completed: {} }

/**
 * Everything Learn holds that a summary needs.
 *
 * Rows are scoped by RLS — the client carries the user's own token — so there
 * is no `where user_id` here and a bug in one could not return another
 * account's progress.
 *
 * A query error throws rather than degrading to an empty state. An empty plan
 * and a broken read look identical on a card, and quietly reporting "you have
 * done nothing" to somebody who has done a month of work is the worse failure.
 */
export async function loadLearnState(supabase: SupabaseClient): Promise<LearnState> {
  const [profile, completions] = await Promise.all([
    supabase.from('learn_profile').select('start_date, theme').maybeSingle(),
    supabase.from('learn_completion').select('item_id, completed_on'),
  ])

  if (profile.error) throw new Error(`Could not load your plan: ${profile.error.message}`)
  if (completions.error) {
    throw new Error(`Could not load your progress: ${completions.error.message}`)
  }

  const row = profile.data as { start_date: string | null; theme: string | null } | null
  const blob = rowsToBlob(
    {
      completions: (completions.data ?? []) as { item_id: string; completed_on: string }[],
      revisions: [],
      hours: [],
    },
    { startDate: row?.start_date ?? null, theme: 'dark' },
  )

  return { startDate: blob.startDate, completed: blob.completed }
}
