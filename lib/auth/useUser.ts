'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/db/client'
import { DB_CONFIGURED } from '@/lib/db/env'
import type { CurrentUser } from './user'

export interface UserState {
  user: CurrentUser | null
  /** False until the first answer arrives. Render nothing auth-shaped before it. */
  ready: boolean
}

/**
 * Who is signed in, in the browser.
 *
 * Starts as `{ user: null, ready: false }` on every render, server and client,
 * so there is no hydration mismatch — the session is a cookie the server could
 * read, but making the shell depend on it would turn every page dynamic. The
 * server half of the app uses `getCurrentUser()`; this exists for the bits of
 * chrome that only the browser needs to get right.
 *
 * `getClaims()` again, not `getSession()`: the same reasoning applies on the
 * client, where storage is shared with anything else running on the origin.
 */
export function useUser(): UserState {
  // With no backend there is nothing to wait for, so `ready` starts true and
  // the effect never has to set state to say so. DB_CONFIGURED is a build-time
  // constant, identical on the server and the client, so this cannot cause a
  // hydration mismatch.
  const [state, setState] = useState<UserState>({ user: null, ready: !DB_CONFIGURED })

  useEffect(() => {
    if (!DB_CONFIGURED) return

    let live = true
    const supabase = createClient()

    const read = async () => {
      const { data, error } = await supabase.auth.getClaims()
      if (!live) return
      const claims = error ? null : data?.claims
      const sub = typeof claims?.sub === 'string' ? claims.sub : null
      setState({
        user: sub
          ? { id: sub, email: typeof claims?.email === 'string' ? claims.email : null }
          : null,
        ready: true,
      })
    }

    void read()

    // Covers sign-in and sign-out in ANOTHER tab as well as this one, which is
    // the case a one-shot read gets wrong.
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void read()
    })

    return () => {
      live = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}
