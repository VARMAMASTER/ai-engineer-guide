import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyDelta, fetchAccountProgress, importLocalIntoAccount } from '@/lib/progress/sync'
import { diffBlobs } from '@/lib/progress/remote'
import { emptyBlob } from '@/lib/progress/types'
import type { ProgressBlob } from '@/lib/progress/types'

/**
 * The first-sign-in import, exercised against a stand-in for PostgREST.
 *
 * This is the one code path in stage 0 that can destroy six months of somebody's
 * work, so it is tested at the level where the mistakes actually happen —
 * "which row won", "did the marker get set before the data landed", "what does
 * the second sign-in do" — rather than at the level of "was upsert called".
 *
 * The fake implements only the handful of PostgREST verbs `lib/progress/sync.ts`
 * uses, and implements `on conflict do nothing` honestly, because that
 * behaviour IS the conflict policy.
 */

interface Store {
  profile: {
    user_id: string
    start_date: string | null
    theme: 'dark' | 'light' | 'system'
    progress_imported_at: string | null
  } | null
  completion: Map<string, { user_id: string; item_id: string; completed_on: string }>
  revision: Map<string, { user_id: string; card_id: string; rating: 'again' | 'good' }>
  hours: Map<string, { user_id: string; day: string; hours: number }>
}

const KEY_OF: Record<string, string> = {
  learn_completion: 'item_id',
  learn_revision: 'card_id',
  learn_hours: 'day',
}

function emptyStore(): Store {
  return { profile: null, completion: new Map(), revision: new Map(), hours: new Map() }
}

interface FakeOptions {
  /** Throw a PostgREST-shaped error the first time this table is upserted. */
  failUpsertOn?: string
}

function fakeClient(store: Store, options: FakeOptions = {}) {
  const failed = new Set<string>()

  function bucket(table: string) {
    if (table === 'learn_completion') return store.completion
    if (table === 'learn_revision') return store.revision
    if (table === 'learn_hours') return store.hours
    throw new Error(`no bucket for ${table}`)
  }

  function rowsOf(table: string): unknown[] {
    if (table === 'learn_profile') return store.profile ? [store.profile] : []
    return [...bucket(table).values()]
  }

  const from = (table: string) => ({
    select() {
      const result = { data: rowsOf(table), error: null }
      return {
        maybeSingle: async () => ({
          data: (result.data[0] as unknown) ?? null,
          error: null,
        }),
        then: (resolve: (value: typeof result) => unknown) => resolve(result),
      }
    },

    async upsert(
      rows: Record<string, unknown> | Record<string, unknown>[],
      opts: { onConflict?: string; ignoreDuplicates?: boolean } = {},
    ) {
      if (options.failUpsertOn === table && !failed.has(table)) {
        failed.add(table)
        return { error: { message: `simulated failure writing ${table}` } }
      }

      for (const row of Array.isArray(rows) ? rows : [rows]) {
        if (table === 'learn_profile') {
          if (store.profile && opts.ignoreDuplicates) continue
          store.profile = {
            user_id: String(row.user_id),
            start_date: (row.start_date as string | null) ?? store.profile?.start_date ?? null,
            theme:
              (row.theme as Store['profile'] extends null ? never : 'dark') ??
              store.profile?.theme ??
              'dark',
            progress_imported_at: store.profile?.progress_imported_at ?? null,
          }
          continue
        }
        const map = bucket(table)
        const key = String(row[KEY_OF[table]])
        if (map.has(key) && opts.ignoreDuplicates) continue
        map.set(key, row as never)
      }
      return { error: null }
    },

    update(patch: Record<string, unknown>) {
      const chain = {
        _onlyNullImported: false,
        eq() {
          return chain
        },
        is(column: string, value: null) {
          if (column === 'progress_imported_at' && value === null) chain._onlyNullImported = true
          return chain
        },
        then(resolve: (value: { error: null }) => unknown) {
          if (store.profile) {
            const blocked =
              chain._onlyNullImported && store.profile.progress_imported_at !== null
            if (!blocked) Object.assign(store.profile, patch)
          }
          return resolve({ error: null })
        },
      }
      return chain
    },

    delete() {
      const chain = {
        eq() {
          return chain
        },
        in(column: string, values: string[]) {
          const map = bucket(table)
          for (const value of values) if (KEY_OF[table] === column) map.delete(value)
          return chain
        },
        then(resolve: (value: { error: null }) => unknown) {
          return resolve({ error: null })
        },
      }
      return chain
    },
  })

  return { from } as unknown as SupabaseClient
}

const USER = '11111111-1111-1111-1111-111111111111'

function blob(patch: Partial<ProgressBlob> = {}): ProgressBlob {
  return { ...emptyBlob(), ...patch }
}

