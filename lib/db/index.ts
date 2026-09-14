/**
 * The shared data layer. Knows about no mini-app in particular (spec 4.2).
 *
 * THERE ARE TWO CLIENT ENTRY POINTS, AND THEY CANNOT BE MERGED.
 *
 *   import { createClient } from '@/lib/db/client'   // browser: Client Components
 *   import { createClient } from '@/lib/db/server'   // server:  Server Components,
 *                                                    //          Server Actions,
 *                                                    //          Route Handlers  (await it)
 *
 * A barrel that re-exported both would pull `next/headers` into every Client
 * Component that imported anything from `@/lib/db`, which Next rejects at build
 * time. So this file carries only what is safe on both sides: the environment
 * flags and the shared table vocabulary.
 *
 * `@/lib/db/admin` exists too and bypasses RLS. It has exactly one caller
 * (account deletion) and must not acquire another.
 *
 * ---------------------------------------------------------------------------
 * THE SCHEMA CONTRACT for a new mini-app table. Follow it exactly.
 *
 *   1. Create the migration file with the CLI, never by hand:
 *        npx supabase migration new <app>_<thing>
 *      It lands in `supabase/migrations/<timestamp>_<name>.sql`.
 *
 *   2. Name tables `<app>_<thing>`: `diet_entry`, `train_session`, `ops_todo`.
 *      An app reads only its own prefix. Diet never selects from `train_*`.
 *
 *   3. Every personal table carries:
 *        user_id uuid not null references auth.users (id) on delete cascade
 *      as the leftmost column of its primary key (or with its own index).
 *      The cascade IS the account-deletion implementation — there is no
 *      per-table cleanup code, and a missing cascade means a deleted user's
 *      rows survive them.
 *
 *   4. Enable RLS and write all four policies. See the template in
 *      `supabase/migrations/20260914083039_learn_progress.sql`, which is
 *      meant to be copied. The three ways to get this wrong:
 *        - `to authenticated` with no ownership predicate is authentication
 *          without authorization: every signed-in user reads every row.
 *        - an update policy without `with check` lets a user reassign a row's
 *          `user_id` to somebody else.
 *        - an update policy with no SELECT policy alongside it updates zero
 *          rows, silently, with no error.
 *
 *   5. Grant to `authenticated` only. Never `anon`. Grants are separate from
 *      RLS: RLS decides which rows, the grant decides whether the table is
 *      reachable through the Data API at all.
 *
 *   6. Apply and check:
 *        npx supabase db push --db-url "$POSTGRES_URL_NON_POOLING"
 *        npx supabase db advisors --db-url "$POSTGRES_URL_NON_POOLING" --level info
 *      Advisors must report no issues.
 * ---------------------------------------------------------------------------
 */

export { DB_CONFIGURED, PUBLISHABLE_KEY, SUPABASE_URL } from './env'

/** Every table stage 0 owns. Mini-apps add their own prefix, not entries here. */
export const LEARN_TABLES = [
  'learn_profile',
  'learn_completion',
  'learn_revision',
  'learn_hours',
] as const

export type LearnTable = (typeof LEARN_TABLES)[number]

export interface LearnProfileRow {
  user_id: string
  start_date: string | null
  theme: 'dark' | 'light' | 'system'
  progress_imported_at: string | null
  created_at: string
  updated_at: string
}

export interface LearnCompletionRow {
  user_id: string
  item_id: string
  completed_on: string
}

export interface LearnRevisionRow {
  user_id: string
  card_id: string
  rating: 'again' | 'good'
}

export interface LearnHoursRow {
  user_id: string
  day: string
  hours: number
}
