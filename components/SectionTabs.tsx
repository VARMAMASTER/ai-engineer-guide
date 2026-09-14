'use client'

import { usePathname } from 'next/navigation'
import { appFor, sectionFor } from '@/lib/nav'
import Tabs from './ui/Tabs'

/**
 * Level two of the nav: the sections of whichever app you are in, as one
 * horizontal strip under the top bar.
 *
 * Phone only. Above 768px the rail has the room to show the same sections
 * expanded under their app, and rendering both would give the page two live
 * copies of the same navigation.
 *
 * Nothing is rendered for an app with no sections (Today, Diet, Train, Ops) or
 * for a route outside the tab bar (Settings, the kit, the offline page) — an
 * empty strip is a bar of chrome that says nothing.
 *
 * The strip is SOLID, not glass. The top bar above it is already one blurred
 * layer and the tab bar below it is a second; a third would blow the blur
 * budget in `globals.css`, and a blurred strip sitting directly under a blurred
 * header is exactly the stacked-glass mush that rule exists to prevent.
 */
export default function SectionTabs() {
  const pathname = usePathname() ?? ''
  const app = appFor(pathname)
  if (!app || app.sections.length === 0) return null

  const current = sectionFor(pathname, app) ?? app.sections[0]

  return (
    <div
      className="sticky top-[var(--topbar-h)] z-20 border-b border-[var(--panel-border)] bg-[var(--panel-solid)] md:hidden"
      data-testid="section-tabs-bar"
    >
      <Tabs
        data-testid="section-tabs"
        label={`${app.label} sections`}
        value={current.href}
        items={app.sections.map((section) => ({
          id: section.href,
          href: section.href,
          label: section.label,
        }))}
      />
    </div>
  )
}
