'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isActive } from '@/lib/nav'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import { weekNumber } from '@/lib/progress/selectors'
import { todayIso } from '@/lib/date'
import NavIcon from './NavIcon'

const TOTAL_WEEKS = 26

export default function SideNav() {
  const pathname = usePathname() ?? ''
  const hydrated = useHydrated()
  const startDate = useProgress((s) => s.startDate)
  const week = hydrated ? weekNumber(startDate, todayIso()) : null

  return (
    <nav
      data-testid="side-nav"
      aria-label="Sections"
      className="panel panel-flush sticky top-0 hidden h-dvh w-[var(--rail-w)] shrink-0 flex-col rounded-none border-y-0 border-l-0 md:flex"
    >
      <div className="px-5 pt-6 pb-5">
        <p className="eyebrow">180-day program</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-[1.0625rem] leading-tight font-semibold tracking-tight">
          AI Engineer
          <br />
          Practice Guide
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                data-active={active ? 'true' : 'false'}
                className={[
                  'relative flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm transition-colors',
                  active
                    ? 'nav-pill font-medium'
                    : 'text-[var(--text-muted)] hover:bg-[var(--track)] hover:text-[var(--text)]',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'absolute left-0 h-4 w-[2px] rounded-full',
                    active ? 'bg-[var(--accent)]' : 'bg-transparent',
                  ].join(' ')}
                />
                <NavIcon name={item.href} className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="border-t border-[var(--panel-border)] px-5 py-4">
        <p className="readout text-[var(--text-muted)]">
          WEEK <span className="text-[var(--text)]">{week === null ? '··' : String(week).padStart(2, '0')}</span>
          <span className="text-[var(--text-faint)]"> / {TOTAL_WEEKS}</span>
        </p>
        <p className="readout mt-1 text-[var(--text-faint)]">
          {startDate === null || !hydrated ? 'NO START DATE' : `FROM ${startDate}`}
        </p>
      </div>
    </nav>
  )
}
