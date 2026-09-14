import { describe, it, expect } from 'vitest'
import {
  dailyWindowSummaries,
  dietWindowReport,
  entryWindowStatus,
  isTimeInWindow,
  windowAdherence,
  windowSpanMinutes,
} from '@/lib/diet/window'
import { DEFAULT_EATING_WINDOW, type EatingWindow } from '@/lib/diet/types'
import { formatSpan } from '@/lib/diet/time'
import { WINDOW, entry } from './fixtures'

const OVERNIGHT: EatingWindow = { start: '20:00', end: '04:00', enabled: true }

describe('window membership', () => {
  it('defaults to the owner’s 12:00-18:00', () => {
    expect(DEFAULT_EATING_WINDOW).toEqual({ start: '12:00', end: '18:00', enabled: true })
  })

  it('treats both endpoints as inside', () => {
    expect(isTimeInWindow('12:00', WINDOW)).toBe(true)
    expect(isTimeInWindow('18:00', WINDOW)).toBe(true)
    expect(isTimeInWindow('11:59', WINDOW)).toBe(false)
    expect(isTimeInWindow('18:01', WINDOW)).toBe(false)
  })

  it('handles a window that crosses midnight', () => {
    expect(isTimeInWindow('20:00', OVERNIGHT)).toBe(true)
    expect(isTimeInWindow('23:59', OVERNIGHT)).toBe(true)
    expect(isTimeInWindow('00:00', OVERNIGHT)).toBe(true)
    expect(isTimeInWindow('04:00', OVERNIGHT)).toBe(true)
    expect(isTimeInWindow('04:01', OVERNIGHT)).toBe(false)
    expect(isTimeInWindow('12:00', OVERNIGHT)).toBe(false)
    expect(windowSpanMinutes(OVERNIGHT)).toBe(480)
    expect(windowSpanMinutes(WINDOW)).toBe(360)
  })

  it('marks rather than blocks, and a disabled window measures nothing', () => {
    const late = entry('2026-03-10T21:30', 600)
    expect(entryWindowStatus(late, WINDOW)).toBe('outside')
    expect(entryWindowStatus(late, { ...WINDOW, enabled: false })).toBe('not-applicable')
  })

  it('rejects a malformed window or time', () => {
    expect(() => isTimeInWindow('25:00', WINDOW)).toThrow()
    expect(() => isTimeInWindow('12:00', { start: '12:00', end: '6pm', enabled: true })).toThrow()
    expect(() => windowSpanMinutes({ start: '-1:00', end: '18:00', enabled: true })).toThrow()
  })
})

