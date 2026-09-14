/**
 * Ops's `SummaryProvider` for the Today card (`lib/summary.ts`).
 *
 * Ops does not know Today exists — it just exports `opsSummary`, a pure
 * function from its own data plus `now` to an `AppSummary`. At most three
 * metrics, and a headline that is a sentence a person would actually say,
 * not a metric restated (the spec's own example: "3 due today, one overdue
 * since Tuesday").
 */
import type { AppSummary, AppStatus, SummaryMetric } from '../summary'
import { classifyTasks, daysOverdue } from './due'
import { localDateOf, weekdayName } from './date'
import { goalsNeedingAttention } from './goals'
import type { Goal, Task } from './types'

export interface OpsSummaryInput {
  tasks: readonly Task[]
  goals: readonly Goal[]
  now: Date
}

const UPCOMING_WINDOW_DAYS = 7

/**
 * `idle` and `ok` are different claims, and conflating them was a real bug.
 *
 * An account with no tasks at all reported `ok` — "on track" — which is not
 * false so much as unearned: nothing is on track, there is simply nothing. The
 * agent reads these statuses to decide whether it knows enough to speak, and a
 * brand-new account looked to it like fourteen days of a well-run Ops app. It
 * worked around that by inspecting the history for variation; the honest fix is
 * for Ops to say what it means.
 *
 * `idle` = never used. `ok` = used, and nothing wants you right now.
 */
function statusFor(
  overdueCount: number,
  dueTodayCount: number,
  goalsBehind: number,
  hasAnything: boolean,
): AppStatus {
  if (!hasAnything) return 'idle'
  if (overdueCount > 0) return 'attention'
  if (dueTodayCount > 0 || goalsBehind > 0) return 'behind'
  return 'ok'
}

function headlineFor(overdueCount: number, dueTodayCount: number, oldestOverdue: Task | undefined): string {
  if (overdueCount === 0 && dueTodayCount === 0) return 'Nothing due today.'

  const parts: string[] = []
  if (dueTodayCount > 0) {
    parts.push(`${dueTodayCount} due today`)
  }
  if (overdueCount > 0 && oldestOverdue?.dueDate) {
    const since = weekdayName(oldestOverdue.dueDate)
    const overdueWord = overdueCount === 1 ? 'one overdue' : `${overdueCount} overdue`
    parts.push(`${overdueWord} since ${since}`)
  } else if (overdueCount > 0) {
    parts.push(overdueCount === 1 ? 'one overdue' : `${overdueCount} overdue`)
  }
  return `${parts.join(', ')}.`
}

/** Ops's `SummaryProvider<OpsSummaryInput>`, per `lib/summary.ts`. */
export function opsSummary(input: OpsSummaryInput): AppSummary {
  const { tasks, goals, now } = input
  const { overdue, dueToday, upcoming } = classifyTasks(tasks, now, UPCOMING_WINDOW_DAYS)
  const behindGoals = goalsNeedingAttention(goals, now)

  // Longest-overdue task, so the headline names the day it first slipped.
  const oldestOverdue = [...overdue].sort((a, b) => daysOverdue(b, now) - daysOverdue(a, now))[0]

  // Never used at all, as opposed to used and currently quiet. Counting goals
  // too: a user who only tracks goals has still used Ops.
  const hasAnything = tasks.length > 0 || goals.length > 0

  const status = statusFor(overdue.length, dueToday.length, behindGoals.length, hasAnything)
  const headline = hasAnything
    ? headlineFor(overdue.length, dueToday.length, oldestOverdue)
    : 'Nothing here yet.'

  const metrics: SummaryMetric[] = [
    { label: 'Due today', value: String(dueToday.length) },
    { label: 'Overdue', value: String(overdue.length) },
    { label: 'Upcoming (7d)', value: String(upcoming.length) },
  ]

  return {
    appId: 'ops',
    title: 'Ops',
    href: '/ops',
    status,
    headline,
    metrics,
    date: localDateOf(now),
  }
}
