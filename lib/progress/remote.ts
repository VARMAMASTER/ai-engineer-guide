import { migrate } from './migrations'
import { emptyBlob } from './types'
import type { ProgressBlob, RevisionRating } from './types'

/**
 * The pure half of moving progress between localStorage and the account.
 *
 * Everything here is a data transform with no I/O, because this is the code
 * path that can lose six months of somebody's work. It is asserted directly in
 * `tests/unit/progress-remote.test.ts`, with no database and no browser.
 *
 * THE CONFLICT POLICY, stated once.
 *
 * On first sign-in the local copy is IMPORTED, key by key, and the account is
 * authoritative from then on. Concretely: a completion, a revision rating or an
 * hours entry that the account does not already have is inserted; one it
 * already has is left exactly as it is. Nothing on either side is overwritten
 * by the import, so the merge can never lose a fact — it can only add one.
 *
 * That is the spec's lean (section 8) made precise, and the precision matters.
 * "Import local then treat the account as authoritative" read as "overwrite the
 * account with local" would destroy work done on another device; read as
 * "overwrite local with the account" would destroy the work being imported. The
 * only reading that loses nothing is insert-if-absent, and it has the useful
 * side effect of being idempotent for free: running it twice is a no-op,
 * because the second run finds every key already present.
 */

export interface ProgressRows {
  completions: { item_id: string; completed_on: string }[]
  revisions: { card_id: string; rating: RevisionRating }[]
  hours: { day: string; hours: number }[]
}

/** The zustand-persist envelope: `{ state: <blob>, version: <persist version> }`. */
interface PersistEnvelope {
  state?: unknown
  version?: number
}

/**
 * Read the blob out of whatever is in localStorage, tolerating every shape the
 * app has ever written.
 *
 * Returns null rather than throwing on junk. A corrupted local file must not be
 * able to stop somebody signing in — it is the copy we are least sure of, and
 * the account is the one that has to keep working.
 */
export function readLocalBlob(raw: string | null | undefined): ProgressBlob | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PersistEnvelope
    const inner =
      parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed
    if (!inner || typeof inner !== 'object') return null
    // `migrate` upgrades a v0 or v1 blob to the current shape and validates it.
    return migrate(inner)
  } catch {
    return null
  }
}

/** True when a blob records nothing worth importing. */
export function isEmptyBlob(blob: ProgressBlob): boolean {
  return (
    blob.startDate === null &&
    Object.keys(blob.completed).length === 0 &&
    Object.keys(blob.revision).length === 0 &&
    Object.keys(blob.hours).length === 0
  )
}

export function blobToRows(blob: ProgressBlob): ProgressRows {
  return {
    completions: Object.entries(blob.completed).map(([item_id, completed_on]) => ({
      item_id,
      completed_on,
    })),
    revisions: Object.entries(blob.revision).map(([card_id, rating]) => ({ card_id, rating })),
    hours: Object.entries(blob.hours).map(([day, value]) => ({ day, hours: value })),
  }
}

export function rowsToBlob(
  rows: ProgressRows,
  profile: { startDate: string | null; theme: ProgressBlob['settings']['theme'] },
): ProgressBlob {
  const blob = emptyBlob()
  blob.startDate = profile.startDate
  blob.settings.theme = profile.theme
  for (const row of rows.completions) blob.completed[row.item_id] = row.completed_on
  for (const row of rows.revisions) blob.revision[row.card_id] = row.rating
  for (const row of rows.hours) blob.hours[row.day] = row.hours
  return blob
}

/**
 * The import result, computed locally: what the account holds once the
 * insert-if-absent import has run. Used to fill in the UI without waiting for a
 * round trip, and as the fallback if the confirming re-read fails.
 *
 * `remote` wins every key it already has. `local` contributes only the rest.
 */
export function mergeForImport(local: ProgressBlob, remote: ProgressBlob): ProgressBlob {
  return {
    version: remote.version,
    startDate: remote.startDate ?? local.startDate,
    completed: { ...local.completed, ...remote.completed },
    revision: { ...local.revision, ...remote.revision },
    hours: { ...local.hours, ...remote.hours },
    // Theme is a device preference more than a record, but it has to come down
    // to one value. The account's wins for the same reason everything else's
    // does — one rule is auditable, two are a coin toss.
    settings: { ...remote.settings },
  }
}

export interface ProgressDelta {
  completions: { upsert: { item_id: string; completed_on: string }[]; remove: string[] }
  revisions: { upsert: { card_id: string; rating: RevisionRating }[]; remove: string[] }
  hours: { upsert: { day: string; hours: number }[]; remove: string[] }
  profile: { startDate: string | null; theme: ProgressBlob['settings']['theme'] } | null
}

/**
 * What changed between two blobs, as the smallest set of writes that would make
 * the account match `next`.
 *
 * Deltas rather than "upsert the whole blob" because the whole blob is up to
 * seven hundred keys, and because a full push would have to delete-then-insert
 * to express an unticked checkbox — which is a window in which the account
 * holds less than either device does.
 */
export function diffBlobs(prev: ProgressBlob, next: ProgressBlob): ProgressDelta {
  return {
    completions: {
      upsert: changedEntries(prev.completed, next.completed).map(([item_id, completed_on]) => ({
        item_id,
        completed_on,
      })),
      remove: removedKeys(prev.completed, next.completed),
    },
    revisions: {
      upsert: changedEntries(prev.revision, next.revision).map(([card_id, rating]) => ({
        card_id,
        rating,
      })),
      remove: removedKeys(prev.revision, next.revision),
    },
    hours: {
      upsert: changedEntries(prev.hours, next.hours).map(([day, value]) => ({
        day,
        hours: value,
      })),
      remove: removedKeys(prev.hours, next.hours),
    },
    profile:
      prev.startDate !== next.startDate || prev.settings.theme !== next.settings.theme
        ? { startDate: next.startDate, theme: next.settings.theme }
        : null,
  }
}

export function isEmptyDelta(delta: ProgressDelta): boolean {
  return (
    delta.profile === null &&
    delta.completions.upsert.length === 0 &&
    delta.completions.remove.length === 0 &&
    delta.revisions.upsert.length === 0 &&
    delta.revisions.remove.length === 0 &&
    delta.hours.upsert.length === 0 &&
    delta.hours.remove.length === 0
  )
}

function changedEntries<T>(prev: Record<string, T>, next: Record<string, T>): [string, T][] {
  return Object.entries(next).filter(([key, value]) => prev[key] !== value)
}

function removedKeys(prev: Record<string, unknown>, next: Record<string, unknown>): string[] {
  return Object.keys(prev).filter((key) => !(key in next))
}
