'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_APPS, isActive, isAppActive } from '@/lib/nav'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import { weekNumber } from '@/lib/progress/selectors'
import { todayIso } from '@/lib/date'
import NavIcon from './NavIcon'
import { useBareChrome } from './useBareChrome'

const TOTAL_WEEKS = 26

const ROW =
  'relative flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm transition-colors'

function rowClass(active: boolean): string {
  return [
    ROW,
    active
      ? 'nav-pill font-medium'
      : 'text-[var(--text-muted)] hover:bg-[var(--track)] hover:text-[var(--text)]',
  ].join(' ')
}

/** The 2px accent tick that marks the active row. */
function Tick({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'absolute left-0 h-4 w-[2px] rounded-full',
        active ? 'bg-[var(--accent)]' : 'bg-transparent',
      ].join(' ')}
    />
  )
}

/**
 * The desktop rail: the same two-level model the phone shows, with room to
 * open one of the levels.
 *
 * Apps are the top level. The app you are currently in stops being a link and
 * becomes a group heading with its sections listed beneath it — which is also
 * what keeps exactly one `aria-current="page"` in this nav: an expanded Learn
 * would otherwise render `/roadmap` twice, once as the app's landing and once
 * as its first section.
 */
export default function SideNav() {
  // The auth pages render their own minimal header; see useBareChrome.
  const bare = useBareChrome()
  const pathname = usePathname() ?? ''
  const hydrated = useHydrated()
  const startDate = useProgress((s) => s.startDate)
  const week = hydrated ? weekNumber(startDate, todayIso()) : null

  // AFTER every hook. An early return above them would change this
  // component's hook count when you navigate to /sign-in while it is still
  // mounted, which is a rules-of-hooks violation and a crash, not a warning.
  if (bare) return null
  return (
    <nav
      data-testid="side-nav"
      aria-label="Apps"
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
        {NAV_APPS.map((app) => {
          const active = isAppActive(pathname, app)

          if (active && app.sections.length > 0) {
            return (
              <li key={app.id} className="mt-1 first:mt-0">
                <p className="eyebrow flex items-center gap-2 px-3 pt-2 pb-1.5">
                  <NavIcon name={app.id} className="h-[14px] w-[14px] shrink-0" />
                  {app.label}
                </p>
                <ul data-testid="side-nav-sections" className="flex flex-col gap-0.5">
                  {app.sections.map((section) => {
                    const on = isActive(pathname, section.href)
                    return (
                      <li key={section.href}>
                        <Link
                          href={section.href}
                          aria-current={on ? 'page' : undefined}
                          data-active={on ? 'true' : 'false'}
                          className={rowClass(on)}
                        >
                          <Tick active={on} />
                          <NavIcon
                            name={section.href}
                            className="h-[18px] w-[18px] shrink-0"
                          />
                          <span className="truncate">{section.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          }

          return (
            <li key={app.id} className="mt-1 first:mt-0">
              <Link
                href={app.href}
                aria-current={active ? 'page' : undefined}
                data-active={active ? 'true' : 'false'}
                data-app={app.id}
                className={rowClass(active)}
              >
                <Tick active={active} />
                <NavIcon name={app.id} className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{app.label}</span>
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
