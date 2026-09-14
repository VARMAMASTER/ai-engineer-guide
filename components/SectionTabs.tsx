'use client'

import { useEffect, useRef } from 'react'
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
  const box = useRef<HTMLDivElement>(null)
  const app = appFor(pathname)
  const current = app ? (sectionFor(pathname, app) ?? app.sections[0]) : undefined

  /*
   * Bring the section you are actually on into view.
   *
   * Fourteen chips are four times wider than a 390px viewport, so arriving at
   * `/revise/sheets` otherwise shows a strip starting at Roadmap with nothing
   * highlighted — the one piece of information the strip exists to carry is
   * the piece scrolled off the right edge.
   *
   * `scrollLeft` rather than `scrollIntoView()`: the latter is free to scroll
   * every ancestor, and the last thing a page should do on load is jump
   * vertically. This moves the strip and nothing else. It is also a jump
   * rather than a glide, which is what `prefers-reduced-motion` would ask for
   * anyway — `scroll-behavior` is not set on this element.
   */
  useEffect(() => {
    const scroller = box.current?.querySelector<HTMLElement>('[data-testid="section-tabs"] > div')
    const active = scroller?.querySelector<HTMLElement>('a[aria-current="page"]')
    if (!scroller || !active) return
    const centred = active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2
    scroller.scrollLeft = Math.max(0, centred)
  }, [current?.href])

  if (!app || !current || app.sections.length === 0) return null

  return (
    <div
      ref={box}
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
