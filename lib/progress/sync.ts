import type { SupabaseClient } from '@supabase/supabase-js'
import { emptyBlob } from './types'
import type { ProgressBlob } from './types'
import {
  blobToRows,
  isEmptyBlob,
  isEmptyDelta,
  mergeForImport,
  rowsToBlob,
  type ProgressDelta,
  type ProgressRows,
} from './remote'

/**
 * Moving the 180-day record between this browser and the account.
 *
 * The one rule that everything here is arranged around: THE LOCAL COPY IS NEVER
 * DESTROYED BEFORE THE SERVER COPY IS CONFIRMED WRITTEN. Confirmation means a
 * re-read that comes back with the data in it, not an insert that did not
 * error. And even then the pre-import blob is kept under its own key rather
 * than dropped, so a bad import is recoverable by hand.
 */

/** Where the untouched pre-import blob is parked. Never written twice. */
export const BACKUP_KEY = 'aeg.progress.pre-import.v1'

export interface AccountProgress {
  blob: ProgressBlob
  /** Null when the first-sign-in import has not run for this account yet. */
  importedAt: string | null
  /** False when this account has no profile row at all. */
  exists: boolean
}

interface ProfileRow {
  start_date: string | null
  theme: ProgressBlob['settings']['theme']
  progress_imported_at: string | null
}

/** Read everything the account holds. RLS scopes it; no `user_id` filter needed. */
export async function fetchAccountProgress(supabase: SupabaseClient): Promise<AccountProgress> {
  const [profile, completions, revisions, hours] = await Promise.all([
    supabase
      .from('learn_profile')
      .select('start_date, theme, progress_imported_at')
      .maybeSingle<ProfileRow>(),
    supabase.from('learn_completion').select('item_id, completed_on'),
    supabase.from('learn_revision').select('card_id, rating'),
    supabase.from('learn_hours').select('day, hours'),
  ])

  const firstError =
    profile.error ?? completions.error ?? revisions.error ?? hours.error
  if (firstError) throw new Error(firstError.message)

  const rows: ProgressRows = {
    completions: (completions.data ?? []) as ProgressRows['completions'],
    revisions: (revisions.data ?? []) as ProgressRows['revisions'],
    hours: ((hours.data ?? []) as { day: string; hours: number | string }[]).map((row) => ({
      day: row.day,
      // numeric(4,2) comes back from PostgREST as a string.
      hours: typeof row.hours === 'string' ? Number(row.hours) : row.hours,
    })),
  }

  const base = emptyBlob()

  return {
    blob: rowsToBlob(rows, {
      startDate: profile.data?.start_date ?? null,
      theme: profile.data?.theme ?? base.settings.theme,
    }),
    importedAt: profile.data?.progress_imported_at ?? null,
    exists: profile.data !== null && profile.data !== undefined,
  }
}

/**
 * Fold this browser's localStorage blob into the account, once.
 *
 * Returns the account's state afterwards. Safe to call on every sign-in: the
 * `progress_imported_at` marker short-circuits it, and every write underneath
 * is insert-if-absent, so even a call that slips past the marker changes
 * nothing that already exists.
 */
