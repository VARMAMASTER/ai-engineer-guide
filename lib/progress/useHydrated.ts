'use client'

import { useSyncExternalStore } from 'react'
import { useProgress } from './store'

/**
 * Hydration is a one-time, app-wide event, so the finished flag is latched at
 * module scope. Reading `hasHydrated()` alone is not enough: a store that
 * finished hydrating between the subscribe and the read would never notify
 * again, and `useSyncExternalStore` would be stuck on a stale `false`.
 */
let finished = false

const subscribe = (onStoreChange: () => void) =>
  useProgress.persist.onFinishHydration(() => {
    finished = true
    onStoreChange()
  })

const getSnapshot = () => finished || useProgress.persist.hasHydrated()

/** Server markup can never know what is in storage, so it always renders unhydrated. */
const getServerSnapshot = () => false

/** True once zustand has rehydrated from storage, so server and client markup agree. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
