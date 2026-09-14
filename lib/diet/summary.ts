/**
 * Diet's contribution to the Today card — a `SummaryProvider` per `lib/summary`.
 *
 * This is the only place Diet is visible outside itself (spec 4.2). It is a
 * plugin seam, not a dependency: Diet publishes an `AppSummary` and does not
 * know that Today or the agent exists, and it imports nothing from `lib/train`,
 * `lib/ops` or the learning modules.
 *
 * The headline is a sentence a person would say, not a metric restated — the
 * numbers are already in `metrics`, and repeating them in prose wastes the one
 * line that could say something a glance at the figures does not.
 */
import type { AppSummary, AppStatus, SummaryMetric, SummaryProvider } from '@/lib/summary'
import {
  DEFAULT_EATING_WINDOW,
  dietTargetsSchema,
  eatingWindowSchema,
  isoDateSchema,
  logEntrySchema,
  weightReadingSchema,
  type DietTargets,
  type EatingWindow,
  type IsoDate,
  type LogEntry,
  type WeightReading,
} from './types'
import { dayTotals } from './aggregate'
import { dailyWindowSummaries } from './window'
import { trendChange, trendOn, weightTrend } from './trend'
import { addDays, timeOf } from './time'
import { z } from 'zod'

export interface DietSummaryInput {
  /** The local date the card describes. */
  date: IsoDate
  entries: LogEntry[]
  weights?: WeightReading[]
  targets?: DietTargets
  window?: EatingWindow
  /** Where the card links. Defaults to the Diet route. */
  href?: string
}

const inputSchema = z.object({
  date: isoDateSchema,
  entries: z.array(logEntrySchema),
  weights: z.array(weightReadingSchema).optional(),
  targets: dietTargetsSchema.optional(),
  window: eatingWindowSchema.optional(),
  href: z.string().min(1).optional(),
})

/** Thousands separators without depending on the host's locale. */
function groupDigits(n: number): string {
  const rounded = Math.round(n)
  const sign = rounded < 0 ? '-' : ''
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** One decimal, for kilograms. */
function kg(n: number): string {
  return `${n.toFixed(1)} kg`
}

export const dietSummary: SummaryProvider<DietSummaryInput> = (input): AppSummary => {
  const parsed = inputSchema.parse(input)
  const date = parsed.date
  const window = parsed.window ?? DEFAULT_EATING_WINDOW
  const targets = parsed.targets
  const href = parsed.href ?? '/diet'

  const today = dayTotals(parsed.entries, date)
  const day = dailyWindowSummaries(parsed.entries, [date], window)[0]
  const series = weightTrend(parsed.weights ?? [])
  const trendNow = trendOn(series, date)
  const week = trendChange(series, addDays(date, -7), date)

  const metrics: SummaryMetric[] = []

  if (today.logged) {
    metrics.push({
      label: 'Calories',
      value: groupDigits(today.kcal),
      ...(targets ? { of: `/ ${groupDigits(targets.kcal)}`, fraction: today.kcal / targets.kcal } : {}),
    })
    metrics.push({
      label: 'Protein',
      value: `${Math.round(today.proteinG)} g`,
      ...(targets
        ? { of: `/ ${Math.round(targets.proteinG)} g`, fraction: today.proteinG / targets.proteinG }
        : {}),
    })
  }

  if (trendNow && metrics.length < 3) {
    const delta = week?.deltaKg ?? 0
    metrics.push({
      label: 'Trend',
      value: kg(trendNow.trendKg),
      trend: !week ? 'unknown' : delta < -0.1 ? 'down' : delta > 0.1 ? 'up' : 'flat',
    })
  }

  const over = targets && today.logged ? today.kcal - targets.kcal : 0
  const status: AppStatus = !today.logged
    ? 'idle'
    : targets && over > targets.kcalBand
      ? 'attention'
      : day.entriesOutsideWindow > 0
        ? 'behind'
        : 'ok'

  return {
    appId: 'diet',
    title: 'Diet',
    href,
    status,
    headline: headlineFor({ today, day, targets, over }),
    metrics: metrics.slice(0, 3),
    date,
  }
}

function headlineFor(args: {
  today: ReturnType<typeof dayTotals>
  day: ReturnType<typeof dailyWindowSummaries>[number]
  targets?: DietTargets
  over: number
}): string {
  const { today, day, targets, over } = args
  if (!today.logged) return 'Nothing logged today yet.'

  const lastAt = day.lastEntryAt ? timeOf(day.lastEntryAt) : null
  const since = lastAt ? `you last ate at ${lastAt}` : 'no meal time recorded'

  if (targets && over > targets.kcalBand) {
    return `You're ${groupDigits(over)} kcal over target and ${since}.`
  }
  if (day.entriesOutsideWindow > 0) {
    const n = day.entriesOutsideWindow
    return `${n} ${n === 1 ? 'meal' : 'meals'} landed outside your eating window today.`
  }
  if (targets) {
    const left = targets.kcal - today.kcal
    if (left > 0) return `${groupDigits(left)} kcal left today, and ${since}.`
    return `You're on target for today, and ${since}.`
  }
  return `${groupDigits(today.kcal)} kcal so far today, and ${since}.`
}
