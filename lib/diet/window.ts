/**
 * Eating window, eating span and fasting span (spec 5.1.1).
 *
 * Three things here are easy to get subtly wrong and are handled explicitly:
 *
 *  1. **The window may cross midnight.** A 20:00-04:00 window is legal, so
 *     nothing may assume `start < end`. Membership is a two-branch test, not a
 *     range comparison.
 *  2. **The fasting span crosses midnight by definition.** It runs from the
 *     previous day's last entry to today's first, so it cannot be computed from
 *     one day's rows — which is why this module takes the whole set and derives
 *     days, rather than taking a day at a time.
 *  3. **An unlogged day breaks the chain rather than extending the fast.** If
 *     yesterday has no entries, today's fast is unknown, not enormous: an
 *     unlogged day is invisible, not a day of not eating. Reporting a 38-hour
 *     fast because someone forgot to log lunch would be a lie with a number
 *     attached.
 *
 * An entry outside the window is marked, never blocked or scolded. The mark is
 * a fact; the judgement is not this module's to make, and window adherence is
 * reported separately from calorie adherence because a late meal inside the
 * calorie target is not a failure.
 */
import { z } from 'zod'
import {
  eatingWindowSchema,
  isoDateSchema,
  logEntrySchema,
  type EatingWindow,
  type IsoDate,
  type LocalTime,
  type LocalTimestamp,
  type LogEntry,
} from './types'
import {
  MINUTES_PER_DAY,
  addDays,
  minutesBetween,
  minutesOfDay,
  minutesOfTimestamp,
  trailingDates,
} from './time'

const entriesSchema = z.array(logEntrySchema)

/**
 * Length of the window in minutes. A window whose start equals its end is
 * treated as an instant (0 minutes), not as the whole day — the latter would
 * silently turn a mis-saved setting into "everything is inside".
 */
export function windowSpanMinutes(window: EatingWindow): number {
  const w = eatingWindowSchema.parse(window)
  const start = minutesOfDay(w.start)
  const end = minutesOfDay(w.end)
  return end >= start ? end - start : MINUTES_PER_DAY - start + end
}

/** Whether a local time of day falls inside the window. Both ends inclusive. */
export function isTimeInWindow(time: LocalTime, window: EatingWindow): boolean {
  const w = eatingWindowSchema.parse(window)
  return minutesInWindow(minutesOfDay(time), w)
}

function minutesInWindow(m: number, w: EatingWindow): boolean {
  const start = minutesOfDay(w.start)
  const end = minutesOfDay(w.end)
  return end >= start ? m >= start && m <= end : m >= start || m <= end
}

export type WindowStatus = 'inside' | 'outside' | 'not-applicable'

/**
 * Where one entry sits relative to the window, judged on the **meal's** time.
 * A disabled window returns `not-applicable`, which is not the same as
 * `inside`: nothing was measured.
 */
export function entryWindowStatus(entry: LogEntry, window: EatingWindow): WindowStatus {
  const e = logEntrySchema.parse(entry)
  const w = eatingWindowSchema.parse(window)
  if (!w.enabled) return 'not-applicable'
  return minutesInWindow(minutesOfTimestamp(e.at), w) ? 'inside' : 'outside'
}

export interface DayWindowSummary {
  date: IsoDate
  logged: boolean
  entryCount: number
  firstEntryAt: LocalTimestamp | null
  lastEntryAt: LocalTimestamp | null
  /** First to last entry, minutes. 0 on a single-entry day; `null` if unlogged. */
  eatingSpanMinutes: number | null
  /** Previous day's last entry to today's first. `null` when unknowable. */
  fastingSpanMinutes: number | null
  /** The entry the fast is measured from, for display. */
  fastingFrom: LocalTimestamp | null
  /** Why there is no fasting span, when there is none. */
  fastingUnknownReason: string | null
  entriesInsideWindow: number
  entriesOutsideWindow: number
  /** `null` on an unlogged day or a disabled window — vacuous, not perfect. */
  allInsideWindow: boolean | null
}

function groupByDate(entries: LogEntry[]): Map<IsoDate, LogEntry[]> {
  const byDate = new Map<IsoDate, LogEntry[]>()
  for (const e of entries) {
    const list = byDate.get(e.date)
    if (list) list.push(e)
    else byDate.set(e.date, [e])
  }
  for (const list of byDate.values()) list.sort((a, b) => a.at.localeCompare(b.at))
  return byDate
}

/**
 * Per-day window facts for the given dates.
 *
 * Entries are ordered by the meal timestamp `at`, never by `loggedAt`: an entry
 * added at 23:00 for a 13:00 lunch is the day's lunch, and treating the row's
 * creation time as the meal time would put every back-dated meal outside the
 * window and inflate every eating span.
 */
