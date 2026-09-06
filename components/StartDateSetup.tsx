'use client'

import { useProgress } from '@/lib/progress/store'
import { addDays, mostRecentMonday, todayIso } from '@/lib/date'

/**
 * Shown in place of the task list until a start date exists. Day 1 is pinned
 * to a Monday so every later day-number lines up with the weekly template,
 * so the only two choices offered are the most recent Monday and the next one.
 */
export default function StartDateSetup() {
  const setStartDate = useProgress((s) => s.setStartDate)
  const today = todayIso()
  const lastMonday = mostRecentMonday(today)
  const nextMonday = addDays(lastMonday, 7)

  return (
    <div className="panel flex flex-col gap-4 p-5">
      <div>
        <h1>Set your start date</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Day 1 must be a Monday so the weekly rhythm lines up.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setStartDate(lastMonday)}
          className="surface-solid min-h-11 flex-1 px-4 py-2.5 text-left transition-colors hover:bg-[var(--track)]"
        >
          <span className="block text-sm text-[var(--text-muted)]">This week</span>
          <span className="readout text-[var(--text)]">{lastMonday}</span>
        </button>

        <button
          type="button"
          onClick={() => setStartDate(nextMonday)}
          className="surface-solid min-h-11 flex-1 px-4 py-2.5 text-left transition-colors hover:bg-[var(--track)]"
        >
          <span className="block text-sm text-[var(--text-muted)]">Next week</span>
          <span className="readout text-[var(--text)]">{nextMonday}</span>
        </button>
      </div>
    </div>
  )
}
