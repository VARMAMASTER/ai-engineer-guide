import Link from 'next/link'

export const metadata = { title: 'Not found | AI Engineer Practice Guide' }

/**
 * Without this file Next.js falls back to its built-in 404, which ships an
 * inline `body{color:#000;background:#fff}` stylesheet. That rule wins over
 * the Ground token, so an unknown slug repainted the whole app — rail, top bar
 * and all — white in dark mode. Owning the page keeps the theme intact.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col gap-5" data-testid="not-found">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-1">Page not found</h1>
      </div>

      <p className="text-sm text-[var(--text-muted)]">
        That address does not match a pattern, topic, or project in the guide. It may have been
        renamed, or the id may be misspelled.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/today"
          className="btn btn-accent"
        >
          Back to Today
        </Link>
        <Link
          href="/roadmap"
          className="btn btn-quiet"
        >
          Open the roadmap
        </Link>
      </div>
    </div>
  )
}
