'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/db/client'
import { useUser } from '@/lib/auth/useUser'
import { EMPTY_OPS_DATA, loadOps, type OpsData } from '@/lib/ops/data'

export type OpsStatus = 'loading' | 'ready' | 'signed-out' | 'error'

export interface OpsStore {
  status: OpsStatus
  /** Null until the first load has produced one — never read during the server render. */
  now: Date | null
  data: OpsData
  error: string | null
  /** True while a mutation is in flight; disables the control that started it. */
  busy: boolean
  userId: string | null
  /**
   * Run a write, then re-read. The callback is handed the client, the user id
   * and the same `now` the page is rendering against, so a mutation can never
   * be computed from a different instant than the one the user is looking at.
   * Resolves true when the write went through.
   */
  mutate: (fn: (ctx: OpsMutationContext) => Promise<void>) => Promise<boolean>
  reload: () => void
  dismissError: () => void
}

export interface OpsMutationContext {
  supabase: SupabaseClient
  userId: string
  now: Date
}

/**
 * The Ops app's one connection to its data, and its one reading of the clock.
 *
 * WHY `now` LIVES HERE. Every function in `lib/ops/**` takes `now` as a
 * parameter and none of them reads the clock, which is what makes the whole
 * domain testable. That discipline is only worth something if the clock is read
 * in ONE place at the edge, so this hook is it: the sections receive a `Date`
 * and pass it down, and no component below calls `new Date()` to decide
 * anything.
 *
 * It starts as `null` rather than `new Date()` on purpose. A Client Component
 * is still rendered on the server for the initial HTML, and an instant read
 * during that render is the SERVER's instant in the SERVER's timezone — which
 * hydration would then quietly replace with the browser's, changing every date
 * on screen after the fact. Null until the effect runs means the server ships
 * the page's structure and the dated content appears once there is a real local
 * clock to date it by. The `<h1>` lives in `OpsShell`, a Server Component
 * outside this gate, so every route still ships a real heading with JavaScript
 * switched off.
 *
 * Reads are re-run after every write rather than patched locally. The table is
 * the truth — and completing a recurring task writes TWO rows, one of which the
 * page never asked for, so an optimistic patch would have to reimplement
 * `completeTask` in the UI just to know what to add.
 */
export function useOps(): OpsStore {
  const { user, ready } = useUser()
  const userId = user?.id ?? null

  // Only the LOAD's outcome is stored. "Not signed in" is DERIVED at the bottom
  // rather than stored, so nothing here has to set state to describe a fact the
  // props already carry.
  const [loaded, setLoaded] = useState<'loading' | 'ready' | 'error'>('loading')
  const [data, setData] = useState<OpsData>(EMPTY_OPS_DATA)
  const [now, setNow] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** Bumped by `reload()`; re-runs the effect below without duplicating it. */
  const [attempt, setAttempt] = useState(0)

  // Guards against a response for a previous account landing in this one's
  // state after a sign-out and a sign-in — two people sharing a browser is the
  // case that makes that a real leak rather than a stale render.
  const generation = useRef(0)

  useEffect(() => {
    if (!ready || !userId) return
    const mine = ++generation.current
    let live = true

    const run = async () => {
      try {
        const next = await loadOps(createClient())
        if (!live || generation.current !== mine) return
        setData(next)
        setNow(new Date())
        setLoaded('ready')
      } catch (cause) {
        if (!live || generation.current !== mine) return
        setError(cause instanceof Error ? cause.message : 'Something went wrong.')
        setLoaded('error')
      }
    }

    void run()
    return () => {
      live = false
    }
  }, [ready, userId, attempt])

  const mutate = useCallback(
    async (fn: (ctx: OpsMutationContext) => Promise<void>): Promise<boolean> => {
      if (!userId) return false
      setBusy(true)
      setError(null)
      try {
        const supabase = createClient()
        await fn({ supabase, userId, now: now ?? new Date() })
        // Re-read here rather than bumping `attempt`, so the caller's `await`
        // resolves only once the fresh rows are on screen. A token bump would
        // hand back control while the list was still the old one.
        const next = await loadOps(supabase)
        generation.current += 1
        setData(next)
        setNow(new Date())
        setLoaded('ready')
        return true
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Something went wrong.')
        return false
      } finally {
        setBusy(false)
      }
    },
    [userId, now],
  )

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const dismissError = useCallback(() => setError(null), [])

  const status: OpsStatus = !ready ? 'loading' : userId === null ? 'signed-out' : loaded

  return { status, now, data, error, busy, userId, mutate, reload, dismissError }
}
