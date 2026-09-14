import type { Metadata } from 'next'
import Card from '@/components/ui/Card'
import SignedOutNote from './_components/SignedOutNote'
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
 * A server component with no session read, so the route stays STATIC and the
 * `<h1>` is in the raw HTML with JavaScript off — the bar
 * `tests/e2e/routes.spec.ts` holds every route to. The one signed-out line is a
 * client component for the reason given in `_components/SignedOutNote.tsx`:
 * reading the session here made this the only dynamic nav destination, and its
 * prefetch aborted against the proxy's redirect.
 */
export default function TrainPage() {
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
            {/* Every TRAIN_SECTIONS target is behind a session. Next's default
                <Link> prefetches on viewport entry, which chases the proxy's
                redirect to sign-in for a page a signed-out visitor here
                usually hasn't opened yet, and aborts loudly if the sweep
                moves on before it settles. Not prefetching costs nothing —
                the destination was never reachable from here without one. */}
            <Card
              href={section.href}
              prefetch={false}
              className="flex h-full flex-col gap-2 p-4"
            >
              <span className="font-[family-name:var(--font-display)] text-base">{section.label}</span>
              <span className="text-sm text-[var(--text-muted)]">{section.blurb}</span>
            </Card>
          </li>
        ))}
      </ul>
      <SignedOutNote />
    </div>
  )
}