export async function importLocalIntoAccount(
  supabase: SupabaseClient,
  userId: string,
  local: ProgressBlob | null,
): Promise<AccountProgress> {
  const before = await fetchAccountProgress(supabase)

  if (!before.exists) {
    // Seed the profile from local, since there is nothing to conflict with yet.
    const { error } = await supabase.from('learn_profile').upsert(
      {
        user_id: userId,
        start_date: local?.startDate ?? null,
        theme: local?.settings.theme ?? emptyBlob().settings.theme,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: true },
    )
    if (error) throw new Error(error.message)
  }

  // Already imported on this account, or nothing here worth importing.
  if (before.importedAt !== null || local === null || isEmptyBlob(local)) {
    if (before.importedAt === null) await markImported(supabase, userId)
    return await fetchAccountProgress(supabase)
  }

  const rows = blobToRows(local)
  const now = new Date().toISOString()

  // `ignoreDuplicates: true` is the whole conflict policy, expressed as
  // `on conflict do nothing`: the account keeps every key it already has, and
  // gains the ones it did not.
  if (rows.completions.length > 0) {
    const { error } = await supabase
      .from('learn_completion')
      .upsert(
        rows.completions.map((row) => ({ ...row, user_id: userId })),
        { onConflict: 'user_id,item_id', ignoreDuplicates: true },
      )
    if (error) throw new Error(error.message)
  }

  if (rows.revisions.length > 0) {
    const { error } = await supabase
      .from('learn_revision')
      .upsert(
        rows.revisions.map((row) => ({ ...row, user_id: userId })),
        { onConflict: 'user_id,card_id', ignoreDuplicates: true },
      )
    if (error) throw new Error(error.message)
  }

  if (rows.hours.length > 0) {
    const { error } = await supabase
      .from('learn_hours')
      .upsert(
        rows.hours.map((row) => ({ ...row, user_id: userId })),
        { onConflict: 'user_id,day', ignoreDuplicates: true },
      )
    if (error) throw new Error(error.message)
  }

  if (before.blob.startDate === null && local.startDate !== null) {
    const { error } = await supabase
      .from('learn_profile')
      .update({ start_date: local.startDate, updated_at: now })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  // LAST, and only once every row write above has returned without error. The
  // marker is what makes a second sign-in skip the import; setting it before
  // the data lands would turn a half-finished import into a permanent one.
  await markImported(supabase, userId)

  // Confirm by reading back rather than by trusting the writes. If this throws,
  // the caller keeps the local copy untouched.
  const after = await fetchAccountProgress(supabase)
  return { ...after, blob: mergeForImport(local, after.blob) }
}

async function markImported(supabase: SupabaseClient, userId: string): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('learn_profile')
    .update({ progress_imported_at: now, updated_at: now })
    .eq('user_id', userId)
    .is('progress_imported_at', null)
  if (error) throw new Error(error.message)
}

/** Push the smallest set of writes that makes the account match local state. */
export async function applyDelta(
  supabase: SupabaseClient,
  userId: string,
  delta: ProgressDelta,
): Promise<void> {
  if (isEmptyDelta(delta)) return

  if (delta.profile) {
    const { error } = await supabase.from('learn_profile').upsert(
      {
        user_id: userId,
        start_date: delta.profile.startDate,
        theme: delta.profile.theme,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw new Error(error.message)
  }

  if (delta.completions.upsert.length > 0) {
    const { error } = await supabase
      .from('learn_completion')
      .upsert(
        delta.completions.upsert.map((row) => ({ ...row, user_id: userId })),
        { onConflict: 'user_id,item_id' },
      )
    if (error) throw new Error(error.message)
  }
  if (delta.completions.remove.length > 0) {
    const { error } = await supabase
      .from('learn_completion')
      .delete()
      .eq('user_id', userId)
      .in('item_id', delta.completions.remove)
    if (error) throw new Error(error.message)
  }

  if (delta.revisions.upsert.length > 0) {
    const { error } = await supabase
      .from('learn_revision')
      .upsert(
        delta.revisions.upsert.map((row) => ({ ...row, user_id: userId })),
        { onConflict: 'user_id,card_id' },
      )
    if (error) throw new Error(error.message)
  }
  if (delta.revisions.remove.length > 0) {
    const { error } = await supabase
      .from('learn_revision')
      .delete()
      .eq('user_id', userId)
      .in('card_id', delta.revisions.remove)
    if (error) throw new Error(error.message)
  }

  if (delta.hours.upsert.length > 0) {
    const { error } = await supabase
      .from('learn_hours')
      .upsert(
        delta.hours.upsert.map((row) => ({ ...row, user_id: userId })),
        { onConflict: 'user_id,day' },
      )
    if (error) throw new Error(error.message)
  }
  if (delta.hours.remove.length > 0) {
    const { error } = await supabase
      .from('learn_hours')
      .delete()
      .eq('user_id', userId)
      .in('day', delta.hours.remove)
    if (error) throw new Error(error.message)
  }
}
