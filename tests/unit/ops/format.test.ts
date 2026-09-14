import { describe, expect, it } from 'vitest'
import {
  describeBasis,
  describeOverflow,
  describeRecurrence,
  formatDate,
  formatDateLong,
  formatInstant,
  formatNumber,
  formatOffset,
  formatRelativeDays,
  humanList,
  ordinalDay,
} from '@/app/ops/format'
import { nextOccurrence } from '@/lib/ops/recurrence'
import type { RecurrenceRule } from '@/lib/ops/types'

/**
 * These assert the SENTENCE, because the sentence is the feature.
 *
 * A recurrence rule the user cannot read back is one they cannot trust, so
 * "The third Tuesday of each month" is not decoration around the control — it
 * is the only confirmation the form offers that the app understood the request.
 * The last block goes further and checks the words against
 * `nextOccurrence` itself: a description that drifts from the engine is worse
 * than no description, because it is believed.
 */

describe('ordinalDay', () => {
  it('handles the teens, which every naive version gets wrong', () => {
    expect(ordinalDay(11)).toBe('11th')
    expect(ordinalDay(12)).toBe('12th')
    expect(ordinalDay(13)).toBe('13th')
  })

  it('handles the ordinary cases', () => {
    expect(ordinalDay(1)).toBe('1st')
    expect(ordinalDay(2)).toBe('2nd')
    expect(ordinalDay(3)).toBe('3rd')
    expect(ordinalDay(4)).toBe('4th')
    expect(ordinalDay(21)).toBe('21st')
    expect(ordinalDay(31)).toBe('31st')
  })
})

describe('humanList', () => {
  it('joins with commas and a final "and"', () => {
    expect(humanList([])).toBe('')
    expect(humanList(['Monday'])).toBe('Monday')
    expect(humanList(['Monday', 'Friday'])).toBe('Monday and Friday')
    expect(humanList(['Monday', 'Wednesday', 'Friday'])).toBe('Monday, Wednesday and Friday')
  })
})

describe('dates', () => {
  it('formats without touching the ambient locale or timezone', () => {
    // 2026-10-20 is a Tuesday. Written out rather than derived, so a change to
    // the weekday arithmetic fails here instead of agreeing with itself.
    expect(formatDate('2026-10-20')).toBe('Tue 20 Oct 2026')
    expect(formatDateLong('2026-10-20')).toBe('Tuesday 20 October 2026')
  })

  it('formats a local instant', () => {
    expect(formatInstant('2026-10-20T08:45')).toBe('Tue 20 Oct 2026, 08:45')
  })

  it('says when, relative to today', () => {
    expect(formatRelativeDays(0)).toBe('today')
    expect(formatRelativeDays(1)).toBe('tomorrow')
    expect(formatRelativeDays(-1)).toBe('yesterday')
    expect(formatRelativeDays(5)).toBe('in 5 days')
    expect(formatRelativeDays(-5)).toBe('5 days ago')
  })
})

describe('formatNumber', () => {
  it('does not print a whole number as a decimal', () => {
    expect(formatNumber(2)).toBe('2')
    expect(formatNumber(2.5)).toBe('2.5')
    expect(formatNumber(1 / 3)).toBe('0.33')
  })
})

describe('formatOffset', () => {
  it('says "when it is due" rather than "0 minutes before"', () => {
    expect(formatOffset(0)).toBe('when it is due')
  })

  it('scales to the largest whole unit', () => {
    expect(formatOffset(10)).toBe('10 minutes before')
    expect(formatOffset(60)).toBe('1 hour before')
    expect(formatOffset(120)).toBe('2 hours before')
    expect(formatOffset(1440)).toBe('1 day before')
    expect(formatOffset(2880)).toBe('2 days before')
    expect(formatOffset(90)).toBe('90 minutes before')
  })
})

