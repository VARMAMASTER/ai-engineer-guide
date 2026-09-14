'use client'

import Link from 'next/link'
import { useUser } from '@/lib/auth/useUser'
import { signInUrlFor } from '@/lib/auth/routes'
import { DB_CONFIGURED } from '@/lib/db/env'

/**
 * The part of the Train landing page that depends on who is looking.
 *
 * This exists so the page around it stays STATIC, and that is not a
 * micro-optimisation — it is a bug fix. Reading the session on the server made
 * `/train` the only dynamic destination in the nav, so Next's prefetch of it
 * hit the proxy, took a 307 to sign-in, and aborted. That abort surfaced as a
 * console error, which is what `tests/e2e/routes.spec.ts` fails on: 38 failures
 * in one run and none in the next, depending purely on whether the prefetch
 * landed before the assertion. A flaky suite is worse than a failing one,
 * because it teaches you to re-run instead of to look.
 *
 * Diet already solved this exact problem this exact way. The two apps had
 * diverged on it, which is only visible from outside either app.
 *
 * `useUser` returns `{ user: null, ready: false }` on the server and on the
 * first client render, so nothing auth-shaped paints until the answer is known.
 */
export default function SignedOutNote() {
  const { user, ready } = useUser()

  // Not "no user" — "no answer yet". Rendering this before the session is known
  // would flash a sign-in prompt at somebody already signed in, every load.
  if (!ready || user) return null

  return (
    <div
      className="surface-solid flex flex-col gap-2 rounded-[var(--radius-lg)] p-4"
      data-testid="train-signed-out-note"
    >
      <h2 className="text-base">Your training is yours</h2>
      <p className="text-sm text-[var(--text-muted)]">
        {DB_CONFIGURED
          ? 'Sessions and plans live in your account, so nothing here is visible until you sign in.'
          : 'Accounts are unavailable in this environment, so the training log cannot be opened here.'}
      </p>
      {DB_CONFIGURED ? (
        <p>
          <Link href={signInUrlFor('/train/session')} className="chip" data-testid="train-sign-in">
            Sign in to start
          </Link>
        </p>
      ) : null}
    </div>
  )
}
