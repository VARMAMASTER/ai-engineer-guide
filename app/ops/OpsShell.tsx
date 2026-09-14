import type { ReactNode } from 'react'
import Tabs from '@/components/ui/Tabs'
import { OPS_SECTIONS, opsSection } from './sections'

export interface OpsShellProps {
  /** The section's href — its own entry in `OPS_SECTIONS` supplies the heading and the intro. */
  current: string
  children: ReactNode
}

/**
 * The frame every Ops section renders inside: the heading, the one-line intro,
 * and the section strip.
 *
 * A SERVER component, and that is the point. The interactive half of each
 * section is a Client Component that cannot show anything until it has read the
 * browser's clock and the user's rows, so if the heading lived in there it
 * would arrive with the JavaScript. Here, the `<h1>` is in the first bytes of
 * the response — which is what `tests/e2e/routes.spec.ts` checks for every
 * route with script execution switched off entirely.
 *
 * The strip is a `Tabs` in link mode (every item has an `href`), so it renders
 * as a `<nav>` of links with `aria-current="page"` rather than as ARIA tabs.
 * Sections are separate ROUTES; `role="tab"` on something that navigates
 * announces "tab 2 of 4" for what is plainly a link. It carries no surface of
 * its own either — the top bar and the tab bar are already the two blurred
 * layers the design budget allows, and a third would be the stacked glass that
 * rule exists to prevent.
 */
export default function OpsShell({ current, children }: OpsShellProps) {
  const section = opsSection(current)

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="eyebrow">Ops</p>
        <h1>{section.label}</h1>
        <p className="text-sm text-[var(--text-muted)]">{section.intro}</p>
      </div>

      <div className="-mx-4 border-y border-[var(--panel-border)] md:mx-0 md:rounded-[var(--radius)] md:border">
        <Tabs
          data-testid="ops-sections"
          label="Ops sections"
          value={current}
          items={OPS_SECTIONS.map((item) => ({
            id: item.href,
            href: item.href,
            label: item.label,
          }))}
        />
      </div>

      {children}
    </div>
  )
}
