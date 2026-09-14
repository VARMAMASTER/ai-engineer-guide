'use client'

import { usePathname } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import { TRAIN_SECTIONS } from './sections'

/**
 * Level two of the nav, for Train only.
 *
 * Rendered on both breakpoints, unlike the global `SectionTabs` (phone only) —
 * the desktop rail expands sections from `lib/nav.ts`, and Train's are
 * deliberately not in there (see `sections.ts`), so without this a desktop user
 * inside the app would have no way across it.
 *
 * Nothing is rendered on `/train` itself: the landing already lays the three
 * sections out as cards, and a strip above them would say the same thing twice
 * to a signed-out visitor who cannot follow either.
 *
 * Not sticky, and not glass. The top bar above it is already one blurred layer
 * and the phone tab bar below is a second; this sits in the page content on the
 * Ground, which keeps the blur budget at two.
 */
export default function TrainNav() {
  const pathname = usePathname() ?? ''
  if (pathname === '/train') return null

  const current = TRAIN_SECTIONS.find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  )

  return (
    <div className="-mx-4 mb-4 border-b border-[var(--panel-border)] md:-mx-8">
      <Tabs
        data-testid="train-sections"
        label="Train sections"
        value={current?.href ?? TRAIN_SECTIONS[0].href}
        items={TRAIN_SECTIONS.map((section) => ({
          id: section.href,
          href: section.href,
          label: section.label,
        }))}
      />
    </div>
  )
}
