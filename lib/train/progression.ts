import { exerciseById } from './exercises'
import type { Exercise, Session } from './types'

/** Default working-set rep range, used when a suggestion doesn't specify one. */
export const DEFAULT_REP_RANGE: [number, number] = [8, 12]

/**
 * Hard ceiling on a single suggested load increase, in kilograms.
 *
 * This is independent of the per-exercise increment below: whatever the
 * progression rule computes, it is clamped to this before it is ever
 * returned. A bug that proposes +20kg is not a bad number, it's an injury,
 * so the cap is enforced last and unconditionally rather than trusted to
 * fall out of correct increment logic.
 */
export const MAX_LOAD_INCREASE_KG = 5

/**
 * How many consecutive sessions without an improvement count as a stall.
 *
 * Two flat sessions in a row is easily explained by a bad night's sleep or
 * a skipped warm-up. Three is a pattern across separate training days and
 * is treated as a real plateau rather than noise.
 */
export const STALL_SESSIONS = 3

/** Fraction the load drops on a deload after a detected stall. */
export const DELOAD_FRACTION = 0.1

function defaultIncrementKg(exercise: Exercise): number {
  if (!exercise.compound) return 1
  if (exercise.pattern === 'squat' || exercise.pattern === 'hinge') return 5
  return 2.5
}

function roundToHalf(kg: number): number {
  return Math.round(kg * 2) / 2
}

/** Clamps a proposed load increase to the stated safety cap. */
export function clampLoadIncrease(currentLoad: number, proposedLoad: number): number {
  const increase = proposedLoad - currentLoad
  if (increase <= MAX_LOAD_INCREASE_KG) return proposedLoad
  return currentLoad + MAX_LOAD_INCREASE_KG
}

interface SessionBestSet {
  date: string
  reps: number
  load: number
}

/** The heaviest set per session for one exercise, in chronological order. */
function bestSetsPerSession(sessions: Session[], exerciseId: string): SessionBestSet[] {
  return [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((session) => {
      const sets = session.sets.filter((s) => s.exerciseId === exerciseId)
      if (sets.length === 0) return null
      const best = sets.reduce((a, b) => (b.load > a.load || (b.load === a.load && b.reps > a.reps) ? b : a))
      return { date: session.date, reps: best.reps, load: best.load }
    })
    .filter((x): x is SessionBestSet => x !== null)
}

function improved(prev: SessionBestSet, next: SessionBestSet): boolean {
  return next.load > prev.load || (next.load === prev.load && next.reps > prev.reps)
}

export type TrainingSuggestion =
  | { kind: 'insufficient_data'; exerciseId: string; message: string }
  | {
      kind: 'progress'
      exerciseId: string
      suggestedLoad: number
      suggestedReps: number
      rationale: string
    }
  | {
      kind: 'deload'
      exerciseId: string
      suggestedLoad: number
      suggestedReps: number
      rationale: string
    }

/**
 * Suggests the next session's load and reps for one exercise from this
 * app's own logged history only.
 *
 * Rule: **double progression**. Within `repRange`, add a rep each session at
 * the same load; once the top of the range is met, reset to the bottom of
 * the range and add load (capped at `MAX_LOAD_INCREASE_KG`). This is the
 * standard, defensible default for hypertrophy/general-fitness work: it
 * only asks for one thing to improve at a time (reps, then load), which is
 * easier to recover from and easier to judge honestly than jumping both at
 * once.
 *
 * Before applying it, checks for a stall: `STALL_SESSIONS` consecutive
 * sessions with no improvement suggests a deload instead (see
 * `DELOAD_FRACTION`).
 */
export function suggestNextSession(
  sessions: Session[],
  exerciseId: string,
  repRange: [number, number] = DEFAULT_REP_RANGE,
): TrainingSuggestion {
  const history = bestSetsPerSession(sessions, exerciseId)
  if (history.length === 0) {
    return {
      kind: 'insufficient_data',
      exerciseId,
      message: 'No logged sets for this exercise yet — log a first working set to get a suggestion.',
    }
  }

  const last = history[history.length - 1]
  const [lo, hi] = repRange

  if (history.length >= STALL_SESSIONS) {
    const window = history.slice(-STALL_SESSIONS)
    let stalled = true
    for (let i = 1; i < window.length; i++) {
      if (improved(window[i - 1], window[i])) {
        stalled = false
        break
      }
    }
    if (stalled) {
      const deloadLoad = roundToHalf(last.load * (1 - DELOAD_FRACTION))
      return {
        kind: 'deload',
        exerciseId,
        suggestedLoad: deloadLoad,
        suggestedReps: lo,
        rationale: `No improvement across the last ${STALL_SESSIONS} sessions — deloading ${Math.round(DELOAD_FRACTION * 100)}% and resetting to the bottom of the rep range.`,
      }
    }
  }

  const exercise = exerciseById(exerciseId)
  if (last.reps < hi) {
    return {
      kind: 'progress',
      exerciseId,
      suggestedLoad: last.load,
      suggestedReps: Math.min(last.reps + 1, hi),
      rationale: `Same load, one more rep (last session: ${last.reps} reps at ${last.load}kg, top of range is ${hi}).`,
    }
  }

  const increment = exercise ? defaultIncrementKg(exercise) : 2.5
  const proposed = last.load + increment
  const suggestedLoad = clampLoadIncrease(last.load, roundToHalf(proposed))
  return {
    kind: 'progress',
    exerciseId,
    suggestedLoad,
    suggestedReps: lo,
    rationale: `Top of the rep range was met at ${last.load}kg — adding load and resetting to ${lo} reps.`,
  }
}
