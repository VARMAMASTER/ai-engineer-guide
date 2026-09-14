import Link from 'next/link'

/**
 * The frame for sign-in and sign-up.
 *
 * The app's own chrome stands aside here (see `components/useBareChrome.ts`):
 * the five app tabs, the workspace switcher and the study-progress readouts are
 * all wrong on a login screen. The tabs are worse than clutter — tapping Diet
 * goes to `/diet`, whose interior needs a session, which sends you back here.
 *
 * What replaces them is deliberately one link. Installed as a PWA there is no
 * browser back button, so a page with no way out is a trap; that is the same
 * dead end the ancestor trail was added to fix. The learning half of the app
 * needs no account at all, so the way out points there rather than at a
 * marketing page.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col">
      <header className="flex min-h-14 items-center gap-3 px-4 md:px-8">
        <Link
          href="/today"
          className="readout inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--track)] hover:text-[var(--text)]"
          data-testid="auth-back"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
          UNYFIDE
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pb-16 md:px-8">
        {children}
      </main>

      <footer className="px-4 pb-8 md:px-8">
        <p className="hint mx-auto max-w-md">
          The study side — the 180-day plan, DSA, system design and revision —
          needs no account.{' '}
          <Link href="/today" className="underline underline-offset-4">
            Use it without signing in
          </Link>
          . An account is only for your diet, training and task data.
        </p>
      </footer>
    </div>
  )
}
