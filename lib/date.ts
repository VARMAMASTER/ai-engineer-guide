const MS_PER_DAY = 86_400_000

function toUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtc(ms: number): string {
  const dt = new Date(ms)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local calendar date, so "today" matches the user's own calendar. */
export function todayIso(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, n: number): string {
  return fromUtc(toUtc(iso) + n * MS_PER_DAY)
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY)
}

export function isMonday(iso: string): boolean {
  return new Date(toUtc(iso)).getUTCDay() === 1
}

export function mostRecentMonday(iso: string): string {
  const dow = new Date(toUtc(iso)).getUTCDay()
  const back = (dow + 6) % 7
  return addDays(iso, -back)
}

const MINUTE = 60_000
const HOUR = 3_600_000

/**
 * Short relative age for a feed timestamp: `just now`, `12m ago`, `3h ago`,
 * `2d ago`, `3w ago`, and the plain calendar date beyond a month.
 *
 * Accepts either a full ISO instant or a bare `YYYY-MM-DD` (which `Date.parse`
 * reads as UTC midnight), because arXiv and Algolia are only read at day
 * resolution. A future timestamp — clock skew, or a publisher post-dating a
 * story — clamps to `just now` rather than rendering "-3h ago". Unparseable
 * input is returned verbatim so a bad date never blanks the readout.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return iso
  const ms = now.getTime() - then
  if (ms < MINUTE) return 'just now'
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m ago`
  if (ms < 24 * HOUR) return `${Math.floor(ms / HOUR)}h ago`
  const days = Math.floor(ms / MS_PER_DAY)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return iso.slice(0, 10)
}
