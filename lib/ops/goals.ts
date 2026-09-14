/**
 * Goal progress, pace, and reachability.
 *
 * `Goal.current` is cumulative progress from a zero baseline at `startDate`
 * toward `target` (see the doc comment on `GoalSchema` in `types.ts`).
 * Everything here is computed against a caller-supplied `now` — never the
 * system clock — so a stalled goal, or one whose deadline has already
 * passed, is fully testable.
 */
import { compareDates, diffDays, localDateOf } from './date'
import type { Goal } from './types'

export type GoalStatus = 'achieved' | 'on-pace' | 'behind' | 'missed'

export interface GoalEvaluation {
  /** current / target, clamped to [0, 1] for display (a meter never exceeds full). */
  fraction: number
  achieved: boolean
  /** True once `now`'s local date is after the deadline. */
  deadlinePassed: boolean
  /** deadline - today, in days. Zero on the deadline itself; negative once passed. */
  daysRemaining: number
  /** today - startDate, in days. Zero or negative before/at the start. */
  daysElapsed: number
  /**
   * Average progress per day so far (`current / daysElapsed`). `null` when
   * no time has elapsed yet to measure a rate (treated as 0 for projection).
   */
  currentPacePerDay: number | null
  /**
   * Progress per day still needed to land exactly on target by the
   * deadline. `null` once the deadline has passed — a required rate to hit
   * a date that is already gone is not a real number.
   */
  requiredPacePerDay: number | null
  /**
   * Whether continuing at `currentPacePerDay` reaches `target` by the
   * deadline. Always `false` once `deadlinePassed` and not yet achieved —
   * this is what stops a goal reporting "97%, on track!" forever after its
   * date has quietly passed.
   */
  onPace: boolean
  status: GoalStatus
}

export function evaluateGoal(goal: Goal, now: Date): GoalEvaluation {
  const today = localDateOf(now)
  const achieved = goal.current >= goal.target
  const deadlinePassed = compareDates(today, goal.deadline) > 0
  const daysRemaining = diffDays(today, goal.deadline)
  const daysElapsed = diffDays(goal.startDate, today)

  const currentPacePerDay = daysElapsed > 0 ? goal.current / daysElapsed : null
  const requiredPacePerDay = deadlinePassed
    ? null
    : daysRemaining > 0
      ? (goal.target - goal.current) / daysRemaining
      : goal.target - goal.current // deadline is today: the whole remainder is due now

  let onPace: boolean
  let status: GoalStatus
  if (achieved) {
    onPace = true
    status = 'achieved'
  } else if (deadlinePassed) {
    onPace = false
    status = 'missed'
  } else {
    const effectiveRate = currentPacePerDay ?? 0
    const projected = goal.current + effectiveRate * daysRemaining
    onPace = projected >= goal.target
    status = onPace ? 'on-pace' : 'behind'
  }

  return {
    fraction: Math.min(1, Math.max(0, goal.current / goal.target)),
    achieved,
    deadlinePassed,
    daysRemaining,
    daysElapsed,
    currentPacePerDay,
    requiredPacePerDay,
    onPace,
    status,
  }
}

/** Goals that are behind pace or already missed, worst first (missed, then most behind). */
export function goalsNeedingAttention(goals: readonly Goal[], now: Date): Goal[] {
  return goals
    .map((goal) => ({ goal, evaluation: evaluateGoal(goal, now) }))
    .filter(({ evaluation }) => evaluation.status === 'behind' || evaluation.status === 'missed')
    .sort((a, b) => {
      if (a.evaluation.status !== b.evaluation.status) {
        return a.evaluation.status === 'missed' ? -1 : 1
      }
      return a.evaluation.daysRemaining - b.evaluation.daysRemaining
    })
    .map(({ goal }) => goal)
}
