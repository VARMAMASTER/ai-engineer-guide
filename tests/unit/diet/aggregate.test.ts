import { describe, it, expect } from 'vitest'
import { dailyTotals, dayTotals, dietAggregates, periodAggregate } from '@/lib/diet/aggregate'
import { TARGETS, dailyEntries, entry } from './fixtures'

describe('dayTotals', () => {
  it('sums a logged day', () => {
    const day = dayTotals(
      [entry('2026-03-10T13:00', 600, 40), entry('2026-03-10T17:30', 700, 45)],
      '2026-03-10',
    )
    expect(day).toEqual({
      date: '2026-03-10',
      logged: true,
      kcal: 1300,
      proteinG: 85,
      entryCount: 2,
    })
  })

  it('reports an unlogged day as invisible, carrying no calorie figure', () => {
    const day = dayTotals([entry('2026-03-10T13:00', 600, 40)], '2026-03-11')
    expect(day.logged).toBe(false)
    expect(day.entryCount).toBe(0)
    // Not `kcal: 0` — there is no kcal field at all, so nothing downstream can
    // add an unlogged day into a mean.
    expect('kcal' in day).toBe(false)
  })

  it('files a back-dated entry under the meal date, not the entry date', () => {
    const backDated = entry('2026-03-10T13:00', 500, 30, {
      date: '2026-03-10',
      loggedAt: '2026-03-11T23:05',
    })
    expect(dayTotals([backDated], '2026-03-10').logged).toBe(true)
    expect(dayTotals([backDated], '2026-03-11').logged).toBe(false)
  })

  it('handles no data at all', () => {
    expect(dayTotals([], '2026-03-10')).toEqual({
      date: '2026-03-10',
      logged: false,
      entryCount: 0,
    })
  })
})

describe('periodAggregate', () => {
  it('divides by logged days, not by the length of the period', () => {
    // Three logged days out of seven, 2,100 kcal each.
    const entries = [
      entry('2026-03-08T13:00', 2100, 150),
      entry('2026-03-10T13:00', 2100, 150),
      entry('2026-03-14T13:00', 2100, 150),
    ]
    const p = periodAggregate(entries, { asOf: '2026-03-14', days: 7, targets: TARGETS })
    expect(p.from).toBe('2026-03-08')
    expect(p.to).toBe('2026-03-14')
    expect(p.daysLogged).toBe(3)
    // The mean is 2,100 — the honest answer. Zero-filling gives 900, which
    // would read as a 1,100 kcal deficit that never happened.
    expect(p.meanKcal).toBe(2100)
    expect(p.loggedShare).toBeCloseTo(3 / 7, 10)
  })

  it('keeps the two adherence numbers separate and on different denominators', () => {
    const entries = [
      entry('2026-03-12T13:00', 2000, 150), // inside the 2,000 +/- 150 band
      entry('2026-03-13T13:00', 2600, 150), // outside
      entry('2026-03-14T13:00', 2100, 100), // inside on kcal, short on protein
    ]
    const p = periodAggregate(entries, { asOf: '2026-03-14', days: 7, targets: TARGETS })
    expect(p.loggedShare).toBeCloseTo(3 / 7, 10) // logged at all
    expect(p.daysInKcalTarget).toBe(2)
    expect(p.kcalTargetShare).toBeCloseTo(2 / 3, 10) // of the days logged
    expect(p.daysAtProteinTarget).toBe(2)
    expect(p.proteinTargetShare).toBeCloseTo(2 / 3, 10)
  })

  it('counts a severe undershoot as outside the target, not as success', () => {
    const p = periodAggregate([entry('2026-03-14T13:00', 900, 40)], {
      asOf: '2026-03-14',
      days: 7,
      targets: TARGETS,
    })
    expect(p.daysInKcalTarget).toBe(0)
  })

  it('returns nulls rather than zeros when nothing was logged', () => {
    const p = periodAggregate([], { asOf: '2026-03-14', days: 28, targets: TARGETS })
    expect(p.daysLogged).toBe(0)
    expect(p.loggedShare).toBe(0)
    expect(p.meanKcal).toBeNull()
    expect(p.meanProteinG).toBeNull()
    expect(p.kcalTargetShare).toBeNull()
    expect(p.proteinTargetShare).toBeNull()
  })

  it('leaves target shares null when there are no targets to compare against', () => {
    const p = periodAggregate([entry('2026-03-14T13:00', 2000, 150)], {
      asOf: '2026-03-14',
      days: 7,
    })
    expect(p.meanKcal).toBe(2000)
    expect(p.kcalTargetShare).toBeNull()
  })

  it('survives a single day of data and a 40-day gap', () => {
    const entries = [entry('2026-01-01T13:00', 2000, 150), entry('2026-02-10T13:00', 2200, 160)]
    const p = periodAggregate(entries, { asOf: '2026-02-10', days: 28, targets: TARGETS })
    expect(p.daysLogged).toBe(1)
    expect(p.meanKcal).toBe(2200)
    expect(p.loggedShare).toBeCloseTo(1 / 28, 10)
  })

  it('is immune to a daylight-saving shift inside the period', () => {
    // 2026-03-29 is the European clock change; 2026-03-08 the American one.
    const eu = periodAggregate(dailyEntries('2026-03-26', 7, 2000, 150), {
      asOf: '2026-04-01',
      days: 7,
    })
    expect(eu.daysLogged).toBe(7)
    expect(eu.from).toBe('2026-03-26')
    const us = periodAggregate(dailyEntries('2026-03-05', 7, 2000, 150), {
      asOf: '2026-03-11',
      days: 7,
    })
    expect(us.daysLogged).toBe(7)
    expect(us.from).toBe('2026-03-05')
  })

  it('rejects absurd input at the boundary', () => {
    expect(() => periodAggregate([], { asOf: 'yesterday', days: 7 })).toThrow()
    expect(() => periodAggregate([], { asOf: '2026-03-14', days: 0 })).toThrow()
    expect(() => periodAggregate([], { asOf: '2026-03-14', days: -7 })).toThrow()
    expect(() => periodAggregate([entry('2026-03-14T13:00', -500)], { asOf: '2026-03-14', days: 7 })).toThrow()
    expect(() => periodAggregate([entry('2026-03-14T25:00', 500)], { asOf: '2026-03-14', days: 7 })).toThrow()
  })
})

describe('dailyTotals and dietAggregates', () => {
  it('returns one row per requested date, in order', () => {
    const rows = dailyTotals([entry('2026-03-10T13:00', 500)], [
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
    ])
    expect(rows.map((r) => r.logged)).toEqual([false, true, false])
  })

  it('gives today, 7 and 28 day views from one pass', () => {
    const a = dietAggregates(dailyEntries('2026-02-15', 28, 2000, 150), {
      asOf: '2026-03-14',
      targets: TARGETS,
    })
    expect(a.today.logged).toBe(true)
    expect(a.last7.daysLogged).toBe(7)
    expect(a.last28.daysLogged).toBe(28)
    expect(a.last28.meanKcal).toBe(2000)
  })
})
