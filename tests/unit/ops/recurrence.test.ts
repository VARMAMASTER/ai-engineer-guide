import { describe, expect, it } from 'vitest'
import { nextOccurrence, occurrenceSeries } from '@/lib/ops/recurrence'
import type { RecurrenceRule } from '@/lib/ops/types'

describe('lib/ops/recurrence', () => {
  it('daily: always the next calendar day', () => {
    const rule: RecurrenceRule = { type: 'daily', basis: 'schedule' }
    expect(nextOccurrence(rule, '2026-09-14')).toBe('2026-09-15')
  })

  it('everyNDays: N days after the anchor', () => {
    const rule: RecurrenceRule = { type: 'everyNDays', n: 3, basis: 'completion' }
    expect(nextOccurrence(rule, '2026-09-14')).toBe('2026-09-17')
  })

  it('weekly: hand-written sequence of Mon/Wed/Fri from a Monday', () => {
    const rule: RecurrenceRule = { type: 'weekly', weekdays: [1, 3, 5], basis: 'schedule' }
    // 2026-09-14 is a Monday.
    expect(occurrenceSeries(rule, '2026-09-14', 5)).toEqual([
      '2026-09-16', // Wed
      '2026-09-18', // Fri
      '2026-09-21', // Mon
      '2026-09-23', // Wed
      '2026-09-25', // Fri
    ])
  })

  it('weekly recurrence does not drift or skip a day across the DST transition', () => {
    const rule: RecurrenceRule = { type: 'weekly', weekdays: [0], basis: 'schedule' } // Sundays
    // 2026-03-08 is the US spring-forward date and is itself a Sunday.
    expect(occurrenceSeries(rule, '2026-03-01', 2)).toEqual(['2026-03-08', '2026-03-15'])
  })

  describe('monthlyByDayOfMonth', () => {
    it('the 31st, clamp policy: clamps to the last day of a shorter month (documented default)', () => {
      const rule: RecurrenceRule = { type: 'monthlyByDayOfMonth', day: 31, overflow: 'clamp', basis: 'schedule' }
      // "The 31st" in February means the last day of February.
      expect(nextOccurrence(rule, '2026-01-31')).toBe('2026-02-28')
    })

    it('the 31st, clamp policy: a hand-written 4-occurrence sequence through Feb/Apr', () => {
      const rule: RecurrenceRule = { type: 'monthlyByDayOfMonth', day: 31, overflow: 'clamp', basis: 'schedule' }
      expect(occurrenceSeries(rule, '2026-01-31', 4)).toEqual([
        '2026-02-28', // February clamps to its last day
        '2026-03-31', // March has 31 days again
        '2026-04-30', // April clamps to its last day
        '2026-05-31',
      ])
    })

    it('the 31st, skip policy: February is skipped entirely', () => {
      const rule: RecurrenceRule = { type: 'monthlyByDayOfMonth', day: 31, overflow: 'skip', basis: 'schedule' }
      expect(nextOccurrence(rule, '2026-01-31')).toBe('2026-03-31')
    })

    it('the 29th in a non-leap February clamps to the 28th', () => {
      const rule: RecurrenceRule = { type: 'monthlyByDayOfMonth', day: 29, overflow: 'clamp', basis: 'schedule' }
      expect(nextOccurrence(rule, '2026-01-29')).toBe('2026-02-28')
    })

    it('the 29th in a leap February lands on the 29th', () => {
      const rule: RecurrenceRule = { type: 'monthlyByDayOfMonth', day: 29, overflow: 'clamp', basis: 'schedule' }
      expect(nextOccurrence(rule, '2028-01-29')).toBe('2028-02-29')
    })
  })

  describe('monthlyByWeekday', () => {
    it('third Tuesday: correct even in a month that has five Tuesdays', () => {
      const rule: RecurrenceRule = { type: 'monthlyByWeekday', ordinal: 3, weekday: 2, overflow: 'clamp', basis: 'schedule' }
      // March 2026 has Tuesdays on the 3rd, 10th, 17th, 24th and 31st — five
      // of them. The third must be the 17th, not the 24th or the 31st.
      expect(nextOccurrence(rule, '2026-02-18')).toBe('2026-03-17')
    })

    it('last Tuesday of a five-Tuesday month', () => {
      const rule: RecurrenceRule = { type: 'monthlyByWeekday', ordinal: -1, weekday: 2, overflow: 'clamp', basis: 'schedule' }
      expect(nextOccurrence(rule, '2026-03-01')).toBe('2026-03-31')
    })

    it('5th Tuesday, clamp policy: falls back to the last Tuesday when April only has four', () => {
      const rule: RecurrenceRule = { type: 'monthlyByWeekday', ordinal: 5, weekday: 2, overflow: 'clamp', basis: 'schedule' }
      expect(nextOccurrence(rule, '2026-04-01')).toBe('2026-04-28')
    })

    it('5th Tuesday, skip policy: skips April and May (four each) to June (five)', () => {
      const rule: RecurrenceRule = { type: 'monthlyByWeekday', ordinal: 5, weekday: 2, overflow: 'skip', basis: 'schedule' }
      expect(nextOccurrence(rule, '2026-04-01')).toBe('2026-06-30')
    })
  })
})