describe('daily window summaries', () => {
  const entries = [
    entry('2026-03-09T12:30', 500),
    entry('2026-03-09T17:45', 700),
    entry('2026-03-10T13:00', 600),
    entry('2026-03-10T19:20', 400), // outside the 12:00-18:00 window
  ]

  it('derives first, last and eating span from the meal times', () => {
    const [d9, d10] = dailyWindowSummaries(entries, ['2026-03-09', '2026-03-10'], WINDOW)
    expect(d9.firstEntryAt).toBe('2026-03-09T12:30')
    expect(d9.lastEntryAt).toBe('2026-03-09T17:45')
    expect(d9.eatingSpanMinutes).toBe(315)
    expect(d9.allInsideWindow).toBe(true)
    expect(d10.entriesOutsideWindow).toBe(1)
    expect(d10.allInsideWindow).toBe(false)
  })

  it('measures the fast across midnight from the previous day’s last entry', () => {
    const [, d10] = dailyWindowSummaries(entries, ['2026-03-09', '2026-03-10'], WINDOW)
    // 17:45 to 13:00 the next day = 6h15m + 13h = 19h15m.
    expect(d10.fastingFrom).toBe('2026-03-09T17:45')
    expect(d10.fastingSpanMinutes).toBe(19 * 60 + 15)
    expect(formatSpan(d10.fastingSpanMinutes ?? 0)).toBe('19 h 15 m')
  })

  it('leaves the fast unknown rather than enormous when the day before is blank', () => {
    const sparse = [entry('2026-01-01T13:00', 500), entry('2026-02-10T13:00', 500)]
    const [feb] = dailyWindowSummaries(sparse, ['2026-02-10'], WINDOW)
    expect(feb.logged).toBe(true)
    expect(feb.fastingSpanMinutes).toBeNull()
    expect(feb.fastingUnknownReason).toMatch(/previous day/)
  })

  it('reports an unlogged day as unlogged, not as perfect adherence', () => {
    const [d] = dailyWindowSummaries(entries, ['2026-03-11'], WINDOW)
    expect(d.logged).toBe(false)
    expect(d.allInsideWindow).toBeNull()
    expect(d.eatingSpanMinutes).toBeNull()
  })

  it('gives a single-entry day a zero eating span', () => {
    const [d] = dailyWindowSummaries([entry('2026-03-10T13:00', 500)], ['2026-03-10'], WINDOW)
    expect(d.eatingSpanMinutes).toBe(0)
  })

  it('uses the meal time of a back-dated entry, never the time it was typed', () => {
    const backDated = entry('2026-03-10T13:00', 500, 30, { loggedAt: '2026-03-10T23:00' })
    const [d] = dailyWindowSummaries([backDated], ['2026-03-10'], WINDOW)
    expect(d.firstEntryAt).toBe('2026-03-10T13:00')
    expect(d.allInsideWindow).toBe(true)
    expect(d.entriesOutsideWindow).toBe(0)
  })

  it('works for an overnight window, where a 01:00 meal is inside', () => {
    const night = [
      entry('2026-03-09T21:00', 800, 0, { date: '2026-03-09' }),
      entry('2026-03-10T01:00', 300, 0, { date: '2026-03-09' }),
    ]
    const [d] = dailyWindowSummaries(night, ['2026-03-09'], OVERNIGHT)
    expect(d.entryCount).toBe(2)
    expect(d.entriesInsideWindow).toBe(2)
    expect(d.allInsideWindow).toBe(true)
    expect(d.eatingSpanMinutes).toBe(240)
  })

  it('is unmoved by a daylight-saving shift, because it reads wall clocks', () => {
    // 2026-03-29 is the European clock change; the wall-clock fast is the
    // number the user experiences, and it does not move.
    const across = [entry('2026-03-28T17:00', 600), entry('2026-03-29T12:30', 600)]
    const [, d] = dailyWindowSummaries(across, ['2026-03-28', '2026-03-29'], WINDOW)
    expect(d.fastingSpanMinutes).toBe(19 * 60 + 30)
  })
})

describe('window adherence', () => {
  const entries = [
    entry('2026-03-08T13:00', 500),
    entry('2026-03-09T13:00', 500),
    entry('2026-03-10T19:30', 500), // outside
    entry('2026-03-14T13:00', 500),
  ]

  it('divides by logged days, so a blank week is not a perfect week', () => {
    const a = windowAdherence(entries, { asOf: '2026-03-14', days: 7, window: WINDOW })
    expect(a.days).toBe(7)
    expect(a.daysLogged).toBe(4)
    expect(a.daysFullyInside).toBe(3)
    expect(a.adherence).toBeCloseTo(3 / 4, 10)
  })

  it('returns null adherence with nothing logged or the window off', () => {
    expect(windowAdherence([], { asOf: '2026-03-14', days: 7, window: WINDOW }).adherence).toBeNull()
    expect(
      windowAdherence(entries, {
        asOf: '2026-03-14',
        days: 7,
        window: { ...WINDOW, enabled: false },
      }).adherence,
    ).toBeNull()
  })

  it('counts the days whose fast could not be measured', () => {
    const a = windowAdherence(entries, { asOf: '2026-03-14', days: 7, window: WINDOW })
    // 03-08 (no 03-07) and 03-14 (no 03-13) have no measurable fast.
    expect(a.daysWithoutFast).toBe(2)
    expect(a.meanFastingSpanMinutes).not.toBeNull()
  })

  it('reports 7 and 28 day views plus today', () => {
    const r = dietWindowReport(entries, { asOf: '2026-03-14', window: WINDOW })
    expect(r.today.date).toBe('2026-03-14')
    expect(r.last7.days).toBe(7)
    expect(r.last28.days).toBe(28)
    expect(r.last28.daysLogged).toBe(4)
  })
})
