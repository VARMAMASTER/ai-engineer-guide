import { describe, expect, it } from 'vitest'
import {
  blobToRows,
  diffBlobs,
  isEmptyBlob,
  isEmptyDelta,
  mergeForImport,
  readLocalBlob,
  rowsToBlob,
} from '@/lib/progress/remote'
import { emptyBlob } from '@/lib/progress/types'
import type { ProgressBlob } from '@/lib/progress/types'

function blob(patch: Partial<ProgressBlob> = {}): ProgressBlob {
  return { ...emptyBlob(), ...patch }
}

/** The exact envelope zustand's persist middleware writes. */
function envelope(state: unknown, version = 0): string {
  return JSON.stringify({ state, version })
}

describe('reading whatever is in localStorage', () => {
  it('unwraps the zustand persist envelope', () => {
    const raw = envelope({
      version: 2,
      startDate: '2026-09-07',
      completed: { 'dsa-1': '2026-09-08' },
      revision: { 'card-1': 'good' },
      hours: { '2026-09-08': 2.5 },
      settings: { theme: 'light' },
    })
    const parsed = readLocalBlob(raw)
    expect(parsed?.startDate).toBe('2026-09-07')
    expect(parsed?.completed['dsa-1']).toBe('2026-09-08')
    expect(parsed?.revision['card-1']).toBe('good')
    expect(parsed?.hours['2026-09-08']).toBe(2.5)
  })

  it('upgrades an older blob on the way in rather than refusing it', () => {
    // A v1 envelope: no `revision` map at all. This is what a browser that has
    // not been opened since before revision mode shipped actually holds, and it
    // is exactly the copy most worth not losing.
    const raw = envelope({
      version: 1,
      startDate: '2026-03-02',
      completed: { 'dsa-1': '2026-03-03' },
      hours: {},
      settings: { theme: 'dark' },
    })
    const parsed = readLocalBlob(raw)
    expect(parsed?.version).toBe(2)
    expect(parsed?.revision).toEqual({})
    expect(parsed?.completed['dsa-1']).toBe('2026-03-03')
  })

  it('accepts a bare blob with no envelope, the way an exported file looks', () => {
    const parsed = readLocalBlob(JSON.stringify(blob({ startDate: '2026-09-07' })))
    expect(parsed?.startDate).toBe('2026-09-07')
  })

  it('returns null rather than throwing on junk', () => {
    // A corrupted local file must not be able to stop somebody signing in.
    expect(readLocalBlob(null)).toBeNull()
    expect(readLocalBlob('')).toBeNull()
    expect(readLocalBlob('not json')).toBeNull()
    expect(readLocalBlob('[]')).toBeNull()
    expect(readLocalBlob(envelope({ version: 2, completed: 'nope' }))).toBeNull()
  })

  it('knows an empty record when it sees one', () => {
    expect(isEmptyBlob(emptyBlob())).toBe(true)
    expect(isEmptyBlob(blob({ startDate: '2026-09-07' }))).toBe(false)
    expect(isEmptyBlob(blob({ hours: { '2026-09-08': 1 } }))).toBe(false)
  })
})

describe('rows and blobs are the same thing in two shapes', () => {
  it('round-trips without loss', () => {
    const source = blob({
      startDate: '2026-09-07',
      completed: { a: '2026-09-08', b: '2026-09-09' },
      revision: { c: 'again' },
      hours: { '2026-09-08': 3 },
      settings: { theme: 'system' },
    })
    const back = rowsToBlob(blobToRows(source), {
      startDate: source.startDate,
      theme: source.settings.theme,
    })
    expect(back).toEqual(source)
  })
})

describe('the import conflict policy', () => {
  const local = blob({
    startDate: '2026-03-02',
    completed: { shared: '2026-03-03', localOnly: '2026-03-04' },
    revision: { shared: 'again', localOnly: 'good' },
    hours: { '2026-03-03': 2, '2026-03-04': 1 },
    settings: { theme: 'light' },
  })

  const remote = blob({
    startDate: '2026-09-07',
    completed: { shared: '2026-09-08', remoteOnly: '2026-09-09' },
    revision: { shared: 'good' },
    hours: { '2026-03-03': 5 },
    settings: { theme: 'dark' },
  })

  it('loses nothing from either side', () => {
    const merged = mergeForImport(local, remote)
    expect(Object.keys(merged.completed).sort()).toEqual(['localOnly', 'remoteOnly', 'shared'])
    expect(Object.keys(merged.revision).sort()).toEqual(['localOnly', 'shared'])
    expect(Object.keys(merged.hours).sort()).toEqual(['2026-03-03', '2026-03-04'])
  })

  it('lets the account win every key it already has', () => {
    const merged = mergeForImport(local, remote)
    expect(merged.completed.shared).toBe('2026-09-08')
    expect(merged.revision.shared).toBe('good')
    expect(merged.hours['2026-03-03']).toBe(5)
    expect(merged.startDate).toBe('2026-09-07')
    expect(merged.settings.theme).toBe('dark')
  })

  it('fills in what the account has never heard of', () => {
    const merged = mergeForImport(local, remote)
    expect(merged.completed.localOnly).toBe('2026-03-04')
    expect(merged.revision.localOnly).toBe('good')
    expect(merged.hours['2026-03-04']).toBe(1)
  })

  it('takes the local start date when the account has none', () => {
    const merged = mergeForImport(local, blob())
    expect(merged.startDate).toBe('2026-03-02')
  })

  it('is idempotent: merging the result again changes nothing', () => {
    const once = mergeForImport(local, remote)
    const twice = mergeForImport(local, once)
    expect(twice).toEqual(once)
  })
})

describe('deltas', () => {
  it('says nothing changed when nothing changed', () => {
    const b = blob({ completed: { a: '2026-09-08' } })
    expect(isEmptyDelta(diffBlobs(b, { ...b }))).toBe(true)
  })

  it('reports additions, edits and removals separately', () => {
    const before = blob({
      completed: { keep: '2026-09-08', drop: '2026-09-08', edit: '2026-09-08' },
      revision: { r: 'again' },
      hours: { '2026-09-08': 2 },
    })
    const after = blob({
      completed: { keep: '2026-09-08', edit: '2026-09-09', add: '2026-09-10' },
      revision: { r: 'good' },
      hours: {},
    })

    const delta = diffBlobs(before, after)
    expect(delta.completions.upsert.map((r) => r.item_id).sort()).toEqual(['add', 'edit'])
    expect(delta.completions.remove).toEqual(['drop'])
    expect(delta.revisions.upsert).toEqual([{ card_id: 'r', rating: 'good' }])
    expect(delta.hours.remove).toEqual(['2026-09-08'])
    expect(delta.profile).toBeNull()
  })

  it('notices a start date or a theme change', () => {
    const before = blob()
    expect(diffBlobs(before, blob({ startDate: '2026-09-07' })).profile).toEqual({
      startDate: '2026-09-07',
      theme: 'dark',
    })
    expect(diffBlobs(before, blob({ settings: { theme: 'light' } })).profile?.theme).toBe('light')
  })

  it('does not resend a value that only looks new', () => {
    // Unticking and re-ticking the same box in the same second is one row, not
    // a delete and an insert — and ends as no write at all.
    const b = blob({ completed: { a: '2026-09-08' } })
    const delta = diffBlobs(b, blob({ completed: { a: '2026-09-08' } }))
    expect(delta.completions.upsert).toEqual([])
    expect(delta.completions.remove).toEqual([])
  })
})
