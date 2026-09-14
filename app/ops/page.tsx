import type { Metadata } from 'next'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Panel from '@/components/ui/Panel'
import { OPS_SECTIONS } from './sections'

export const metadata: Metadata = {
  title: 'Ops | Unyfide',
}

/**
 * The Ops workspace.
 *
 * Shortcut cards rather than a list or a bare form, per spec section 4.1 — a
 * landing page's job is to say what is in here and get you one tap into it.
 *
 * STATIC AND IMPERSONAL, on purpose. `/ops` is one of the three mini-app
 * landing pages that stay public (`lib/auth/routes.ts`): the tab bar is a
 * permanent promise about the shape of the system, and a tab that bounces to a
 * login form keeps that promise no better than a tab that 404s. It holds no
 * data, so there is nothing here to leak — and because it renders nothing about
 * WHO is looking, the service worker may keep serving it from cache after a
 * sign-out without showing the next person a trace of the last one. Reading the
 * session here would quietly take that property away.
 *
 * Everything the cards link to is behind the session, and the proxy redirects
 * to sign-in carrying the destination, so the way in is the link itself.
 */
export default function OpsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="eyebrow">Mini-app</p>
        <h1>Ops</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Todos, recurring admin and goals — the things that have to happen but belong to no other
          app.
        </p>
      </div>

      <ul className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        {OPS_SECTIONS.map((section) => (
          <li key={section.href} className="min-w-0">
            <Card href={section.href} className="flex h-full min-w-0 flex-col gap-1 p-4">
              <span className="text-sm font-medium">{section.label}</span>
              <span className="text-sm text-[var(--text-muted)]">{section.intro}</span>
            </Card>
          </li>
        ))}
      </ul>

      <Panel className="flex min-w-0 flex-col gap-1 p-4">
        <p className="text-sm font-medium">Your list lives in your account.</p>
        <p className="text-sm text-[var(--text-muted)]">
          Everything inside Ops needs a session, and signing in carries you back to whichever
          section you were heading for.{' '}
          <Link href="/sign-in?next=%2Fops%2Ftoday" className="underline">
            Sign in
          </Link>
          .
        </p>
      </Panel>
    </div>
  )
}
