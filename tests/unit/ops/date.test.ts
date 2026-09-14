import { describe, expect, it } from 'vitest'
import {
  addDays,
  compareDates,
  daysInMonth,
  diffDays,
  localDateOf,
  localTimeOf,
  weekdayName,
  weekdayOf,
} from '@/lib/ops/date'

describe('lib/ops/date', () => {
  it('derives the local calendar date from a real instant using local getters', () => {
    // Constructed with local-time args, so this is "2026-09-14" wherever the
    // test runner's TZ is, not necessarily in UTC.
    const now = new Date(2026, 8, 14, 23, 59)
    expect(localDateOf(now)).toBe('2026-09-14')
  })

  it('derives the local time of day', () => {
    const now = new Date(2026, 8, 14, 9, 5)
    expect(localTimeOf(now)).toBe('09:05')
  })

  it('adds and subtracts days across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('does not drift or skip a day across a DST transition', () => {
    // 2026-03-08 is the US spring-forward date; pure calendar-date maths
    // must not care, because no wall-clock hour ever participates.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2)

    // 2026-11-01 is the US fall-back date.
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2)
  })

  it('compares dates', () => {
    expect(compareDates('2026-01-01', '2026-01-02')).toBe(-1)
    expect(compareDates('2026-01-02', '2026-01-01')).toBe(1)
    expect(compareDates('2026-01-01', '2026-01-01')).toBe(0)
  })

  it('computes the weekday, 0 = Sunday', () => {
    // 2026-09-14 is a Monday.
    expect(weekdayOf('2026-09-14')).toBe(1)
    expect(weekdayName('2026-09-14')).toBe('Monday')
  })

  it('knows February in a non-leap and a leap year', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
  })
})