describe('describeRecurrence', () => {
  it('says every day, however it was asked for', () => {
    expect(describeRecurrence({ type: 'daily', basis: 'schedule' })).toBe('Every day')
    expect(describeRecurrence({ type: 'everyNDays', n: 1, basis: 'schedule' })).toBe('Every day')
    expect(
      describeRecurrence({ type: 'weekly', weekdays: [0, 1, 2, 3, 4, 5, 6], basis: 'schedule' }),
    ).toBe('Every day')
  })

  it('has a word for every other day', () => {
    expect(describeRecurrence({ type: 'everyNDays', n: 2, basis: 'schedule' })).toBe(
      'Every other day',
    )
    expect(describeRecurrence({ type: 'everyNDays', n: 3, basis: 'schedule' })).toBe('Every 3 days')
  })

  it('names the days, or the shorter true phrase for them', () => {
    expect(describeRecurrence({ type: 'weekly', weekdays: [1, 4], basis: 'schedule' })).toBe(
      'Every Monday and Thursday',
    )
    expect(
      describeRecurrence({ type: 'weekly', weekdays: [1, 2, 3, 4, 5], basis: 'schedule' }),
    ).toBe('Every weekday')
    expect(describeRecurrence({ type: 'weekly', weekdays: [0, 6], basis: 'schedule' })).toBe(
      'Every weekend day',
    )
  })

  it('reads a monthly rule the way it would be spoken', () => {
    expect(
      describeRecurrence({
        type: 'monthlyByDayOfMonth',
        day: 1,
        overflow: 'clamp',
        basis: 'schedule',
      }),
    ).toBe('The 1st of each month')
    expect(
      describeRecurrence({
        type: 'monthlyByWeekday',
        ordinal: 3,
        weekday: 2,
        overflow: 'clamp',
        basis: 'schedule',
      }),
    ).toBe('The third Tuesday of each month')
    expect(
      describeRecurrence({
        type: 'monthlyByWeekday',
        ordinal: -1,
        weekday: 5,
        overflow: 'clamp',
        basis: 'schedule',
      }),
    ).toBe('The last Friday of each month')
  })
})

describe('describeOverflow', () => {
  it('says nothing about a day that exists in every month', () => {
    expect(
      describeOverflow({
        type: 'monthlyByDayOfMonth',
        day: 12,
        overflow: 'clamp',
        basis: 'schedule',
      }),
    ).toBeNull()
    expect(describeOverflow({ type: 'daily', basis: 'schedule' })).toBeNull()
  })

  it('explains both policies for a day that does not always exist', () => {
    expect(
      describeOverflow({
        type: 'monthlyByDayOfMonth',
        day: 31,
        overflow: 'clamp',
        basis: 'schedule',
      }),
    ).toBe('A month with no 31st uses its last day instead.')
    expect(
      describeOverflow({
        type: 'monthlyByDayOfMonth',
        day: 31,
        overflow: 'skip',
        basis: 'schedule',
      }),
    ).toBe('A month with no 31st is skipped entirely.')
  })

  it('explains a fifth weekday that some months do not have', () => {
    expect(
      describeOverflow({
        type: 'monthlyByWeekday',
        ordinal: 5,
        weekday: 1,
        overflow: 'clamp',
        basis: 'schedule',
      }),
    ).toBe('A month with only four Mondays uses the fourth instead.')
  })
})

describe('describeBasis', () => {
  it('distinguishes the two bases in the terms a user thinks in', () => {
    expect(describeBasis({ type: 'daily', basis: 'schedule' })).toContain('scheduled date')
    expect(describeBasis({ type: 'daily', basis: 'completion' })).toContain('tick it off')
  })
})

describe('the words agree with the engine', () => {
  /**
   * The failure this exists to catch: a description that says one thing while
   * `nextOccurrence` does another. The rule is the same object in both halves,
   * so the only way these can disagree is if one of them is wrong.
   */
  const thirdTuesday: RecurrenceRule = {
    type: 'monthlyByWeekday',
    ordinal: 3,
    weekday: 2,
    overflow: 'clamp',
    basis: 'schedule',
  }

  it('"The third Tuesday of each month" lands on a third Tuesday', () => {
    expect(describeRecurrence(thirdTuesday)).toBe('The third Tuesday of each month')
    // 2026-10-20 is the third Tuesday of October 2026; the next is 17 Nov.
    expect(nextOccurrence(thirdTuesday, '2026-10-01')).toBe('2026-10-20')
    expect(formatDate(nextOccurrence(thirdTuesday, '2026-10-20'))).toBe('Tue 17 Nov 2026')
  })

  it('"the 31st … uses its last day instead" is what clamping actually does', () => {
    const rule: RecurrenceRule = {
      type: 'monthlyByDayOfMonth',
      day: 31,
      overflow: 'clamp',
      basis: 'schedule',
    }
    expect(describeOverflow(rule)).toBe('A month with no 31st uses its last day instead.')
    expect(nextOccurrence(rule, '2026-01-31')).toBe('2026-02-28')
  })

  it('"skipped entirely" is what skipping actually does', () => {
    const rule: RecurrenceRule = {
      type: 'monthlyByDayOfMonth',
      day: 31,
      overflow: 'skip',
      basis: 'schedule',
    }
    expect(describeOverflow(rule)).toBe('A month with no 31st is skipped entirely.')
    expect(nextOccurrence(rule, '2026-01-31')).toBe('2026-03-31')
  })
})
