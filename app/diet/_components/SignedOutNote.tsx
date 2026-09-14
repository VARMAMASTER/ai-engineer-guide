'use client'

import Link from 'next/link'
import { useUser } from '@/lib/auth/useUser'

/**
 * The one line on the Diet landing page that depends on who is looking.
 *
 * It is a client component so that the page around it stays STATIC. `/diet` is
 * public — a permanent tab must not bounce to a login form — and reading the
 * session on the server would make the whole route dynamic and uncacheable for
 * everyone, to render a sentence. `useUser` returns `{ user: null, ready:
 * false }` on the server and on the first client render, so nothing
 * auth-shaped is painted until the answer is actually known.
 */
export default function SignedOutNote() {
  const { user, ready } = useUser()

  // Not "no user" — "no answer yet". Rendering the sign-in prompt here would
  // flash it at somebody who is already signed in, on every single load.
  if (!ready || user) return null

  return (
    <p className="text-sm text-[var(--text-muted)]" data-testid="diet-signed-out-note">
      {/* Neither link benefits from an eager prefetch here — nobody reads
          this sentence and taps in the same instant a background fetch would
          need to beat them by. Left prefetching, the route sweep caught these
          as an aborted request whenever it navigated on before the fetch
          settled: a real race, just not one worth paying bandwidth to avoid. */}
      Your food, weight and targets are private to your account.{' '}
      <Link
        href="/sign-in?next=%2Fdiet%2Flog"
        prefetch={false}
        className="underline underline-offset-4"
      >
        Sign in
      </Link>{' '}
      or{' '}
      <Link href="/sign-up" prefetch={false} className="underline underline-offset-4">
        create an account
      </Link>{' '}
      to start logging.
    </p>
  )
}
