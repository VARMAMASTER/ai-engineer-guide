'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Field from '@/components/ui/Field'
import Meter from '@/components/ui/Meter'
import Select from '@/components/ui/Select'
import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import { dailyTotals, dietAggregates, type PeriodAggregate } from '@/lib/diet/aggregate'
import { measureTdee } from '@/lib/diet/energy'
import {
  forecastWeight,
  projectMuscleCeiling,
  scoreForecasts,
  toStoredForecast,
  type TrainingLevel,
  type WeightForecast,
} from '@/lib/diet/forecast'
import type { StoredForecast } from '@/lib/diet/forecast'
import { formatSpan, trailingDates } from '@/lib/diet/time'
import { trendOn, weightTrend } from '@/lib/diet/trend'
import { dietWindowReport } from '@/lib/diet/window'
import type {
  DietTargets,
  EatingWindow,
  LogEntry,
  UserProfile,
  WeightReading,
} from '@/lib/diet/types'
import { saveForecast } from '../_data/mutations'
import { kcalText, kgText, shareText } from '../_lib/format'
import { useLocalToday } from '../_lib/useLocalToday'
import ForecastCard from './ForecastCard'
import IntakeChart from './IntakeChart'
import TdeeCard from './TdeeCard'

/**
 * Diet's analytics, all of it deterministic and all of it inside Diet.
 *
 * The rules that shape this page are honesty rules rather than feature ones.
 *
 *  - **Two adherence numbers, never one.** "Did you log?" and "when you logged,
 *    were you on target?" are different questions with different denominators,
 *    and averaging them lets a week of not logging read as a week of perfect
 *    eating. They are rendered side by side, each labelled with what it
 *    divides by.
 *  - **Window adherence is a third, separate fact.** A late meal inside the
 *    calorie target is not a failure, so it is not mixed into either of the
 *    two above.
 *  - **Nothing here claims a cause.** With one person and a few weeks of data,
 *    "you lose weight on days you eat before 14:00" is noise. Cross-domain
 *    pattern-finding is the agent's job and it is phrased as observation; this
 *    page reports arithmetic and stops.
 *
 * The forecast horizon is 30 days and it is recorded the day it is made, under
 * an id derived from that day, so that opening this page four times records one
 * forecast rather than four.
 */

export interface TrendsClientProps {
  userId: string
  serverToday: string
  entries: LogEntry[]
  weights: WeightReading[]
  forecasts: StoredForecast[]
  profile: UserProfile | undefined
  targets: DietTargets | undefined
  window: EatingWindow
  loadError: string | null
}

const HORIZON_DAYS = 30
const INTAKE_CHART_DAYS = 14

const LEVEL_LABELS: Record<TrainingLevel, string> = {
  novice: 'First year of lifting',
  intermediate: 'A couple of years in',
  trained: 'Trained for years',
}

