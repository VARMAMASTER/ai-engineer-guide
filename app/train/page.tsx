import type { Metadata } from 'next'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { getCurrentUser } from '@/lib/auth/user'
import { signInUrlFor } from '@/lib/auth/routes'
import { DB_CONFIGURED } from '@/lib/db/env'
import { TRAIN_SECTIONS } from './sections'

export const metadata: Metadata = {
  title: 'Train | Unyfide',
}

/**
 * The Train app's landing page — public, by the rule in `lib/auth/routes.ts`.
 *
 * The bottom tab bar is a permanent promise about the shape of the system, so
 * this route renders for everybody. It holds no data: three shortcut cards into
 * the app (the Frappe workspace idea — a way in, not an empty list or a bare
 * form) and, signed out, a way in. The cards are real links whether or not you
 * are signed in; following one signed out lands on sign-in carrying the
 * destination, which is a truthful answer rather than a hidden door.
 *
 * A server component with no client hooks, so the `<h1>` is in the raw HTML
 * with JavaScript off — the bar `tests/e2e/routes.spec.ts` holds every route to.
 */
export default async function TrainPage() {
  const user = await getCurrentUser()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Train</p>
        <h1>Train</h1>
        <p className="text-sm text-[var(--text-muted)]">
          A plan from your goal, your days, your equipment and your injuries — then sets, reps and
          load, and what they add up to. Every number here comes from what you logged here.
        </p>
      </div>

      <ul className="grid gap-3 md:grid-cols-3">
        {TRAIN_SECTIONS.map((section) => (
          <li key={section.href} className="min-w-0">
            <Card href={section.href} className="flex h-full flex-col gap-2 p-4">
              <span className="font-[family-name:var(--font-display)] text-base">{section.label}</span>
              <span className="text-sm text-[var(--text-muted)]">{section.blurb}</span>
            </Card>
          </li>
        ))}
      </ul>

      {!user ? (
        <div className="surface-solid flex flex-col gap-2 rounded-[var(--radius-lg)] p-4">
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
      ) : null}
    </div>
  )
}
