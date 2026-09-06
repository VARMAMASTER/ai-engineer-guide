'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS, isActive } from '@/lib/nav'
import NavIcon from './NavIcon'

export default function BottomNav() {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const sheetId = useId()

  const inSheet = SECONDARY_NAV_ITEMS.some((i) => isActive(pathname, i.href))

  // Close on navigation, adjusted during render rather than in an effect so the
  // sheet never paints over the page it just navigated to.
  const [openedOn, setOpenedOn] = useState(pathname)
  if (openedOn !== pathname) {
    setOpenedOn(pathname)
    if (open) setOpen(false)
  }

  // While the sheet is up it is the only blurred layer on screen: everything
  // else drops to a solid tint. See the blur budget note in globals.css.
  useEffect(() => {
    const root = document.documentElement
    if (open) root.setAttribute('data-sheet', 'open')
    else root.removeAttribute('data-sheet')
    return () => root.removeAttribute('data-sheet')
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close more sections"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-[var(--ground)]/75 md:hidden"
          />
          <div
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-label="More sections"
            data-testid="more-sheet"
            className="raised fixed inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-50 p-2 md:hidden"
          >
            <ul className="flex flex-col gap-0.5">
              {SECONDARY_NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm',
                        active ? 'nav-pill font-medium' : 'text-[var(--text)]',
                      ].join(' ')}
                    >
                      <NavIcon name={item.href} className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      ) : null}

      <nav
        data-testid="bottom-nav"
        aria-label="Sections"
        className="panel fixed inset-x-0 bottom-0 z-50 flex rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              data-active={active ? 'true' : 'false'}
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2"
            >
              <span
                className={[
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  active ? 'nav-pill' : 'text-[var(--text-muted)]',
                ].join(' ')}
              >
                <NavIcon name={item.href} className="h-[18px] w-[18px]" />
              </span>
              <span
                className={[
                  'readout text-[0.625rem] leading-none',
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                ].join(' ')}
              >
                {item.short}
              </span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={sheetId}
          data-testid="more-tab"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2"
        >
          <span
            className={[
              'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
              open || inSheet ? 'nav-pill' : 'text-[var(--text-muted)]',
            ].join(' ')}
          >
            <NavIcon name="more" className="h-[18px] w-[18px]" />
          </span>
          <span
            className={[
              'readout text-[0.625rem] leading-none',
              open || inSheet ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
            ].join(' ')}
          >
            More
          </span>
        </button>
      </nav>
    </>
  )
}
