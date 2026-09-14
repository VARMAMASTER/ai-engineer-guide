/**
 * Wall-clock helpers for Diet.
 *
 * Everything here works on `YYYY-MM-DD` and `HH:MM` **strings**. No `Date`
 * object is constructed from a local timestamp anywhere in `lib/diet`, which is
 * why a DST shift cannot move a meal in or out of the eating window: 13:00 on
 * the day the clocks change is still 13:00, and the day that is 23 or 25 hours
 * long still contains exactly one calendar date.
 *
 * Date arithmetic is delegated to `lib/date`, a generic utility that does its
 * maths in UTC on the date parts for the same reason.
 */
import { addDays, diffDays } from '@/lib/date'
import type { IsoDate, LocalTime, LocalTimestamp } from './types'

export { addDays, diffDays }

export const MINUTES_PER_DAY = 1440

/** `HH:MM` to minutes past local midnight. Throws on a malformed time. */
export function minutesOfDay(time: LocalTime): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!m) throw new Error(`diet/time: not a HH:MM local time: ${time}`)
  return Number(m[1]) * 60 + Number(m[2])
}

/** The date half of a local timestamp. */
export function dateOf(ts: LocalTimestamp): IsoDate {
  return ts.slice(0, 10)
}

/** The time half of a local timestamp. */
export function timeOf(ts: LocalTimestamp): LocalTime {
  return ts.slice(11, 16)
}

/** Minutes past midnight of a local timestamp's own day. */
export function minutesOfTimestamp(ts: LocalTimestamp): number {
  return minutesOfDay(timeOf(ts))
}

/**
 * Minutes between two local timestamps, counting whole calendar days between
 * their dates. Crossing midnight is therefore ordinary arithmetic rather than
 * a special case, which is what the fasting span needs.
 */
export function minutesBetween(from: LocalTimestamp, to: LocalTimestamp): number {
  const dayGap = diffDays(dateOf(from), dateOf(to))
  return dayGap * MINUTES_PER_DAY + (minutesOfTimestamp(to) - minutesOfTimestamp(from))
}

/** Inclusive list of local dates from `from` to `to`. Empty if `to < from`. */
export function dateRange(from: IsoDate, to: IsoDate): IsoDate[] {
  const n = diffDays(from, to)
  if (n < 0) return []
  const out: IsoDate[] = []
  for (let i = 0; i <= n; i += 1) out.push(addDays(from, i))
  return out
}

/** The last `days` dates ending at and including `asOf`. */
export function trailingDates(asOf: IsoDate, days: number): IsoDate[] {
  if (days <= 0) return []
  return dateRange(addDays(asOf, -(days - 1)), asOf)
}

/** "14 h 20 m", "8 h", "45 m" — for headlines and metric values. */
export function formatSpan(minutes: number): string {
  const sign = minutes < 0 ? '-' : ''
  const abs = Math.abs(Math.round(minutes))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${sign}${m} m`
  if (m === 0) return `${sign}${h} h`
  return `${sign}${h} h ${m} m`
}
