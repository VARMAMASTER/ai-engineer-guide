import type { Metadata } from 'next'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import Meter from '@/components/ui/Meter'
import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import { requireUser } from '@/lib/auth/user'
import { addDays, mostRecentMonday, todayIso } from '@/lib/date'
import {
  currentStreakWeeks,
  estimatedOneRepMax,
  personalBests,
  weeklyAdherence,
  weeklySetsByMuscleGroup,
  weeklyTonnage,
} from '@/lib/train/analytics'
import { exerciseById } from '@/lib/train/exercises'
import { loadTrainState } from '../state'
import { formatKg, formatLoad } from '../labels'
import MuscleVolumeChart from './MuscleVolumeChart'
import TonnageChart, { type WeekRow } from './TonnageChart'

export const metadata: Metadata = {
  title: 'Progress | Train | Unyfide',
}

const WEEKS_SHOWN = 8

/**
 * What the logged sets add up to.
 *
 * Entirely server-rendered: every number is a pure function of rows already
 * fetched, so there is nothing here a client component would add except a
 * hydration cost and a blank frame.
 *
 * Sets per muscle group leads, not tonnage. Tonnage is the number that feels
 * like progress and is the easier one to game — it moves with load alone — and
 * weekly hard sets is the one the evidence actually attaches to growth.
 */
export default async function TrainHistoryPage() {
  await requireUser('/train/history')
  const { state, error } = await loadTrainState()
  const { plan, sessions } = state

  const today = todayIso()
  const weekStart = mostRecentMonday(today)
  const plannedDays = plan?.daysPerWeek ?? 0

  const counts = weeklySetsByMuscleGroup(sessions, weekStart)
  const adherence = weeklyAdherence(sessions, weekStart, plannedDays)
  // Counted from LAST week back, like the Today card: a week still in progress
  // has not had its chance to be met, and counting it as a miss would reset a
  // streak every Monday morning.
  const streak = plan ? currentStreakWeeks(sessions, plannedDays, addDays(weekStart, -7)) : 0

  const weeks: WeekRow[] = Array.from({ length: WEEKS_SHOWN }, (_, i) => {
    const start = addDays(weekStart, -7 * (WEEKS_SHOWN - 1 - i))
    return {
      weekStart: start,
      tonnage: weeklyTonnage(sessions, start),
      sessionCount: weeklyAdherence(sessions, start, plannedDays).sessionCount,
      plannedDays,
    }
  })

  const loggedExerciseIds = [...new Set(sessions.flatMap((s) => s.sets.map((set) => set.exerciseId)))]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Train</p>
        <h1>Progress</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Read over the plan rather than the calendar month, and only from sets logged here.
        </p>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <div className="panel p-4">
          <EmptyState
            title="Nothing logged yet."
            description="Every number on this page is computed from your own sets. One session is enough to start it."
            action={
              <Link href="/train/session" className="chip">
                Log a session
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="This week">
            <Stat value={adherence.sessionCount} label="Sessions this week" unit={`/ ${plannedDays}`} />
            <Stat value={formatKg(weeklyTonnage(sessions, weekStart))} label="Tonnage this week" />
            <Stat value={`${streak}w`} label="Streak of met weeks" />
            <Stat value={sessions.length} label="Sessions logged" />
          </section>

          {plan ? (
            <div className="flex flex-col gap-1">
              <Meter
                value={adherence.sessionCount}
                max={Math.max(1, plannedDays)}
                label={`Sessions this week against a plan of ${plannedDays}`}
              />
              <p className="hint">
                {adherence.met
                  ? 'This week is met. The streak counts weeks that are already over, so it moves on Monday.'
                  : `${Math.max(0, plannedDays - adherence.sessionCount)} more session(s) meets the plan this week.`}
              </p>
            </div>
          ) : null}

          <section className="panel p-4">
            <MuscleVolumeChart counts={counts} weekStart={weekStart} />
          </section>

          <section className="panel p-4">
            <TonnageChart weeks={weeks} />
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="train-pbs">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id="train-pbs" className="eyebrow">
                Personal bests
              </h2>
              <p className="hint">
                An estimated 1RM is only quoted where the set it came from was at or under ten
                reps. Past that the formula stops describing anything real, so nothing is quoted —
                a number there would be invented, not estimated.
              </p>
            </div>

            <ul className="grid gap-3 md:grid-cols-2" data-testid="train-personal-bests">
              {loggedExerciseIds.map((id) => {
                const best = personalBests(sessions, id)
                if (best.kind === 'none') return null
                const name = exerciseById(id)?.name ?? id
                const estimate = estimatedOneRepMax(best.heaviestLoad)
                return (
                  <li key={id} className="panel flex min-w-0 flex-col gap-2 p-4">
                    <p className="font-[family-name:var(--font-display)] text-base">{name}</p>
                    <p className="readout text-sm">
                      {best.heaviestLoad.reps} &times; {formatLoad(best.heaviestLoad.load)}
                      <span className="ml-2 text-[var(--text-faint)]">{best.heaviestLoad.date}</span>
                    </p>
                    {best.bestEstimatedOneRepMax ? (
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <Tag variant="outline">Est. 1RM</Tag>
                        <span className="readout">{formatKg(best.bestEstimatedOneRepMax.value)}</span>
                        <span className="text-[var(--text-faint)]">
                          Epley, {best.bestEstimatedOneRepMax.date}
                        </span>
                      </p>
                    ) : (
                      <p className="hint">
                        No meaningful 1RM estimate.{' '}
                        {estimate.kind === 'not_meaningful' ? estimate.reason : ''}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
