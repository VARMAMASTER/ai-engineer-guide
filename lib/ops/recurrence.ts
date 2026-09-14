/**
 * Recurrence: the subset of RFC 5545 this app needs, done completely.
 *
 * Supported: daily, every N days, weekly on chosen weekdays, monthly by
 * day-of-month (with a documented, explicit overflow policy for the 29th /
 * 30th / 31st — see `OverflowPolicySchema` in `types.ts`), and monthly by
 * weekday ordinal ("third Tuesday", or "last Friday").
 *
 * `nextOccurrence` always returns a date strictly after `from` — it never
 * returns `from` itself, matching every other cadence in this module. Which
 * date is passed as `from` (the previous due date vs. the completion date)
 * is the schedule/completion decision documented on `RecurrenceRule.basis`
 * and applied by `advanceRecurringTask` in `tasks.ts`.
 *
 * All arithmetic is calendar-only (see `lib/ops/date.ts`), so it cannot
 * drift across a DST transition — there is no wall-clock hour to drift.
 */
import { addDays, compareDates, daysInMonth, makeDate, monthOf, weekdayOf, yearOf, type IsoDate } from './date'
import type { RecurrenceRule } from './types'

export function nextOccurrence(rule: RecurrenceRule, from: IsoDate): IsoDate {
  switch (rule.type) {
    case 'daily':
      return addDays(from, 1)
    case 'everyNDays':
      return addDays(from, rule.n)
    case 'weekly':
      return nextWeekly(rule.weekdays, from)
    case 'monthlyByDayOfMonth':
      return nextMonthlyByDay(rule.day, rule.overflow, from)
    case 'monthlyByWeekday':
      return nextMonthlyByWeekday(rule.ordinal, rule.weekday, rule.overflow, from)
  }
}

/** `nextOccurrence` applied `count` times in sequence, starting after `start`. */
export function occurrenceSeries(rule: RecurrenceRule, start: IsoDate, count: number): IsoDate[] {
  const out: IsoDate[] = []
  let cur = start
  for (let i = 0; i < count; i++) {
    cur = nextOccurrence(rule, cur)
    out.push(cur)
  }
  return out
}

function nextWeekly(weekdays: readonly number[], from: IsoDate): IsoDate {
  const set = new Set(weekdays)
  for (let i = 1; i <= 7; i++) {
    const candidate = addDays(from, i)
    if (set.has(weekdayOf(candidate))) return candidate
  }
  /* istanbul ignore next -- unreachable: schema guarantees weekdays.length >= 1 */
  throw new Error('weekly recurrence requires at least one weekday')
}

/** The target day-of-month for `year`/`month`, or `null` if it doesn't exist and `overflow` is `'skip'`. */
function resolvedDayInMonth(year: number, month1to12: number, day: number, overflow: 'clamp' | 'skip'): number | null {
  const dim = daysInMonth(year, month1to12)
  if (day <= dim) return day
  return overflow === 'clamp' ? dim : null
}

function nextMonthlyByDay(day: number, overflow: 'clamp' | 'skip', from: IsoDate): IsoDate {
  let year = yearOf(from)
  let month = monthOf(from)
  // Bounded guard: a 'skip' policy with day=31 still finds a match within
  // 7 months (Jan/Mar/May/Jul/Aug/Oct/Dec all have 31 days), so 48 is ample.
  for (let guard = 0; guard < 48; guard++) {
    const resolved = resolvedDayInMonth(year, month, day, overflow)
    if (resolved !== null) {
      const candidate = makeDate(year, month, resolved)
      if (compareDates(candidate, from) > 0) return candidate
    }
    ;({ year, month } = incrementMonth(year, month))
  }
  /* istanbul ignore next -- guarded above; not reachable in practice */
  throw new Error('could not resolve next monthly occurrence')
}

function incrementMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

/** All dates in `year`/`month` that fall on `weekday`, in ascending order. */
function weekdayDatesInMonth(year: number, month1to12: number, weekday: number): IsoDate[] {
  const dim = daysInMonth(year, month1to12)
  const out: IsoDate[] = []
  for (let day = 1; day <= dim; day++) {
    const iso = makeDate(year, month1to12, day)
    if (weekdayOf(iso) === weekday) out.push(iso)
  }
  return out
}

function nextMonthlyByWeekday(
  ordinal: 1 | 2 | 3 | 4 | 5 | -1,
  weekday: number,
  overflow: 'clamp' | 'skip',
  from: IsoDate,
): IsoDate {
  let year = yearOf(from)
  let month = monthOf(from)
  for (let guard = 0; guard < 48; guard++) {
    const matches = weekdayDatesInMonth(year, month, weekday)
    const candidate = resolveOrdinal(matches, ordinal, overflow)
    if (candidate !== null && compareDates(candidate, from) > 0) return candidate
    ;({ year, month } = incrementMonth(year, month))
  }
  /* istanbul ignore next -- guarded above; not reachable in practice */
  throw new Error('could not resolve next monthly-by-weekday occurrence')
}

function resolveOrdinal(matches: IsoDate[], ordinal: 1 | 2 | 3 | 4 | 5 | -1, overflow: 'clamp' | 'skip'): IsoDate | null {
  if (matches.length === 0) return null
  if (ordinal === -1) return matches[matches.length - 1]
  const idx = ordinal - 1
  if (idx < matches.length) return matches[idx]
  return overflow === 'clamp' ? matches[matches.length - 1] : null
}
