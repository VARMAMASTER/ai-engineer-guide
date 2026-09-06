'use client'

import { useEffect, useState } from 'react'
import { useProgress } from './store'

/** True once zustand has rehydrated from storage, so server and client markup agree. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useProgress.persist.hasHydrated())
  useEffect(() => {
    const unsub = useProgress.persist.onFinishHydration(() => setHydrated(true))
    if (useProgress.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])
  return hydrated
}