export function dailyWindowSummaries(
  entries: LogEntry[],
  dates: IsoDate[],
  window: EatingWindow,
): DayWindowSummary[] {
  const parsed = entriesSchema.parse(entries)
  const w = eatingWindowSchema.parse(window)
  const byDate = groupByDate(parsed)

  return dates.map((raw) => {
    const date = isoDateSchema.parse(raw)
    const today = byDate.get(date) ?? []
    if (today.length === 0) {
      return {
        date,
        logged: false,
        entryCount: 0,
        firstEntryAt: null,
        lastEntryAt: null,
        eatingSpanMinutes: null,
        fastingSpanMinutes: null,
        fastingFrom: null,
        fastingUnknownReason: 'Nothing logged on this day.',
        entriesInsideWindow: 0,
        entriesOutsideWindow: 0,
        allInsideWindow: null,
      }
    }

    const first = today[0]
    const last = today[today.length - 1]
    let inside = 0
    let outside = 0
    if (w.enabled) {
      for (const e of today) {
        if (minutesInWindow(minutesOfTimestamp(e.at), w)) inside += 1
        else outside += 1
      }
    }

    const yesterday = byDate.get(addDays(date, -1)) ?? []
    const prevLast = yesterday.length > 0 ? yesterday[yesterday.length - 1] : null
    const fastingSpanMinutes = prevLast ? minutesBetween(prevLast.at, first.at) : null

    return {
      date,
      logged: true,
      entryCount: today.length,
      firstEntryAt: first.at,
      lastEntryAt: last.at,
      eatingSpanMinutes: minutesBetween(first.at, last.at),
      fastingSpanMinutes,
      fastingFrom: prevLast?.at ?? null,
      fastingUnknownReason: prevLast
        ? null
        : 'The previous day has no entries, so the fast cannot be measured.',
      entriesInsideWindow: inside,
      entriesOutsideWindow: outside,
      allInsideWindow: w.enabled ? outside === 0 : null,
    }
  })
}

export interface WindowAdherence {
  from: IsoDate
  to: IsoDate
  days: number
  daysLogged: number
  /** Logged days on which every entry fell inside the window. */
  daysFullyInside: number
  /**
   * Share of **logged** days fully inside, 0-1, or `null` when nothing was
   * logged or the window is disabled. Never divided by the period length:
   * a week of not logging is not a week of perfect adherence.
   */
  adherence: number | null
  /** Mean eating span over logged days, minutes, or `null`. */
  meanEatingSpanMinutes: number | null
  /** Mean fast over the days where it could be measured, or `null`. */
  meanFastingSpanMinutes: number | null
  /** Days whose fast was unknowable, usually because the day before is blank. */
  daysWithoutFast: number
}

/** Window adherence over the `days` days ending at and including `asOf`. */
export function windowAdherence(
  entries: LogEntry[],
  options: { asOf: IsoDate; days: number; window: EatingWindow },
): WindowAdherence {
  const asOf = isoDateSchema.parse(options.asOf)
  const days = z.number().int().min(1).max(3650).parse(options.days)
  const w = eatingWindowSchema.parse(options.window)

  const dates = trailingDates(asOf, days)
  const summaries = dailyWindowSummaries(entries, dates, w)
  const logged = summaries.filter((s) => s.logged)
  const daysFullyInside = logged.filter((s) => s.allInsideWindow === true).length
  const spans = logged.map((s) => s.eatingSpanMinutes ?? 0)
  const fasts = logged
    .map((s) => s.fastingSpanMinutes)
    .filter((m): m is number => typeof m === 'number')

  return {
    from: addDays(asOf, -(days - 1)),
    to: asOf,
    days,
    daysLogged: logged.length,
    daysFullyInside,
    adherence: logged.length > 0 && w.enabled ? daysFullyInside / logged.length : null,
    meanEatingSpanMinutes:
      spans.length > 0 ? spans.reduce((a, b) => a + b, 0) / spans.length : null,
    meanFastingSpanMinutes:
      fasts.length > 0 ? fasts.reduce((a, b) => a + b, 0) / fasts.length : null,
    daysWithoutFast: logged.length - fasts.length,
  }
}

/** The 7- and 28-day views the spec asks for, plus today's own facts. */
export function dietWindowReport(
  entries: LogEntry[],
  options: { asOf: IsoDate; window: EatingWindow },
): { today: DayWindowSummary; last7: WindowAdherence; last28: WindowAdherence } {
  const asOf = isoDateSchema.parse(options.asOf)
  const w = eatingWindowSchema.parse(options.window)
  return {
    today: dailyWindowSummaries(entries, [asOf], w)[0],
    last7: windowAdherence(entries, { asOf, days: 7, window: w }),
    last28: windowAdherence(entries, { asOf, days: 28, window: w }),
  }
}
