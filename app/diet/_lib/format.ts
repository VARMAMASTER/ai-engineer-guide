/**
 * Display formatting for Diet. Pure, and deliberately locale-independent.
 *
 * `toLocaleString()` is not used anywhere in here. It reads the host's locale,
 * which is the server's on the first render and the browser's on the second, so
 * a number that groups as `1,850` on the client and `1 850` on the server is a
 * hydration mismatch that only appears for users in some countries. The app
 * already solved this once in `lib/diet/summary.ts`; this is the same decision
 * made once more, where the UI can reach it.
 */

/** Thousands separators, without asking the host what a thousand looks like. */
export function kcalText(value: number): string {
  const rounded = Math.round(value)
  const sign = rounded < 0 ? '-' : ''
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** One decimal, the precision a bathroom scale actually has. */
export function kgText(value: number): string {
  return value.toFixed(1)
}

/** A change, with its sign always shown — `+0.4`, `-1.2`, `0.0`. */
export function signedKg(value: number): string {
  const text = Math.abs(value).toFixed(1)
  if (Math.abs(value) < 0.05) return '0.0'
  return `${value > 0 ? '+' : '-'}${text}`
}

/** A 0-1 share as whole percent. `null` stays null — see the note below. */
export function shareText(share: number | null): string | null {
  return share === null ? null : `${Math.round(share * 100)}%`
}

/** `2026-09-14` as `Sun 14 Sep`. Fixed English names, for the reason above. */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${DAY_NAMES[dow]} ${d} ${MONTH_NAMES[m - 1]}`
}

/** `14 Sep` — the compact form, for axis ticks at 390px. */
export function shortDayLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTH_NAMES[m - 1]}`
}

/** The `HH:MM` half of a local timestamp, for a list of meals. */
export function timeLabel(at: string): string {
  return at.slice(11, 16)
}

/**
 * How a day's totals read when the day was not logged.
 *
 * There is one string for this, used everywhere, because the alternative is
 * that one screen says "0 kcal" and another says "not logged" about the same
 * day — and the first of those is the single most consequential lie this app
 * could tell. An unlogged day is invisible, not zero.
 */
export const NOT_LOGGED = 'Not logged'
