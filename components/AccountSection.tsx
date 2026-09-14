'use client'

import Link from 'next/link'
import { useUser } from '@/lib/auth/useUser'
import { DB_CONFIGURED } from '@/lib/db/env'
import { ACCOUNT_PATH, SIGN_IN_PATH } from '@/lib/auth/routes'

/**
 * The way in and out of an account, from Settings.
 *
 * Settings rather than the top bar, because signing in is not a daily action —
 * the study half never needs it — and because the top bar is already carrying
 * the app switcher, the palette and the theme toggle at 390px.
 *
 * Renders a neutral line until `useUser` has an answer, so nothing flickers
 * between "sign in" and "signed in" on every page load.
 */
export default function AccountSection() {
  const { user, ready } = useUser()

  if (!DB_CONFIGURED) return null

  return (
    <section className="panel flex flex-col gap-3 p-4 md:p-5" data-testid="account-section">
      <h2 className="eyebrow">Account</h2>

      {!ready ? (
        <p className="text-sm text-[var(--text-muted)]">Checking…</p>
      ) : user ? (
        <>
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as{' '}
            <span className="readout text-[var(--text)]">{user.email ?? user.id}</span>. Your
            progress is saved to this account.
          </p>
          <p>
            <Link href={ACCOUNT_PATH} prefetch={false} className="chip" data-testid="account-link">
              Manage account
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--text-muted)]">
            Progress is stored in this browser only. Signing in carries it between devices and
            unlocks Diet, Train and Ops — the study sections keep working either way.
          </p>
          <p>
            {/* Not prefetched: the auth pages are server-rendered on demand,
                so a prefetch is a real request for a page most visitors never
                open — and one still in flight when the tab moves on. */}
            <Link href={SIGN_IN_PATH} prefetch={false} className="chip" data-testid="sign-in-link">
              Sign in or create an account
            </Link>
          </p>
        </>
      )}
    </section>
  )
}
