import Link from 'next/link'

export const metadata = { title: 'Offline | AI Engineer Practice Guide' }

/**
 * The service worker's navigation fallback: what a request for a page that was
 * never cached resolves to once the network is gone.
 *
 * It is a plain server component with no client hooks, so it renders its `h1`
 * in the raw HTML — `tests/e2e/routes.spec.ts` asserts that for every route,
 * and this one has to hold up with JS disabled *and* offline, which is the
 * only state it is ever shown in.
 */
export default function Offline() {
  return (
    <div className="flex flex-col gap-5" data-testid="offline">
      <div>
        <p className="eyebrow">No connection</p>
        <h1 className="mt-1">You are offline</h1>
      </div>

      <p className="text-sm text-[var(--text-muted)]">
        This page has not been opened on this device yet, so there is no cached copy to show.
        Everything you have already visited still works — and your progress is stored locally, so
        nothing is lost.
      </p>

      <div className="panel p-4">
        <p className="eyebrow">Try one of these</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          <li>
            <Link href="/today" className="text-[var(--accent)] underline underline-offset-4">
              Today
            </Link>
            <span className="text-[var(--text-muted)]"> — the day&rsquo;s tasks.</span>
          </li>
          <li>
            <Link href="/revise" className="text-[var(--accent)] underline underline-offset-4">
              Revise
            </Link>
            <span className="text-[var(--text-muted)]"> — flashcard decks.</span>
          </li>
          <li>
            <Link
              href="/revise/sheets"
              className="text-[var(--accent)] underline underline-offset-4"
            >
              Cheat sheets
            </Link>
            <span className="text-[var(--text-muted)]"> — the one-page summaries.</span>
          </li>
        </ul>
      </div>

      <p className="text-sm text-[var(--text-muted)]">
        The Feed is the one section that needs a connection; it will fill in again once you are back
        online.
      </p>
    </div>
  )
}
