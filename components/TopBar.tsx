'use client'

import Link from 'next/link'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import { dayNumber, streak, weekNumber, weekProgress } from '@/lib/progress/selectors'
import { addDays, todayIso } from '@/lib/date'
import Meter from './Meter'
import ThemeToggle from './ThemeToggle'

const TOTAL_DAYS = 180
const TOTAL_WEEKS = 26
const WEEKLY_HOURS_TARGET = 22.5

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

export default function TopBar() {
  const hydrated = useHydrated()
  const startDate = useProgress((s) => s.startDate)
  const completed = useProgress((s) => s.completed)
  const hours = useProgress((s) => s.hours)

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

  return (
    <header className="panel sticky top-0 z-30 rounded-none border-x-0 border-t-0">
      <div className="flex min-h-[var(--topbar-h)] items-center gap-3 px-4 py-2 md:gap-6 md:px-8">
        <div className="flex min-w-0 items-baseline gap-3 md:gap-5">
          {startDate === null && hydrated ? (
            <Link
              href="/settings"
              className="readout -mx-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-[var(--accent)] underline underline-offset-4 hover:bg-[var(--accent-soft)]"
            >
              SET START DATE
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
            className="tag tag-outline"
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
