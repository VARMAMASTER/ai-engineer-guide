'use client'

import { usePathname } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import { DIET_SECTIONS } from '../_lib/sections'

/**
 * Level two of the nav, for Diet.
 *
 * The shell's `SectionTabs` renders the sections of whichever app owns the
 * route, and Diet declares none in `lib/nav.ts` — that file is shared with the
 * two apps being built alongside this one, so Diet carries its own strip rather
 * than three agents editing one array. The behaviour is the same: a horizontal
 * strip of links with `aria-current="page"` on the one you are on, built out of
 * the same `Tabs` primitive in its link mode.
 *
 * Unlike the shell's strip this one is rendered at EVERY width. The desktop
 * rail expands the sections of an app that has them, and Diet's are not in the
 * rail's model, so hiding this above 768px would leave the desktop with no way
 * between Diet's four screens at all.
 *
 * A solid fill rather than a panel: on a phone the top bar above is already one
 * blurred layer and the tab bar below is the second, and the blur budget in
 * `globals.css` is two.
 *
 * There is no "Overview" chip. The shell's `Breadcrumb` already renders a
 * "Diet" link on every route one level below `/diet`, which is exactly these
 * four, so a fifth chip would be a second way back sitting an inch from the
 * first.
 */
export default function DietSections() {
  const pathname = usePathname() ?? '/diet'
  const current =
    DIET_SECTIONS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`))?.href ??
    DIET_SECTIONS[0].href

  return (
    <div
      className="-mx-4 mb-6 border-b border-[var(--panel-border)] bg-[var(--panel-solid)] md:-mx-8"
      data-testid="diet-sections-bar"
    >
      <Tabs
        data-testid="diet-sections"
        label="Diet sections"
        value={current}
        items={DIET_SECTIONS.map((s) => ({ id: s.href, href: s.href, label: s.label }))}
      />
    </div>
  )
}
