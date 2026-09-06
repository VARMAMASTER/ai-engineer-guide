import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress, STORAGE_KEY } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('progress store', () => {
  it('toggles an item on and off', () => {
    const { toggle } = useProgress.getState()
    toggle('dsa-1-two-sum')
    expect(useProgress.getState().completed['dsa-1-two-sum']).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    toggle('dsa-1-two-sum')
    expect(useProgress.getState().completed['dsa-1-two-sum']).toBeUndefined()
  })

  it('persists to localStorage under the versioned key', () => {
    useProgress.getState().setStartDate('2026-09-07')
    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).state.startDate).toBe('2026-09-07')
  })

  it('round-trips through export and import', () => {
    const s = useProgress.getState()
    s.setStartDate('2026-09-07')
    s.toggle('dsa-1-two-sum')
    const json = useProgress.getState().exportBlob()

    useProgress.getState().reset()
    expect(useProgress.getState().startDate).toBeNull()

    useProgress.getState().importBlob(json)
    expect(useProgress.getState().startDate).toBe('2026-09-07')
    expect(useProgress.getState().completed['dsa-1-two-sum']).toBeTruthy()
  })

  it('leaves state untouched when an import fails', () => {
    const s = useProgress.getState()
    s.setStartDate('2026-09-07')
    expect(() => useProgress.getState().importBlob('{"version":1,"completed":"nope"}')).toThrow()
    expect(useProgress.getState().startDate).toBe('2026-09-07')
  })

  it('clears storage on reset', () => {
    useProgress.getState().setStartDate('2026-09-07')
    useProgress.getState().reset()
    expect(useProgress.getState().completed).toEqual({})
  })
})
