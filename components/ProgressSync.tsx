'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/db/client'
import { useUser } from '@/lib/auth/useUser'
import { useProgress, STORAGE_KEY } from '@/lib/progress/store'
import { safeGet, safeSet } from '@/lib/progress/storage'
import { diffBlobs, isEmptyDelta, readLocalBlob } from '@/lib/progress/remote'
import { BACKUP_KEY, applyDelta, importLocalIntoAccount } from '@/lib/progress/sync'
import type { ProgressBlob } from '@/lib/progress/types'

/**
 * Keeps the 180-day record and the account in step. Renders nothing.
 *
 * Signed out it does NOTHING AT ALL — no client, no request, no listener beyond
 * the one that notices a sign-in. That is the property that keeps the learning
 * half exactly as it was: it worked with no backend for six months and it still
 * does, for anyone who never signs in.
 *
 * Signed in, two jobs:
 *
 *  1. Once per account, fold this browser's localStorage copy into it. The
 *     untouched pre-import blob is parked under its own key first, so the
 *     import is reversible by hand even if everything else goes wrong.
 *  2. After that, push each change through as it happens, as a delta. Writes
 *     are online-first (spec section 3); a failed push leaves localStorage
 *     correct and is retried the next time anything changes. The queued
 *     offline replay the spec describes is a later stage — until then the
 *     account can lag, but the device never loses.
 */
export default function ProgressSync() {
  const { user, ready } = useUser()
  const userId = user?.id ?? null

  /** The last blob known to be on the server, so a delta has something to be from. */
  const pushedRef = useRef<ProgressBlob | null>(null)
  const importedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!ready || !userId) {
      pushedRef.current = null
      importedForRef.current = null
      return
    }
    if (importedForRef.current === userId) return
    importedForRef.current = userId

    let live = true
    const supabase = createClient()

    const run = async () => {
      const raw = safeGet(STORAGE_KEY)
      const local = readLocalBlob(raw)

      // Park the pre-import copy BEFORE touching the server, and never
      // overwrite an existing backup — the oldest one is the valuable one.
      if (raw && safeGet(BACKUP_KEY) === null) safeSet(BACKUP_KEY, raw)

      try {
        const account = await importLocalIntoAccount(supabase, userId, local)
        if (!live) return
        // Only now is local replaced, with a blob that is a superset of it.
        pushedRef.current = account.blob
        useProgress.setState(account.blob)
      } catch (error) {
        if (!live) return
        // Leave localStorage exactly as it was and try again on the next
        // sign-in. Warn rather than error: this is a degraded sync, not a
        // broken page, and the study half carries on working offline.
        importedForRef.current = null
        console.warn('[progress] could not sync with the account:', error)
      }
    }

    void run()
    return () => {
      live = false
    }
  }, [ready, userId])

  // Write-through. Subscribes rather than reading through a selector so that a
  // render is never triggered by a sync.
  useEffect(() => {
    if (!ready || !userId) return

    let live = true
    let timer: ReturnType<typeof setTimeout> | null = null
    const supabase = createClient()

    const flush = async () => {
      const from = pushedRef.current
      if (!from) return
      const to = snapshot(useProgress.getState())
      const delta = diffBlobs(from, to)
      if (isEmptyDelta(delta)) return
      try {
        await applyDelta(supabase, userId, delta)
        if (live) pushedRef.current = to
      } catch (error) {
        console.warn('[progress] could not save to the account:', error)
      }
    }

    const unsubscribe = useProgress.subscribe(() => {
      if (!pushedRef.current) return
      if (timer) clearTimeout(timer)
      // Ticking three boxes in a row is one write, not three.
      timer = setTimeout(() => void flush(), 600)
    })

    return () => {
      live = false
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [ready, userId])

  return null
}

/** The persisted half of the store, without its actions. */
function snapshot(state: ReturnType<typeof useProgress.getState>): ProgressBlob {
  return {
    version: state.version,
    startDate: state.startDate,
    completed: state.completed,
    revision: state.revision,
    hours: state.hours,
    settings: state.settings,
  }
}
