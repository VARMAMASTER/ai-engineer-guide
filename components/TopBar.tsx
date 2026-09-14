'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import { dayNumber, streak, weekNumber, weekProgress } from '@/lib/progress/selectors'
import { addDays, todayIso } from '@/lib/date'
import { SETTINGS_ITEM, isActive } from '@/lib/nav'
import { useUser } from '@/lib/auth/useUser'
import { ACCOUNT_PATH } from '@/lib/auth/routes'
import { DB_CONFIGURED } from '@/lib/db/env'
import AppSwitcher from './AppSwitcher'
import Meter from './Meter'
import NavIcon from './NavIcon'
import ThemeToggle from './ThemeToggle'
import { useBareChrome } from './useBareChrome'

const TOTAL_DAYS = 180
const TOTAL_WEEKS = 26
const WEEKLY_HOURS_TARGET = 22.5

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

export default function TopBar() {
  // The auth pages render their own minimal header; see useBareChrome.
  const bare = useBareChrome()
  const pathname = usePathname() ?? ''
  const hydrated = useHydrated()
  const startDate = useProgress((s) => s.startDate)
  const completed = useProgress((s) => s.completed)
  const hours = useProgress((s) => s.hours)
  const { user } = useUser()

  const today = todayIso()
  const day = hydrated ? dayNumber(startDate, today) : null
  const week = hydrated ? weekNumber(startDate, today) : null
  const days = hydrated ? streak(completed, today) : 0

  // Hours this week: the user's own entries if they made any, otherwise the
  // minutes implied by what they have ticked off in the current week's plan.
  let hoursDone = 0
  if (hydrated && startDate && week !== null) {
    const weekStart = addDays(startDate, (week - 1) * 7)
    let logged = 0
    let anyLogged = false
    for (let i = 0; i < 7; i += 1) {
      const entry = hours[addDays(weekStart, i)]
      if (typeof entry === 'number') {
        logged += entry
        anyLogged = true
      }
    }
    hoursDone = anyLogged
      ? Math.round(logged * 10) / 10
      : Math.round((weekProgress(week, completed).completedTotal / 60) * 10) / 10
  }

  const railPct = day === null ? 0 : Math.min(100, (day / TOTAL_DAYS) * 100)

  // AFTER every hook. An early return above them would change this
  // component's hook count when you navigate to /sign-in while it is still
  // mounted, which is a rules-of-hooks violation and a crash, not a warning.
  if (bare) return null
  return (
    <header className="panel sticky top-0 z-30 rounded-none border-x-0 border-t-0">
      <div className="flex min-h-[var(--topbar-h)] items-center gap-2 px-3 py-2 md:gap-6 md:px-8">
        {/* The way out of wherever you are. First control in the bar, at every
            width: installed as a PWA there is no browser back button behind it,
            so this is the only one. */}
        <AppSwitcher />

        <div className="flex min-w-0 items-baseline gap-3 md:gap-5">
          {startDate === null && hydrated ? (
            <Link
              href="/settings"
              className="readout -mx-2 inline-flex min-h-11 items-center whitespace-nowrap rounded-[var(--radius-sm)] px-2 text-[var(--accent)] underline underline-offset-4 hover:bg-[var(--accent-soft)]"
            >
              {/* Two spellings, because the bar has one control more than it
                  used to. Adding the app switcher pushed the contents to ~438px
                  inside a 390px bar, and this link was the piece that lost:
                  118px of text in a 102px box, wrapping onto a second line and
                  making the whole bar look broken. `whitespace-nowrap` keeps it
                  on one line; the short spelling is what makes that fit. */}
              <span className="md:hidden">SET DATE</span>
              <span className="hidden md:inline">SET START DATE</span>
            </Link>
          ) : (
            <span className="readout whitespace-nowrap text-[var(--text-muted)]">
              DAY{' '}
              <span className="text-base font-medium text-[var(--text)]">
                {day === null ? '···' : pad(day, 3)}
              </span>
              <span className="text-[var(--text-faint)]"> / {TOTAL_DAYS}</span>
            </span>
          )}

          <span className="readout hidden whitespace-nowrap text-[var(--text-muted)] md:inline">
            WEEK{' '}
            <span className="text-[var(--text)]">{week === null ? '··' : pad(week, 2)}</span>
            <span className="text-[var(--text-faint)]"> / {TOTAL_WEEKS}</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3 md:gap-5">
          <span
            className="tag tag-outline hidden md:inline-flex"
            title="Consecutive days with at least one completed item"
          >
            <span className="hidden md:inline">STREAK</span>
            <span className={days > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]'}>
              {pad(days, 2)}d
            </span>
          </span>

          <div className="hidden w-52 md:block">
            <Meter label="Hours this week" done={hoursDone} target={WEEKLY_HOURS_TARGET} />
          </div>

          {/* The one visible confirmation that signing in did something.
              Settings already carries the full account section (email,
              export, sign out, delete) — that placement was deliberate, so a
              daily study visitor never sees anything account-shaped. But
              "buried in Settings" reads as "not there at all" once you HAVE
              signed in and are looking for it, which is exactly what was
              reported: a real gap, not over-caution to walk back. So it also
              gets one permanent, always-visible icon here, at every width,
              conditioned on nothing but actually being signed in — a
              signed-out visitor (the study half, most of this app's traffic)
              sees no change whatsoever. */}
          {DB_CONFIGURED && user ? (
            <Link
              href={ACCOUNT_PATH}
              aria-label="Account"
              aria-current={isActive(pathname, ACCOUNT_PATH) ? 'page' : undefined}
              prefetch={false}
              data-testid="account-nav-link"
              className={[
                'flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] border border-transparent transition-colors',
                'hover:border-[var(--panel-border)] hover:bg-[var(--track)] hover:text-[var(--text)]',
                isActive(pathname, ACCOUNT_PATH) ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
              ].join(' ')}
            >
              <NavIcon name="/account" className="h-[18px] w-[18px]" />
            </Link>
          ) : null}

          {/* Settings belongs to the whole system rather than to any one app,
              so it hangs off the top bar instead of taking a tab-bar slot. */}
          <Link
            href={SETTINGS_ITEM.href}
            aria-label={SETTINGS_ITEM.label}
            aria-current={isActive(pathname, SETTINGS_ITEM.href) ? 'page' : undefined}
            data-testid="settings-link"
            className={[
              'flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] border border-transparent transition-colors',
              'hover:border-[var(--panel-border)] hover:bg-[var(--track)] hover:text-[var(--text)]',
              isActive(pathname, SETTINGS_ITEM.href)
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)]',
            ].join(' ')}
          >
            <NavIcon name={SETTINGS_ITEM.href} className="h-[18px] w-[18px]" />
          </Link>

          <ThemeToggle />
        </div>
      </div>

      {/* The program rail: 180 days, always in view. The one progress device
          that follows you across every page. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--track)]"
        aria-hidden="true"
      >
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-200 ease-out"
          style={{ width: `${railPct}%` }}
        />
      </div>
    </header>
  )
}
