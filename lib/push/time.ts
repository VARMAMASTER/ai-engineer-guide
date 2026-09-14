/**
 * The subscriber's wall clock, on a server that has no idea where they are.
 *
 * THE PROBLEM. `lib/ops/**` works entirely in LOCAL calendar dates and local
 * `HH:MM` times, on purpose (`lib/ops/date.ts` explains why: once an instant is
 * reduced to `YYYY-MM-DD` in the viewer's zone, no wall-clock hour participates
 * again, so a DST transition cannot drift a due date). `dueReminders` therefore
 * reads `now.getFullYear()`, `now.getHours()` and friends — the LOCAL getters.
 * In a browser those return the user's own clock, which is exactly right.
 *
 * In the cron sender they return the clock of whatever Vercel region the
 * function woke up in, which is UTC. A task due at 18:00 for someone in
 * Asia/Kolkata would then be judged against 18:00 UTC and fire five and a half
 * hours late, every day, invisibly.
 *
 * THE FIX, and why it looks strange. `zonedNow` builds a `Date` whose LOCAL
 * FIELDS read back as the subscriber's wall clock. The instant it represents is
 * meaningless — it is not the same moment in time — and that is the point: it
 * is a carrier for six numbers, handed to functions that only ever ask for
 * those six numbers. `lib/ops/reminders.ts` is used completely unmodified as a
 * result, which is the whole reason for doing it this way rather than
 * reimplementing the rules with a zone parameter: there is then exactly one
 * definition of "which reminders are due", and the browser and the sender run
 * the same one.
 *
 * The conversion goes through `Intl`, which owns the IANA database, rather than
 * through an offset table. Offsets are not constant — India is +05:30, Nepal is
 * +05:45, and half the world moves twice a year — so any arithmetic on a stored
 * offset is wrong for part of the year by construction.
 */

/** The zone used when a subscription's own is missing or unrecognised. */
export const FALLBACK_TIME_ZONE = 'UTC'

/**
 * Whether the runtime's ICU data knows this zone.
 *
 * Worth checking rather than trusting: the value arrives from a browser, so it
 * is untrusted input, and an unknown zone makes `Intl.DateTimeFormat` throw a
 * `RangeError` — inside a loop over every subscriber, that is one bad row
 * stopping the entire nightly send.
 */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/** The given zone if the runtime knows it, otherwise UTC. Never throws. */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return FALLBACK_TIME_ZONE
  return isValidTimeZone(timeZone) ? timeZone : FALLBACK_TIME_ZONE
}

const PART_KEYS = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const

/**
 * A `Date` whose LOCAL fields are `instant`'s wall clock in `timeZone`.
 *
 * Read the module comment before using this anywhere else: the returned value
 * is NOT the same point in time as `instant`, and comparing it to another
 * instant, storing it, or serialising it would all be wrong. It exists to be
 * handed to `lib/ops`'s pure date functions, which read nothing but its local
 * year/month/day/hour/minute.
 *
 * `hourCycle: 'h23'` is not optional: the default for some locales renders
 * midnight as hour 24, and `new Date(y, m, d, 24, 0)` silently rolls into the
 * next day — a reminder set for 00:15 would then be evaluated against tomorrow.
 */
export function zonedNow(instant: Date, timeZone: string): Date {
  const zone = safeTimeZone(timeZone)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  const found = new Map(parts.map((part) => [part.type, part.value]))
  const values = PART_KEYS.map((key) => {
    const raw = found.get(key)
    if (raw === undefined) throw new Error(`Intl did not report ${key} for ${zone}`)
    return Number(raw)
  })

  const [year, month, day, hour, minute, second] = values
  const local = new Date(year, month - 1, day, hour, minute, second, 0)
  // Years 0-99 are mapped into 1900-1999 by the Date constructor. Not reachable
  // from a real clock, but it is one line to make the function total.
  if (year < 100) local.setFullYear(year)
  return local
}
