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
