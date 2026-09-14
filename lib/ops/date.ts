/**
 * Local-calendar-date arithmetic for the Ops domain.
 *
 * Deliberately self-contained rather than importing `lib/date.ts`: Ops is a
 * bounded context (see `docs/superpowers/specs/2026-09-14-unified-app-design.md`
 * section 4.2) and must not acquire a dependency on a file another app's work
 * may be touching concurrently. The logic below is intentionally small.
 *
 * The core trick, used throughout: once a real instant (`now: Date`) has been
 * reduced to a plain `YYYY-MM-DD` calendar string via `localDateOf`, every
 * further computation (`addDays`, `nextOccurrence`, ...) treats that string as
 * a pure calendar value anchored at UTC midnight (`Date.UTC`). No wall-clock
 * hour ever participates again, so a DST transition cannot drift the result by
 * an hour or skip a day — there are no hours left in the computation to drift.
 * Only the one conversion from a real instant to a calendar day needs the
 * viewer's actual local timezone (`getFullYear`/`getMonth`/`getDate`, not the
 * UTC getters), because that is the one place "today" is genuinely
 * timezone-dependent.
 */

const MS_PER_DAY = 86_400_000

/** A local calendar date, always `YYYY-MM-DD`. */
export type IsoDate = string

/** A local time-of-day, always `HH:MM` (24-hour). */
export type IsoTime = string

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

function toUtcMs(iso: IsoDate): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtcMs(ms: number): IsoDate {
  const dt = new Date(ms)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * The caller's local calendar date, derived from a real instant.
 *
 * This is the ONLY function in the Ops domain that may be handed a live
 * clock reading (`new Date()`) by its caller — and even then, it never reads
 * the clock itself. Every other function in `lib/ops/**` takes `now` as a
 * parameter, per the spec's "never read the clock inside a pure function"
 * rule, so date logic stays testable.
 */
export function localDateOf(now: Date): IsoDate {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** The caller's local time-of-day, `HH:MM`, from a real instant. */
export function localTimeOf(now: Date): IsoTime {
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export function addDays(iso: IsoDate, n: number): IsoDate {
  return fromUtcMs(toUtcMs(iso) + n * MS_PER_DAY)
}

/** `to - from`, in whole days. Negative when `to` is earlier. */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY)
}

/** -1 / 0 / 1, ordinary string-safe date comparison. */
export function compareDates(a: IsoDate, b: IsoDate): -1 | 0 | 1 {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** 0 = Sunday .. 6 = Saturday, matching `Date#getUTCDay`. */
export function weekdayOf(iso: IsoDate): number {
  return new Date(toUtcMs(iso)).getUTCDay()
}

export function weekdayName(iso: IsoDate): string {
  return WEEKDAY_NAMES[weekdayOf(iso)]
}

/** Number of days in `year`/`month1to12`, leap years included. */
export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
}

export function yearOf(iso: IsoDate): number {
  return Number(iso.slice(0, 4))
}

export function monthOf(iso: IsoDate): number {
  return Number(iso.slice(5, 7))
}

export function makeDate(year: number, month1to12: number, day: number): IsoDate {
  const m = String(month1to12).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** Combine a local date and optional time into a sortable `YYYY-MM-DDTHH:MM` key. */
export function dateTimeKey(date: IsoDate, time?: IsoTime): string {
  return `${date}T${time ?? '00:00'}`
}
