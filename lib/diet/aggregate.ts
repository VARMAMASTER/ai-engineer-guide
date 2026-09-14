/**
 * Daily and period aggregates (spec 5.1.2).
 *
 * The whole of this module turns on one rule: **an unlogged day is invisible,
 * not zero.** A day the user did not log is a day about which nothing is known;
 * counting it as 0 kcal drags every mean downward, makes a measured TDEE read
 * as a much larger deficit than exists, and produces a forecast that promises
 * weight loss that will not arrive. So:
 *
 *  - `DayTotals` has no `kcal` field at all on an unlogged day (see `types.ts`).
 *  - Means divide by the number of **logged** days, never by the period length.
 *  - The two adherence numbers are reported separately, because they answer
 *    different questions: "did you log?" and "when you logged, were you on
 *    target?". The spec is explicit that the first matters more.
 */
import { z } from 'zod'
import {
  dietTargetsSchema,
  isoDateSchema,
  logEntrySchema,
  type DayTotals,
  type DietTargets,
  type IsoDate,
  type LogEntry,
} from './types'
import { addDays, trailingDates } from './time'

const entriesSchema = z.array(logEntrySchema)

interface RawTotals {
  kcal: number
  proteinG: number
  entryCount: number
}

/**
 * Sum entries by their **meal date** (`entry.date`), not by when the row was
 * created. An entry added at 23:00 for yesterday's lunch belongs to yesterday.
 */
export function totalsByDate(entries: LogEntry[]): Map<IsoDate, RawTotals> {
  const parsed = entriesSchema.parse(entries)
  const byDate = new Map<IsoDate, RawTotals>()
  for (const e of parsed) {
    const acc = byDate.get(e.date) ?? { kcal: 0, proteinG: 0, entryCount: 0 }
    acc.kcal += e.kcal
    acc.proteinG += e.proteinG
    acc.entryCount += 1
    byDate.set(e.date, acc)
  }
  return byDate
}

function toDayTotals(date: IsoDate, raw: RawTotals | undefined): DayTotals {
  if (!raw || raw.entryCount === 0) return { date, logged: false, entryCount: 0 }
  return { date, logged: true, kcal: raw.kcal, proteinG: raw.proteinG, entryCount: raw.entryCount }
}

/** Totals for one date. Unlogged returns the `logged: false` variant. */
export function dayTotals(entries: LogEntry[], date: IsoDate): DayTotals {
  const d = isoDateSchema.parse(date)
  return toDayTotals(d, totalsByDate(entries).get(d))
}

/** Totals for each of `dates`, in the order given. */
export function dailyTotals(entries: LogEntry[], dates: IsoDate[]): DayTotals[] {
  const byDate = totalsByDate(entries)
  return dates.map((d) => toDayTotals(isoDateSchema.parse(d), byDate.get(d)))
}

export interface PeriodAggregate {
  from: IsoDate
  to: IsoDate
  /** Length of the period in days, logged or not. */
  days: number
  daysLogged: number
  /**
   * Adherence #1 — share of days logged at all, 0-1. Denominator is the whole
   * period, because that is exactly the question being asked.
   */
  loggedShare: number
  /** Mean over **logged** days only. `null` when nothing was logged. */
  meanKcal: number | null
  meanProteinG: number | null
  /** Sum over logged days. Useful for measured TDEE; not a period budget. */
  totalKcal: number
  daysInKcalTarget: number
  /**
   * Adherence #2 — share of **logged** days inside the calorie target band,
   * 0-1, or `null` when nothing was logged. Deliberately a different
   * denominator from `loggedShare`: mixing them would let a week of not
   * logging look like a week of perfect eating.
   */
  kcalTargetShare: number | null
  daysAtProteinTarget: number
  /** Share of logged days meeting or beating the protein floor, or `null`. */
  proteinTargetShare: number | null
}

export interface PeriodOptions {
  asOf: IsoDate
  days: number
  /** Without targets the two target counts stay 0 and the shares stay null. */
  targets?: DietTargets
}

/**
 * Aggregate the `days` days ending at and including `asOf`.
 *
 * "Inside the calorie target" is a two-sided band of `targets.kcalBand` either
 * side of the target, defaulting to 150 kcal. One-sided would score a 900 kcal
 * day on a 2,050 target as a success, which it is not.
 */
export function periodAggregate(entries: LogEntry[], options: PeriodOptions): PeriodAggregate {
  const asOf = isoDateSchema.parse(options.asOf)
  const days = z.number().int().min(1).max(3650).parse(options.days)
  const targets = options.targets ? dietTargetsSchema.parse(options.targets) : undefined

  const dates = trailingDates(asOf, days)
  const totals = dailyTotals(entries, dates)
  const logged = totals.filter((d): d is Extract<DayTotals, { logged: true }> => d.logged)

  let totalKcal = 0
  let totalProtein = 0
  let daysInKcalTarget = 0
  let daysAtProteinTarget = 0
  for (const d of logged) {
    totalKcal += d.kcal
    totalProtein += d.proteinG
    if (targets) {
      if (Math.abs(d.kcal - targets.kcal) <= targets.kcalBand) daysInKcalTarget += 1
      if (d.proteinG >= targets.proteinG) daysAtProteinTarget += 1
    }
  }

  const n = logged.length
  return {
    from: addDays(asOf, -(days - 1)),
    to: asOf,
    days,
    daysLogged: n,
    loggedShare: n / days,
    meanKcal: n > 0 ? totalKcal / n : null,
    meanProteinG: n > 0 ? totalProtein / n : null,
    totalKcal,
    daysInKcalTarget,
    kcalTargetShare: n > 0 && targets ? daysInKcalTarget / n : null,
    daysAtProteinTarget,
    proteinTargetShare: n > 0 && targets ? daysAtProteinTarget / n : null,
  }
}

export interface DietAggregates {
  today: DayTotals
  last7: PeriodAggregate
  last28: PeriodAggregate
}

/** Today, 7-day and 28-day views — the three the spec asks to be shown. */
export function dietAggregates(
  entries: LogEntry[],
  options: { asOf: IsoDate; targets?: DietTargets },
): DietAggregates {
  const asOf = isoDateSchema.parse(options.asOf)
  return {
    today: dayTotals(entries, asOf),
    last7: periodAggregate(entries, { asOf, days: 7, targets: options.targets }),
    last28: periodAggregate(entries, { asOf, days: 28, targets: options.targets }),
  }
}
