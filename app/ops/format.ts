/**
 * Turning Ops values into English.
 *
 * This file exists because of one line in the brief: **a recurrence rule
 * nobody can read is a recurrence rule nobody trusts.** A `<select>` set to
 * "monthly by weekday", a number spinner on 3 and another select on Tuesday is
 * a rule the app understands and the user is merely hoping about.
 * `describeRecurrence` is what closes that gap — it says "The third Tuesday of
 * each month" back, in the words a person would have used to ask for it.
 *
 * Every function here is PURE and takes no clock, so it is asserted directly in
 * `tests/unit/ops/format.test.ts`.
 *
 * NO `Intl` AND NO `toLocaleDateString`, deliberately. Both read an ambient
 * locale and an ambient timezone, which differ between the Node process that
 * renders the HTML and the browser that hydrates it — a date formatted that way
 * is a hydration mismatch waiting for a user in a different timezone from the
 * server. The names below are written out instead: the app is English-only
 * today, and this way the server and the client cannot disagree.
 */
import { weekdayOf, yearOf, monthOf, type IsoDate } from '@/lib/ops/date'
import type { RecurrenceRule } from '@/lib/ops/types'

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** 1 -> "first" .. 5 -> "fifth", -1 -> "last". The words a rule is spoken with. */
const ORDINAL_WORDS: Record<number, string> = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  [-1]: 'last',
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS[weekday] ?? 'Sunday'
}

export function shortWeekday(weekday: number): string {
  return weekdayLabel(weekday).slice(0, 3)
}

/**
 * 1 -> "1st", 2 -> "2nd", 11 -> "11th", 21 -> "21st".
 *
 * The teens are the case every naive implementation gets wrong: 11, 12 and 13
 * end in 1, 2 and 3 but take "th", so they are excluded before the last digit
 * is consulted at all.
 */
export function ordinalDay(day: number): string {
  const teens = day % 100
  if (teens >= 11 && teens <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

/** "a, b and c" — an Oxford-comma-free list, because this is British English throughout. */
export function humanList(parts: readonly string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/** "Tue 21 Oct 2026". */
export function formatDate(iso: IsoDate): string {
  const day = Number(iso.slice(8, 10))
  return `${shortWeekday(weekdayOf(iso))} ${day} ${MONTHS[monthOf(iso) - 1].slice(0, 3)} ${yearOf(iso)}`
}

/** "Tuesday 21 October 2026" — for the one date a card is actually about. */
export function formatDateLong(iso: IsoDate): string {
  const day = Number(iso.slice(8, 10))
  return `${weekdayLabel(weekdayOf(iso))} ${day} ${MONTHS[monthOf(iso) - 1]} ${yearOf(iso)}`
}

/** A `YYYY-MM-DDTHH:MM` local instant as "Tue 21 Oct 2026, 08:45". */
export function formatInstant(instant: string): string {
  const [date, time] = instant.split('T')
  return `${formatDate(date)}, ${time}`
}

/** Trims a computed number to something readable: 1.3333 -> "1.33", 2 -> "2". */
export function formatNumber(value: number, places = 2): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Number(value.toFixed(places))
  return String(rounded)
}

/**
 * A reminder offset, spoken the way it was asked for.
 *
 * 0 is "when it is due", not "0 minutes before" — a reminder rule reads as an
 * instruction, and nobody instructs in zeroes.
 */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return 'when it is due'
  if (minutes % 1440 === 0) {
    const days = minutes / 1440
    return `${days} ${days === 1 ? 'day' : 'days'} before`
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} before`
  }
  return `${minutes} minutes before`
}

/**
 * The recurrence rule, in the words it would have been asked for.
 *
 * Weekly is the case with the most room to be smug and the least room to be
 * wrong: all seven days IS "every day", and Monday-to-Friday IS "every
 * weekday", and saying so is clearer than listing five names. Any other
 * combination gets listed, because there is no shorter true sentence.
 */
export function describeRecurrence(rule: RecurrenceRule): string {
  switch (rule.type) {
    case 'daily':
      return 'Every day'
    case 'everyNDays':
      if (rule.n === 1) return 'Every day'
      if (rule.n === 2) return 'Every other day'
      return `Every ${rule.n} days`
    case 'weekly': {
      const days = [...new Set(rule.weekdays)].sort((a, b) => a - b)
      if (days.length === 7) return 'Every day'
      if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return 'Every weekday'
      if (days.length === 2 && days[0] === 0 && days[1] === 6) return 'Every weekend day'
      return `Every ${humanList(days.map(weekdayLabel))}`
    }
    case 'monthlyByDayOfMonth':
      return `The ${ordinalDay(rule.day)} of each month`
    case 'monthlyByWeekday':
      return `The ${ORDINAL_WORDS[rule.ordinal]} ${weekdayLabel(rule.weekday)} of each month`
  }
}

/**
 * What happens in a month that has no such day — or `null` when the question
 * cannot arise.
 *
 * Only shown when it is a real possibility: "the 12th of each month" never
 * overflows, so explaining the overflow policy there is noise that trains the
 * reader to skip the line in the one case it matters. The 29th, 30th and 31st
 * do overflow, and so does a fifth weekday, and those say so.
 */
export function describeOverflow(rule: RecurrenceRule): string | null {
  if (rule.type === 'monthlyByDayOfMonth') {
    if (rule.day <= 28) return null
    const day = ordinalDay(rule.day)
    return rule.overflow === 'clamp'
      ? `A month with no ${day} uses its last day instead.`
      : `A month with no ${day} is skipped entirely.`
  }
  if (rule.type === 'monthlyByWeekday' && rule.ordinal === 5) {
    const day = weekdayLabel(rule.weekday)
    return rule.overflow === 'clamp'
      ? `A month with only four ${day}s uses the fourth instead.`
      : `A month with only four ${day}s is skipped entirely.`
  }
  return null
}

/** Which date the next occurrence is measured from, said plainly. */
export function describeBasis(rule: RecurrenceRule): string {
  return rule.basis === 'completion'
    ? 'Counted from the day you tick it off, so finishing late moves the next one late too.'
    : 'Counted from the scheduled date, so finishing late does not move the next one.'
}

/** "in 12 days" / "tomorrow" / "today" / "3 days ago". */
export function formatRelativeDays(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 0) return `in ${days} days`
  return `${-days} days ago`
}

export const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' } as const
