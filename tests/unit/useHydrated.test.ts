import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@/lib/progress/store')
})

describe('useHydrated', () => {
  it('returns true immediately when hydration already finished before the effect runs', async () => {
    vi.doMock('@/lib/progress/store', () => ({
      useProgress: {
        persist: {
          hasHydrated: () => true,
          onFinishHydration: () => () => {},
        },
      },
    }))
    const { useHydrated } = await import('@/lib/progress/useHydrated')
    const { result } = renderHook(() => useHydrated())
    // Must be true from the very first render, not just after an effect flush,
    // so server and client markup never disagree on an already-hydrated store.
    expect(result.current).toBe(true)
  })

  it('flips to true once hydration finishes after mount', async () => {
    let finishHydration: (() => void) | null = null
    vi.doMock('@/lib/progress/store', () => ({
      useProgress: {
        persist: {
          hasHydrated: () => false,
          onFinishHydration: (cb: () => void) => {
            finishHydration = cb
            return () => {}
          },
        },
      },
    }))
    const { useHydrated } = await import('@/lib/progress/useHydrated')
    const { result } = renderHook(() => useHydrated())
    expect(result.current).toBe(false)

    act(() => {
      finishHydration?.()
    })

    expect(result.current).toBe(true)
  })
})
