import { describe, it, expect } from 'vitest'
import { migrate } from '@/lib/progress/migrations'
import { emptyBlob, CURRENT_VERSION } from '@/lib/progress/types'

describe('migrate', () => {
  it('passes a current blob through unchanged', () => {
    const blob = { ...emptyBlob(), startDate: '2026-09-07', completed: { 'dsa-1-two-sum': '2026-09-07' } }
    expect(migrate(blob)).toEqual(blob)
  })

  it('upgrades a version 0 blob that has no settings or hours', () => {
    const v0 = { version: 0, startDate: '2026-09-07', completed: { 'dsa-1-two-sum': '2026-09-07' } }
    const out = migrate(v0)
    expect(out.version).toBe(CURRENT_VERSION)
    expect(out.startDate).toBe('2026-09-07')
    expect(out.completed).toEqual({ 'dsa-1-two-sum': '2026-09-07' })
    expect(out.hours).toEqual({})
    expect(out.settings).toEqual({ theme: 'dark' })
  })

  it('throws on a blob that is not an object', () => {
    expect(() => migrate('nope')).toThrow(/not an object/i)
  })

  it('throws on a future version', () => {
    expect(() => migrate({ ...emptyBlob(), version: 99 })).toThrow(/newer version/i)
  })

  it('throws with a readable message on a malformed completed map', () => {
    expect(() => migrate({ ...emptyBlob(), completed: { 'dsa-1-two-sum': 'not-a-date' } })).toThrow(/completed/i)
  })
})