export default function TrendsClient({
  userId,
  serverToday,
  entries,
  weights,
  forecasts,
  profile,
  targets,
  window: eatingWindow,
  loadError,
}: TrendsClientProps) {
  const today = useLocalToday(serverToday)
  const [level, setLevel] = useState<TrainingLevel>('intermediate')

  const series = useMemo(() => weightTrend(weights), [weights])
  const tdee = useMemo(
    () => measureTdee({ asOf: today, entries, weights, profile }),
    [today, entries, weights, profile],
  )
  const aggregates = useMemo(
    () => dietAggregates(entries, { asOf: today, targets }),
    [entries, today, targets],
  )
  const last14 = useMemo(
    () => dailyTotals(entries, trailingDates(today, INTAKE_CHART_DAYS)),
    [entries, today],
  )
  const windowReport = useMemo(
    () => dietWindowReport(entries, { asOf: today, window: eatingWindow }),
    [entries, today, eatingWindow],
  )

  const trendNow = trendOn(series, today)
  const intake = useMemo(() => resolveIntake(aggregates, targets), [aggregates, targets])

  const forecast: WeightForecast = useMemo(() => {
    if (!trendNow) {
      return {
        kind: 'unavailable',
        reason: 'No weight trend yet, so there is nothing to project forward from.',
      }
    }
    if (intake.kcal === null) {
      return {
        kind: 'unavailable',
        reason:
          'No intake to project from yet — log a few days of food, or set a calorie target in Setup.',
      }
    }
    return forecastWeight({
      asOf: today,
      horizonDays: HORIZON_DAYS,
      currentTrendKg: trendNow.trendKg,
      tdee,
      meanIntakeKcal: intake.kcal,
    })
  }, [trendNow, intake.kcal, today, tdee])

  const scorecard = useMemo(() => scoreForecasts(forecasts, series), [forecasts, series])

  // Keep today's forecast, once. A forecast nobody wrote down cannot be graded
  // later, and the whole point of the card above is that it gets graded.
  const savedRef = useRef<string | null>(null)
  useEffect(() => {
    const stored = toStoredForecast(`f-${today}-${HORIZON_DAYS}`, forecast)
    if (!stored || savedRef.current === stored.id) return
    savedRef.current = stored.id
    // Fire and forget: failing to record a forecast must never block a page
    // whose job is to show numbers that are already on screen.
    void saveForecast(userId, stored)
  }, [forecast, today, userId])

  const muscle = useMemo(
    () => (profile ? projectMuscleCeiling({ months: 3, level, sex: profile.sex }) : null),
    [profile, level],
  )

  return (
    <div className="flex flex-col gap-6">
      {loadError ? (
        <p className="panel p-4 text-sm text-[var(--danger)]" role="alert">
          Some of your history could not be loaded ({loadError}), so every number below is computed
          from an incomplete record. Reload before reading anything into them.
        </p>
      ) : null}

      <TdeeCard estimate={tdee} />

      <section className="panel flex flex-col gap-5 p-4" aria-labelledby="intake-heading">
        <h2 id="intake-heading" className="eyebrow">
          Calories and protein
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat
            label="Today"
            value={aggregates.today.logged ? kcalText(aggregates.today.kcal) : '—'}
            unit={aggregates.today.logged ? 'kcal' : 'not logged'}
          />
          <Stat
            label="7-day mean"
            value={aggregates.last7.meanKcal === null ? '—' : kcalText(aggregates.last7.meanKcal)}
            unit="kcal"
          />
          <Stat
            label="28-day mean"
            value={aggregates.last28.meanKcal === null ? '—' : kcalText(aggregates.last28.meanKcal)}
            unit="kcal"
          />
          <Stat
            label="Protein, 7-day"
            value={
              aggregates.last7.meanProteinG === null
                ? '—'
                : Math.round(aggregates.last7.meanProteinG)
            }
            unit="g"
          />
        </div>
        <p className="hint">
          Means divide by the days you actually logged, never by the length of the period. Seven
          days with three logged is a mean of three days, and it says so below.
        </p>

        <IntakeChart days={last14} targets={targets} />

        <AdherencePair period={aggregates.last7} label="Last 7 days" targets={targets} />
        <AdherencePair period={aggregates.last28} label="Last 28 days" targets={targets} />
      </section>

      <ForecastCard
        forecast={forecast}
        scorecard={scorecard}
        intakeKcal={intake.kcal}
        intakeBasis={intake.basis}
      />

      <section className="panel flex flex-col gap-4 p-4" aria-labelledby="window-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="window-heading" className="eyebrow">
            Eating window
          </h2>
          <Tag variant="outline">
            {eatingWindow.enabled
              ? `${eatingWindow.start}–${eatingWindow.end}`
              : 'Window switched off'}
          </Tag>
        </div>

        {eatingWindow.enabled ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat
                label="7-day adherence"
                value={shareText(windowReport.last7.adherence) ?? '—'}
                unit={`of ${windowReport.last7.daysLogged} logged days`}
              />
              <Stat
                label="28-day adherence"
                value={shareText(windowReport.last28.adherence) ?? '—'}
                unit={`of ${windowReport.last28.daysLogged} logged days`}
              />
              <Stat
                label="Mean fast"
                value={
                  windowReport.last7.meanFastingSpanMinutes === null
                    ? '—'
                    : formatSpan(windowReport.last7.meanFastingSpanMinutes)
                }
              />
              <Stat
                label="Mean eating span"
                value={
                  windowReport.last7.meanEatingSpanMinutes === null
                    ? '—'
                    : formatSpan(windowReport.last7.meanEatingSpanMinutes)
                }
              />
            </div>
            <p className="hint">
              Adherence is the share of <strong>logged</strong> days whose every entry fell inside
              the window — a week of not logging is not a week of perfect adherence. This is a
              separate fact from the calorie numbers above: a late meal that stayed inside your
              calorie target is not a failure, and nothing here treats it as one.
            </p>
            {windowReport.last7.daysWithoutFast > 0 ? (
              <p className="hint">
                {windowReport.last7.daysWithoutFast} of the last 7 days have no measurable fast,
                because the day before them is blank. An unlogged day breaks the chain rather than
                extending the fast.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Your eating window is switched off, so nothing is being marked inside or outside it. A
            disabled window measures nothing — it is not a window everything is inside.
          </p>
        )}
      </section>

      <section className="panel flex flex-col gap-4 p-4" aria-labelledby="muscle-heading">
        <h2 id="muscle-heading" className="eyebrow">
          Muscle, at best
        </h2>
        {muscle ? (
          <>
            <Field label="How long have you been training?">
              <Select
                value={level}
                onChange={(event) => setLevel(event.target.value as TrainingLevel)}
              >
                {(Object.keys(LEVEL_LABELS) as TrainingLevel[]).map((key) => (
                  <option key={key} value={key}>
                    {LEVEL_LABELS[key]}
                  </option>
                ))}
              </Select>
            </Field>
            <Stat
              label={`Ceiling over ${muscle.months} months`}
              value={`${kgText(muscle.lowKg)}–${kgText(muscle.highKg)}`}
              unit="kg"
            />
            <p className="hint">{muscle.note}</p>
          </>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            This needs the profile in Setup. It is a ceiling rather than a projection either way —
            a flattering curve is worse than no curve.
          </p>
        )}
      </section>

      <p className="hint">
        Nothing on this page claims a cause. With one person and a few weeks of data, a correlation
        between when you ate and what the scale said is overwhelmingly noise, and a health app that
        reports noise as insight does real harm.
      </p>
    </div>
  )
}

/**
 * The two adherence numbers, side by side and each labelled with its own
 * denominator — which is the entire reason they are rendered together rather
 * than averaged into one score.
 */
function AdherencePair({
  period,
  label,
  targets,
}: {
  period: PeriodAggregate
  label: string
  targets: DietTargets | undefined
}) {
  return (
    <div className="surface-solid flex flex-col gap-3 rounded-[var(--radius-sm)] p-3">
      <p className="eyebrow">{label}</p>
      <Meter
        label={`${label}: days logged at all`}
        value={period.loggedShare * 100}
        showValue
      />
      <p className="hint">
        Logged on {period.daysLogged} of {period.days} days. This is the one that matters most — an
        unlogged day is invisible, not zero.
      </p>
      {targets ? (
        <>
          <Meter
            label={`${label}: logged days inside the calorie band`}
            value={(period.kcalTargetShare ?? 0) * 100}
            showValue
          />
          <p className="hint">
            {period.kcalTargetShare === null
              ? 'Nothing logged, so there is no in-target share to report — not a zero, and not a hundred.'
              : `${period.daysInKcalTarget} of the ${period.daysLogged} logged days landed within ${kcalText(targets.kcalBand)} kcal of target, either side. Protein floor met on ${period.daysAtProteinTarget}.`}
          </p>
        </>
      ) : (
        <p className="hint">Set a calorie target in Setup for the second number.</p>
      )}
    </div>
  )
}

/**
 * The intake a forecast should assume, and a sentence saying where it came
 * from. Recent behaviour beats a target the user has not been hitting, so the
 * 7-day mean wins, the 28-day mean is the fallback, and the target is the last
 * resort — labelled as a plan rather than as a measurement.
 */
function resolveIntake(
  aggregates: ReturnType<typeof dietAggregates>,
  targets: DietTargets | undefined,
): { kcal: number | null; basis: string } {
  if (aggregates.last7.meanKcal !== null && aggregates.last7.daysLogged >= 3) {
    return {
      kcal: aggregates.last7.meanKcal,
      basis: `your mean over the ${aggregates.last7.daysLogged} days you logged this week`,
    }
  }
  if (aggregates.last28.meanKcal !== null && aggregates.last28.daysLogged >= 3) {
    return {
      kcal: aggregates.last28.meanKcal,
      basis: `your mean over the ${aggregates.last28.daysLogged} days you logged this month`,
    }
  }
  if (targets) return { kcal: targets.kcal, basis: 'your target, since there is little logged yet' }
  return { kcal: null, basis: 'nothing yet' }
}