const LOCAL = blob({
  startDate: '2026-03-02',
  completed: { shared: '2026-03-03', localOnly: '2026-03-04' },
  revision: { shared: 'again' },
  hours: { '2026-03-03': 2 },
  settings: { theme: 'light' },
})

describe('first sign-in import', () => {
  it('creates the account record and carries the local copy into it', async () => {
    const store = emptyStore()
    const client = fakeClient(store)

    const result = await importLocalIntoAccount(client, USER, LOCAL)

    expect(store.profile?.start_date).toBe('2026-03-02')
    expect(store.completion.size).toBe(2)
    expect(store.revision.size).toBe(1)
    expect(store.hours.size).toBe(1)
    expect(result.blob.completed.localOnly).toBe('2026-03-04')
  })

  it('sets the imported marker, and only once the rows are in', async () => {
    const store = emptyStore()
    await importLocalIntoAccount(fakeClient(store), USER, LOCAL)
    expect(store.profile?.progress_imported_at).not.toBeNull()
  })

  it('leaves the marker null when a row write fails, so the next sign-in retries', async () => {
    // The failure mode this exists for: marking the import done on a half
    // written account turns a transient error into permanent data loss, because
    // no later sign-in will ever look at the local copy again.
    const store = emptyStore()
    const client = fakeClient(store, { failUpsertOn: 'learn_completion' })

    await expect(importLocalIntoAccount(client, USER, LOCAL)).rejects.toThrow(
      /simulated failure writing learn_completion/,
    )

    expect(store.profile?.progress_imported_at ?? null).toBeNull()
    expect(store.completion.size).toBe(0)
  })

  it('is idempotent — signing in twice imports once', async () => {
    const store = emptyStore()
    const client = fakeClient(store)

    await importLocalIntoAccount(client, USER, LOCAL)
    const markedAt = store.profile?.progress_imported_at
    const snapshot = new Map(store.completion)

    // Second sign-in, same browser, same local copy.
    const second = await importLocalIntoAccount(client, USER, LOCAL)

    expect(store.profile?.progress_imported_at).toBe(markedAt)
    expect([...store.completion.keys()].sort()).toEqual([...snapshot.keys()].sort())
    expect(second.importedAt).toBe(markedAt)
  })

  it('does not re-import into an account that has already imported once', async () => {
    // The device that signs in second: its local copy is stale, and it must not
    // be allowed to resurrect rows the user deleted on the first device.
    const store = emptyStore()
    await importLocalIntoAccount(fakeClient(store), USER, blob())
    expect(store.profile?.progress_imported_at).not.toBeNull()

    const after = await importLocalIntoAccount(fakeClient(store), USER, LOCAL)
    expect(store.completion.size).toBe(0)
    expect(after.blob.completed).toEqual({})
  })
})

describe('the account wins every key it already holds', () => {
  it('keeps the account value and adds only what is missing', async () => {
    const store = emptyStore()
    store.profile = {
      user_id: USER,
      start_date: '2026-09-07',
      theme: 'dark',
      progress_imported_at: null,
    }
    store.completion.set('shared', { user_id: USER, item_id: 'shared', completed_on: '2026-09-08' })

    const result = await importLocalIntoAccount(fakeClient(store), USER, LOCAL)

    expect(store.completion.get('shared')?.completed_on).toBe('2026-09-08')
    expect(store.completion.get('localOnly')?.completed_on).toBe('2026-03-04')
    // The account already had a start date, so local's does not overwrite it.
    expect(store.profile?.start_date).toBe('2026-09-07')
    expect(result.blob.completed.shared).toBe('2026-09-08')
  })
})

describe('write-through after the import', () => {
  it('pushes only what changed', async () => {
    const store = emptyStore()
    const client = fakeClient(store)
    await importLocalIntoAccount(client, USER, LOCAL)

    const next = blob({
      ...LOCAL,
      completed: { localOnly: '2026-03-04', fresh: '2026-09-14' },
    })
    await applyDelta(client, USER, diffBlobs(LOCAL, next))

    expect(store.completion.has('fresh')).toBe(true)
    // `shared` disappeared from the blob, so it is deleted rather than left
    // behind — an unticked checkbox has to survive a reload on another device.
    expect(store.completion.has('shared')).toBe(false)
  })

  it('reads back what it wrote', async () => {
    const store = emptyStore()
    const client = fakeClient(store)
    await importLocalIntoAccount(client, USER, LOCAL)

    const account = await fetchAccountProgress(client)
    expect(account.blob.completed).toEqual(LOCAL.completed)
    expect(account.blob.hours).toEqual(LOCAL.hours)
    expect(account.importedAt).not.toBeNull()
  })
})
