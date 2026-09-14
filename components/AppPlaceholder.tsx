import Link from 'next/link'
import EmptyState from './ui/EmptyState'

export interface AppPlaceholderProps {
  /** The app's name — becomes the page's one h1. */
  title: string
  /** One line on what this app is going to be for. */
  summary: string
  /** What is actually planned, in the order it will be built. */
  planned: string[]
}

/**
 * The landing page of an app that has a tab but no features yet.
 *
 * It exists because a tab that leads to a 404 is worse than no tab: the tab
 * bar is a promise about the shape of the system, and this is what keeps the
 * promise honest until the app is built. A plain server component with no
 * client hooks, so the `h1` is in the raw HTML — `tests/e2e/routes.spec.ts`
 * asserts that for every route, with JavaScript switched off.
 */
export default function AppPlaceholder({ title, summary, planned }: AppPlaceholderProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Not built yet</p>
        <h1>{title}</h1>
        <p className="text-sm text-[var(--text-muted)]">{summary}</p>
      </div>

      <div className="panel p-4">
        <EmptyState
          title={`${title} is coming.`}
          description="Nothing here yet — the tab is in place so the rest of the system can be built around it."
          action={
            <Link
              href="/today"
              className="chip"
              // A chip, not a button: this leaves the page.
            >
              Back to Today
            </Link>
          }
        />
      </div>

      <div>
        <p className="eyebrow">Planned</p>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--text-muted)]">
          {planned.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden="true" className="text-[var(--text-faint)]">
                —
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
