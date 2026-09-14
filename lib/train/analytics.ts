import { addDays, diffDays } from '../date'
import { exerciseById } from './exercises'
import { muscleGroupSchema, type LoggedSet, type MuscleGroup, type Session } from './types'

/**
 * All analytics here are pure functions of explicitly-passed dates — never
 * `new Date()` internally — so a "three-week gap" or "a deload week" is
 * just a fixture, and results are reproducible in a test forever.
 */

function inWeek(dateIso: string, weekStartIso: string): boolean {
  const offset = diffDays(weekStartIso, dateIso)
  return offset >= 0 && offset <= 6
}

/** Weekly sets per muscle group — the number that actually drives hypertrophy. */
export function weeklySetsByMuscleGroup(sessions: Session[], weekStartIso: string): Record<MuscleGroup, number> {
  const counts = Object.fromEntries(muscleGroupSchema.options.map((mg) => [mg, 0])) as Record<MuscleGroup, number>
  for (const session of sessions) {
    if (!inWeek(session.date, weekStartIso)) continue
    for (const set of session.sets) {
      const exercise = exerciseById(set.exerciseId)
      if (!exercise) continue
      counts[exercise.primaryMuscle] += 1
    }
  }
  return counts
}

export type OneRepMaxResult =
  | { kind: 'estimate'; value: number; formula: 'epley' }
  | { kind: 'not_meaningful'; reason: string }

/**
 * Estimated 1RM via the Epley formula: `load * (1 + reps / 30)`.
 *
 * Epley is used (over Brzycki) because it degrades more gracefully near
 * the top of its usable range rather than approaching a hard asymptote.
 * Either is a fine choice; what matters is naming the one in use.
 *
 * Rep-based 1RM estimates stop being meaningful past about 10 reps — the
 * error compounds and the "1RM" stops describing anything real. Rather
 * than fabricate a number, this returns an explicit `not_meaningful` result.
 */
export function estimatedOneRepMax(set: Pick<LoggedSet, 'reps' | 'load'>): OneRepMaxResult {
  if (set.reps < 1) return { kind: 'not_meaningful', reason: 'At least one rep is required.' }
  if (set.reps > 10) {
    return {
      kind: 'not_meaningful',
      reason: 'Rep-based 1RM estimates are not meaningful past about 10 reps.',
    }
  }
  const value = Math.round(set.load * (1 + set.reps / 30) * 10) / 10
  return { kind: 'estimate', value, formula: 'epley' }
}

/** Total tonnage (load x reps, summed) for one session. */
export function sessionTonnage(session: Session): number {
  return session.sets.reduce((sum, set) => sum + set.load * set.reps, 0)
}

/** Total tonnage across sessions falling in the 7-day window starting `weekStartIso`. */
export function weeklyTonnage(sessions: Session[], weekStartIso: string): number {
  return sessions.filter((s) => inWeek(s.date, weekStartIso)).reduce((sum, s) => sum + sessionTonnage(s), 0)
}

export interface WeeklyAdherence {
  weekStart: string
  sessionCount: number
  plannedDays: number
  met: boolean
}

/** How many sessions landed in one plan week, against the plan's target. */
export function weeklyAdherence(sessions: Session[], weekStartIso: string, plannedDaysPerWeek: number): WeeklyAdherence {
  const sessionCount = sessions.filter((s) => inWeek(s.date, weekStartIso)).length
  return { weekStart: weekStartIso, sessionCount, plannedDays: plannedDaysPerWeek, met: sessionCount >= plannedDaysPerWeek }
}

/**
 * Consecutive weeks (counting back from `referenceWeekStartIso`, inclusive)
 * that met the plan's target session count. Stops at the first week that
 * missed it, so a single bad week resets the streak rather than being
 * averaged away.
 */
export function currentStreakWeeks(
  sessions: Session[],
  plannedDaysPerWeek: number,
  referenceWeekStartIso: string,
): number {
  let streak = 0
  let weekStart = referenceWeekStartIso
  // A generous bound — 10 years of weeks — so a pathological input can
  // never spin this loop forever.
  for (let i = 0; i < 520; i++) {
    if (!weeklyAdherence(sessions, weekStart, plannedDaysPerWeek).met) break
    streak++
    weekStart = addDays(weekStart, -7)
  }
  return streak
}

export type PersonalBest =
  | { kind: 'none' }
  | {
      kind: 'best'
      heaviestLoad: { load: number; reps: number; date: string }
      bestEstimatedOneRepMax?: { value: number; date: string }
    }

/** Personal bests for one exercise: heaviest load logged, and best meaningful estimated 1RM. */
export function personalBests(sessions: Session[], exerciseId: string): PersonalBest {
  type Row = { load: number; reps: number; date: string }
  const rows: Row[] = []
  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.exerciseId === exerciseId) rows.push({ load: set.load, reps: set.reps, date: session.date })
    }
  }
  if (rows.length === 0) return { kind: 'none' }

  const heaviestLoad = rows.reduce((best, r) =>
    r.load > best.load || (r.load === best.load && r.reps > best.reps) ? r : best,
  )

  let bestEstimatedOneRepMax: { value: number; date: string } | undefined
  for (const r of rows) {
    const estimate = estimatedOneRepMax(r)
    if (estimate.kind !== 'estimate') continue
    if (!bestEstimatedOneRepMax || estimate.value > bestEstimatedOneRepMax.value) {
      bestEstimatedOneRepMax = { value: estimate.value, date: r.date }
    }
  }

  return { kind: 'best', heaviestLoad, bestEstimatedOneRepMax }
}
