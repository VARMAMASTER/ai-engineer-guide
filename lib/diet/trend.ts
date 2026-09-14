/**
 * Weight trend — an exponentially weighted moving average (spec 5.1.2).
 *
 * Daily weight swings 1-2 kg on water alone. A raw line reads that as failure
 * and is the commonest reason people stop weighing, so every number elsewhere
 * in Diet is computed from the trend, never from a single reading.
 *
 * **Smoothing factor: alpha = 0.1 per day.** This is the Hacker's Diet value.
 * It gives a centre of mass of (1 - alpha) / alpha = 9 days and a half-life of
 * ln(0.5) / ln(0.9) ~= 6.6 days, so the trend responds noticeably faster than
 * the 14-day mean the rest of the app uses for intake while still absorbing a
 * 1-2 kg daily swing into roughly a 100-200 g move. Larger alpha reintroduces
 * the noise the trend exists to remove; smaller alpha lags a real cut by long
 * enough that the user concludes it is not working.
 *
 * **Gaps are decayed, not skipped and not zero-filled.** A missing day carries
 * no information, so the update for a reading `n` days after the last one uses
 * an effective alpha of `1 - (1 - alpha)^n`. Consecutive days reduce to the
 * plain 0.1; after a 40-day gap the effective alpha is 0.985 and the trend
 * snaps essentially to the new reading, which is correct — a six-week-old trend
 * says nothing about today's weight.
 */
import { z } from 'zod'
import { weightReadingSchema, type IsoDate, type WeightReading } from './types'
import { diffDays } from './time'

/** The Hacker's Diet smoothing factor, per day. See the module comment. */
export const TREND_ALPHA = 0.1

export interface TrendPoint {
  date: IsoDate
  /** Mean of that day's readings — several weigh-ins a day are normal. */
  weightKg: number
  /** The EWMA value after absorbing this day's reading. */
  trendKg: number
  /** Days since the previous reading. 0 on the first point. */
  gapDays: number
}

const readingsSchema = z.array(weightReadingSchema)

/**
 * Collapse readings to one mean value per day, ascending by date.
 *
 * Duplicates on a day are averaged rather than last-wins: a morning and an
 * evening weigh-in are two samples of the same noisy quantity, and taking
 * whichever happened to be entered last would let the time of day the user
 * picked up the scale move the trend.
 */
export function dailyMeanWeights(readings: WeightReading[]): { date: IsoDate; kg: number }[] {
  const parsed = readingsSchema.parse(readings)
  const byDate = new Map<IsoDate, { sum: number; n: number }>()
  for (const r of parsed) {
    const acc = byDate.get(r.date) ?? { sum: 0, n: 0 }
    acc.sum += r.kg
    acc.n += 1
    byDate.set(r.date, acc)
  }
  return [...byDate.entries()]
    .map(([date, { sum, n }]) => ({ date, kg: sum / n }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * The EWMA series, one point per day that has at least one reading.
 *
 * The first reading seeds the trend (there is nothing to smooth it against),
 * so a single weigh-in yields a trend equal to that weigh-in — honest, and the
 * reason `trendOn` reports how old a point is rather than pretending age does
 * not matter.
 */
export function weightTrend(readings: WeightReading[], alpha = TREND_ALPHA): TrendPoint[] {
  if (!(alpha > 0 && alpha <= 1)) {
    throw new Error(`diet/trend: alpha must be in (0, 1], got ${alpha}`)
  }
  const days = dailyMeanWeights(readings)
  const out: TrendPoint[] = []
  let trend = 0
  for (let i = 0; i < days.length; i += 1) {
    const { date, kg } = days[i]
    if (i === 0) {
      trend = kg
      out.push({ date, weightKg: kg, trendKg: trend, gapDays: 0 })
      continue
    }
    const gapDays = diffDays(days[i - 1].date, date)
    const effective = 1 - Math.pow(1 - alpha, gapDays)
    trend = trend + effective * (kg - trend)
    out.push({ date, weightKg: kg, trendKg: trend, gapDays })
  }
  return out
}

export interface TrendAt {
  /** The trend value in use for `date`. */
  trendKg: number
  /** The date of the reading that produced it. */
  fromDate: IsoDate
  /** How stale that reading is at `date`. 0 means it was weighed that day. */
  staleDays: number
}

/**
 * The trend as of a date: the most recent point on or before it.
 *
 * Returns `null` rather than extrapolating when there is no earlier reading.
 * `staleDays` is returned rather than swallowed so a caller can refuse to act
 * on a trend that is three weeks old.
 */
export function trendOn(series: TrendPoint[], date: IsoDate): TrendAt | null {
  let found: TrendPoint | null = null
  for (const p of series) {
    if (p.date.localeCompare(date) <= 0) found = p
    else break
  }
  if (!found) return null
  return { trendKg: found.trendKg, fromDate: found.date, staleDays: diffDays(found.date, date) }
}

export interface TrendChange {
  fromDate: IsoDate
  toDate: IsoDate
  /** Elapsed days between the two trend points. Always >= 1 when non-null. */
  days: number
  deltaKg: number
  kgPerWeek: number
}

/**
 * Change in trend weight between two dates, using the trend points actually
 * available on or before each. Returns `null` when the two ends resolve to the
 * same reading — a delta of zero over zero days is not a rate, it is a
 * division by zero waiting to be rendered as "0.0 kg/week".
 */
export function trendChange(
  series: TrendPoint[],
  from: IsoDate,
  to: IsoDate,
): TrendChange | null {
  const start = trendOn(series, from)
  const end = trendOn(series, to)
  if (!start || !end) return null
  const days = diffDays(start.fromDate, end.fromDate)
  if (days <= 0) return null
  const deltaKg = end.trendKg - start.trendKg
  return {
    fromDate: start.fromDate,
    toDate: end.fromDate,
    days,
    deltaKg,
    kgPerWeek: (deltaKg / days) * 7,
  }
}
