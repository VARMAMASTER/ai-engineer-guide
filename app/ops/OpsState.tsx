'use client'

import Link from 'next/link'
import Panel from '@/components/ui/Panel'
import Skeleton from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import type { OpsStatus } from './useOps'

/**
 * What a section shows before — or instead of — its content.
 *
 * Three states, and none of them is a spinner over an empty page. `loading` is
 * the shape of the rows that are coming, so the layout does not jump when they
 * arrive; `error` says what failed and offers the retry; `signed-out` should be
 * unreachable (the proxy redirects everything under `/ops` to sign-in before a
 * render happens) and is handled anyway, because "should be unreachable" is how
 * blank screens get shipped.
 */
export function OpsPending({
  status,
  error,
  onRetry,
  rows = 3,
}: {
  status: OpsStatus
  error: string | null
  onRetry: () => void
  rows?: number
}) {
  if (status === 'error') {
    return (
      <Panel className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-medium">Ops could not load.</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{error ?? 'Something went wrong.'}</p>
        </div>
        <div>
          <Button variant="accent" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </Panel>
    )
  }

  if (status === 'signed-out') {
    return (
      <Panel className="flex flex-col gap-3 p-4">
        <p className="text-sm font-medium">You are signed out.</p>
        <p className="text-sm text-[var(--text-muted)]">
          Ops keeps its tasks in your account, so there is nothing to show until you are signed in.
        </p>
        <div>
          <Link href="/sign-in?next=%2Fops%2Ftoday" className="chip">
            Sign in
          </Link>
        </div>
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-3" aria-busy="true" data-testid="ops-loading">
      {Array.from({ length: rows }, (_, i) => (
        <Panel key={i} className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </Panel>
      ))}
    </div>
  )
}

/**
 * A write that failed, shown where the user was working.
 *
 * Dismissible rather than auto-hiding: the message is the only record that the
 * thing they just did did not happen, and a banner that disappears on its own
 * takes that record with it.
 */
export function OpsErrorBanner({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  if (!error) return null
  return (
    <Panel
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border-[var(--danger)] p-3"
    >
      <p className="min-w-0 text-sm text-[var(--danger)]">{error}</p>
      <Button variant="quiet" onClick={onDismiss}>
        Dismiss
      </Button>
    </Panel>
  )
}
