import { describe, it, expect } from 'vitest'
import { FALLBACK_TIME_ZONE, isValidTimeZone, safeTimeZone, zonedNow } from '@/lib/push/time'
import { localDateOf, localTimeOf } from '@/lib/ops/date'

/**
 * The timezone bug this module exists to prevent, written as tests.
 *
 * A reminder for 18:00 means 18:00 WHERE THE PERSON IS. The sender runs in a
 * UTC region, and `lib/ops`'s rules read a Date's LOCAL fields, so without
 * `zonedNow` every reminder outside UTC would be judged against the wrong hour
 * — five and a half hours out for India, and invisibly, because the code would
 * look correct and the tests would pass in any CI that happened to run in UTC.
 *
 * The assertions go through `localDateOf` / `localTimeOf` — the very functions
 * `dueReminders` calls — rather than through `toISOString`, so what is being
 * checked is exactly what Ops will read. That also makes this file independent
 * of the timezone the test runner itself is in, which is the property a naive
 * version of this test quietly lacks.
 */

describe('zonedNow', () => {
  it('reads back as the subscriber wall clock, not the server one', () => {
    const instant = new Date('2026-09-14T12:30:00.000Z')

    expect(localTimeOf(zonedNow(instant, 'UTC'))).toBe('12:30')
    // +05:30 — the half-hour offset is the case an offset-in-hours shortcut gets wrong.
    expect(localTimeOf(zonedNow(instant, 'Asia/Kolkata'))).toBe('18:00')
    // +05:45, which is the case an offset-in-half-hours shortcut also gets wrong.
    expect(localTimeOf(zonedNow(instant, 'Asia/Kathmandu'))).toBe('18:15')
    expect(localTimeOf(zonedNow(instant, 'America/Los_Angeles'))).toBe('05:30')
  })

  it('rolls the calendar DATE across the international date line, not just the hour', () => {
    // 23:30 UTC is already tomorrow in India and still yesterday in Los Angeles.
    const instant = new Date('2026-09-14T23:30:00.000Z')

    expect(localDateOf(zonedNow(instant, 'UTC'))).toBe('2026-09-14')
    expect(localDateOf(zonedNow(instant, 'Asia/Kolkata'))).toBe('2026-09-15')
    expect(localTimeOf(zonedNow(instant, 'Asia/Kolkata'))).toBe('05:00')
    expect(localDateOf(zonedNow(instant, 'America/Los_Angeles'))).toBe('2026-09-14')
    expect(localTimeOf(zonedNow(instant, 'America/Los_Angeles'))).toBe('16:30')
  })

  it('follows daylight saving rather than a fixed offset', () => {
    // The same zone, six months apart: London is +01:00 in July and +00:00 in
    // January. Anything that stored an offset instead of a zone is wrong for
    // half the year, every year.
    const summer = new Date('2026-07-01T12:00:00.000Z')
    const winter = new Date('2026-01-01T12:00:00.000Z')

    expect(localTimeOf(zonedNow(summer, 'Europe/London'))).toBe('13:00')
    expect(localTimeOf(zonedNow(winter, 'Europe/London'))).toBe('12:00')
  })

  it('renders midnight as hour 00 and not hour 24', () => {
    // `hourCycle: 'h23'` is what guarantees this. Without it some locales
    // report midnight as 24, and `new Date(y, m, d, 24, ...)` rolls silently
    // into the next day — a 00:15 reminder would be evaluated against tomorrow.
    const midnightInKolkata = new Date('2026-09-14T18:30:00.000Z')
    const local = zonedNow(midnightInKolkata, 'Asia/Kolkata')

    expect(localTimeOf(local)).toBe('00:00')
    expect(localDateOf(local)).toBe('2026-09-15')
  })

  it('keeps the seconds, so a grace window is not a minute out', () => {
    const local = zonedNow(new Date('2026-09-14T12:30:45.000Z'), 'UTC')
    expect(local.getSeconds()).toBe(45)
  })

  it('falls back to UTC for a zone this runtime does not know', () => {
    const instant = new Date('2026-09-14T12:30:00.000Z')
    expect(localTimeOf(zonedNow(instant, 'Mars/Olympus_Mons'))).toBe('12:30')
    expect(localTimeOf(zonedNow(instant, ''))).toBe('12:30')
  })
})

describe('safeTimeZone', () => {
  it('passes a real zone through and replaces anything else', () => {
    expect(safeTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata')
    expect(safeTimeZone('Europe/London')).toBe('Europe/London')

    // These arrive from a browser, so they are untrusted input. An unknown zone
    // makes Intl throw, and inside a loop over every subscriber one bad row
    // would take down everybody else's reminders.
    for (const bad of ['', null, undefined, 'not a zone', '../../etc/passwd', 'UTC+5']) {
      expect(safeTimeZone(bad), String(bad)).toBe(FALLBACK_TIME_ZONE)
    }
  })
})

describe('isValidTimeZone', () => {
  it('answers without throwing, whatever it is handed', () => {
    expect(isValidTimeZone('America/New_York')).toBe(true)
    expect(isValidTimeZone('UTC')).toBe(true)
    expect(isValidTimeZone('nonsense')).toBe(false)
  })
})
