import { describe, it, expect } from 'vitest'
import { addDays, diffDays, isMonday, mostRecentMonday } from '@/lib/date'

describe('date helpers', () => {
  it('adds days across a month boundary', () => {
    expect(addDays('2026-09-28', 5)).toBe('2026-10-03')
  })

  it('adds days across a year boundary', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('diffs days in both directions', () => {
    expect(diffDays('2026-09-07', '2026-09-14')).toBe(7)
    expect(diffDays('2026-09-14', '2026-09-07')).toBe(-7)
    expect(diffDays('2026-09-07', '2026-09-07')).toBe(0)
  })

  it('is immune to daylight saving shifts', () => {
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31)
    expect(diffDays('2026-10-01', '2026-11-01')).toBe(31)
  })

  it('identifies Mondays', () => {
    expect(isMonday('2026-09-07')).toBe(true)
    expect(isMonday('2026-09-08')).toBe(false)
  })

  it('finds the most recent Monday, returning the date itself when it is a Monday', () => {
    expect(mostRecentMonday('2026-09-07')).toBe('2026-09-07')
    expect(mostRecentMonday('2026-09-11')).toBe('2026-09-07')
    expect(mostRecentMonday('2026-09-13')).toBe('2026-09-07')
  })
})
