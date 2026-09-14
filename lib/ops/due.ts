/**
 * Due / overdue / upcoming classification.
 *
 * Deliberately date-only, not datetime-only: a task's `dueTime` orders it
 * within its calendar day (see `lib/ops/priority.ts`) but never promotes it
 * to "overdue" before that day has actually ended. A task due today at
 * 23:59 is "due today" at 09:00, at 23:00, and at 23:58 — it only becomes
 * overdue once `now`'s local calendar date is later than `dueDate`. This
 * matches the spec: due/overdue is evaluated on the user's local calendar
 * day, never by crossing a UTC boundary or a same-day clock reading.
 */
import { compareDates, diffDays, localDateOf, type IsoDate } from './date'
import type { Task } from './types'

export type DueBucket = 'overdue' | 'dueToday' | 'upcoming' | 'noDueDate'

export interface DueClassification {
  overdue: Task[]
  dueToday: Task[]
  /** Due strictly after today, within `withinDays` (inclusive). Excludes today. */
  upcoming: Task[]
  noDueDate: Task[]
}

/** Which bucket a single task falls in "now". Completed tasks are never due. */
export function dueBucket(task: Task, now: Date, withinDays: number): DueBucket {
  if (task.completed) return 'noDueDate' // not due; caller should filter completed tasks out first
  if (!task.dueDate) return 'noDueDate'
  const today = localDateOf(now)
  const cmp = compareDates(task.dueDate, today)
  if (cmp < 0) return 'overdue'
  if (cmp === 0) return 'dueToday'
  if (diffDays(today, task.dueDate) <= withinDays) return 'upcoming'
  return 'noDueDate' // due, but further out than the requested window
}

export function isOverdue(task: Task, now: Date): boolean {
  if (task.completed || !task.dueDate) return false
  return compareDates(task.dueDate, localDateOf(now)) < 0
}

export function isDueToday(task: Task, now: Date): boolean {
  if (task.completed || !task.dueDate) return false
  return compareDates(task.dueDate, localDateOf(now)) === 0
}

/** How many whole days overdue; 0 if not overdue (including tasks with no due date). */
export function daysOverdue(task: Task, now: Date): number {
  if (!isOverdue(task, now) || !task.dueDate) return 0
  return diffDays(task.dueDate, localDateOf(now))
}

/**
 * Classifies incomplete tasks into overdue / due today / upcoming (within
 * `withinDays`) / everything else. Completed tasks are excluded entirely —
 * they are never "due".
 */
export function classifyTasks(tasks: readonly Task[], now: Date, withinDays: number): DueClassification {
  const today = localDateOf(now)
  const overdue: Task[] = []
  const dueToday: Task[] = []
  const upcoming: Task[] = []
  const noDueDate: Task[] = []

  for (const task of tasks) {
    if (task.completed) continue
    if (!task.dueDate) {
      noDueDate.push(task)
      continue
    }
    const cmp = compareDates(task.dueDate, today)
    if (cmp < 0) overdue.push(task)
    else if (cmp === 0) dueToday.push(task)
    else if (diffDays(today, task.dueDate) <= withinDays) upcoming.push(task)
  }

  return { overdue, dueToday, upcoming, noDueDate }
}

/** Local date helper re-exported for callers that just need "today" from `now`. */
export function todayFrom(now: Date): IsoDate {
  return localDateOf(now)
}
