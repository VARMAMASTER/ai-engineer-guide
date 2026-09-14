import { describe, it, expect } from 'vitest'
import {
  dateOf,
  dateRange,
  formatSpan,
  minutesBetween,
  minutesOfDay,
  minutesOfTimestamp,
  timeOf,
  trailingDates,
} from '@/lib/diet/time'
import { isoDateSchema, localTimestampSchema, logEntrySchema } from '@/lib/diet/types'

describe('wall-clock helpers', () => {
  it('parses HH:MM and rejects anything else', () => {
    expect(minutesOfDay('00:00')).toBe(0)
    expect(minutesOfDay('12:30')).toBe(750)
    expect(minutesOfDay('23:59')).toBe(1439)
    expect(() => minutesOfDay('24:00')).toThrow()
    expect(() => minutesOfDay('7:00')).toThrow()
    expect(() => minutesOfDay('12:60')).toThrow()
  })

  it('splits a local timestamp', () => {
    expect(dateOf('2026-03-14T17:45')).toBe('2026-03-14')
    expect(timeOf('2026-03-14T17:45')).toBe('17:45')
    expect(minutesOfTimestamp('2026-03-14T17:45')).toBe(1065)
  })

  it('measures across midnight and backwards', () => {
    expect(minutesBetween('2026-03-13T22:00', '2026-03-14T06:00')).toBe(480)
    expect(minutesBetween('2026-03-14T06:00', '2026-03-13T22:00')).toBe(-480)
    expect(minutesBetween('2026-03-14T08:00', '2026-03-14T08:00')).toBe(0)
  })

  it('is unaffected by a daylight-saving shift, by construction', () => {
    // 2026-03-08 (US) and 2026-03-29 (EU) are clock changes. These helpers
    // never build a Date from a local time, so a 23- or 25-hour day is still
    // one calendar date and 13:00 is still 13:00.
    expect(minutesBetween('2026-03-07T20:00', '2026-03-08T12:00')).toBe(960)
    expect(minutesBetween('2026-03-28T20:00', '2026-03-29T12:00')).toBe(960)
    expect(minutesOfTimestamp('2026-03-29T02:30')).toBe(150)
    expect(dateRange('2026-03-28', '2026-03-30')).toEqual([
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
    ])
  })

  it('builds trailing date windows inclusively', () => {
    expect(trailingDates('2026-03-03', 3)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03'])
    expect(trailingDates('2026-03-03', 1)).toEqual(['2026-03-03'])
    expect(trailingDates('2026-03-03', 0)).toEqual([])
    expect(trailingDates('2026-03-01', 2)).toEqual(['2026-02-28', '2026-03-01'])
    expect(dateRange('2026-03-03', '2026-03-01')).toEqual([])
  })

  it('formats spans for display', () => {
    expect(formatSpan(0)).toBe('0 m')
    expect(formatSpan(45)).toBe('45 m')
    expect(formatSpan(480)).toBe('8 h')
    expect(formatSpan(1155)).toBe('19 h 15 m')
    expect(formatSpan(-90)).toBe('-1 h 30 m')
  })
})

describe('schema boundaries', () => {
  it('accepts only real calendar dates', () => {
    expect(isoDateSchema.parse('2026-02-28')).toBe('2026-02-28')
    expect(() => isoDateSchema.parse('2026-02-29')).toThrow()
    expect(() => isoDateSchema.parse('2026-13-01')).toThrow()
    expect(() => isoDateSchema.parse('2026-00-10')).toThrow()
    expect(() => isoDateSchema.parse('14/03/2026')).toThrow()
    // 2028 is a leap year, so this one is real.
    expect(isoDateSchema.parse('2028-02-29')).toBe('2028-02-29')
  })

  it('accepts only wall-clock timestamps, with no zone', () => {
    expect(localTimestampSchema.parse('2026-03-14T17:45')).toBe('2026-03-14T17:45')
    expect(() => localTimestampSchema.parse('2026-03-14T17:45:00Z')).toThrow()
    expect(() => localTimestampSchema.parse('2026-03-14 17:45')).toThrow()
  })

  it('keeps the meal timestamp and the audit timestamp apart', () => {
    const parsed = logEntrySchema.parse({
      id: 'e1',
      name: 'dal',
      kcal: 400,
      proteinG: 22,
      at: '2026-03-13T13:00',
      date: '2026-03-13',
      loggedAt: '2026-03-13T23:05',
    })
    expect(parsed.servings).toBe(1)
    expect(parsed.at).toBe('2026-03-13T13:00')
    expect(parsed.loggedAt).toBe('2026-03-13T23:05')
  })

  it('rejects negative and absurd entry values', () => {
    const base = { id: 'e1', name: 'dal', at: '2026-03-13T13:00', date: '2026-03-13' }
    expect(() => logEntrySchema.parse({ ...base, kcal: -1, proteinG: 0 })).toThrow()
    expect(() => logEntrySchema.parse({ ...base, kcal: 100, proteinG: -1 })).toThrow()
    expect(() => logEntrySchema.parse({ ...base, kcal: 99_999, proteinG: 0 })).toThrow()
    expect(() => logEntrySchema.parse({ ...base, kcal: 100, proteinG: 0, servings: 0 })).toThrow()
  })
})
