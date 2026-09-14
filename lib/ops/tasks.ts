/**
 * Task lifecycle: completing a task, and — when it recurs — spawning the
 * next occurrence. Pure: given a task and "now", returns new task values;
 * never mutates its input, never touches storage.
 */
import { localDateOf, type IsoDate } from './date'
import { nextOccurrence } from './recurrence'
import type { Task } from './types'

export interface CompletionResult {
  /** The completed task: `completed: true`, `completedAt` set to today. */
  completed: Task
  /**
   * The next occurrence, if the task recurs — as a draft without an `id`,
   * since minting identifiers is the caller's job (a pure function cannot
   * invent one deterministically). `null` for a non-recurring task.
   */
  next: Omit<Task, 'id'> | null
}

/**
 * Marks a task complete "now", and — per its recurrence rule's `basis` —
 * computes the next occurrence.
 *
 * `basis: 'schedule'` computes from the task's own `dueDate` (falling back to
 * today if the task somehow has none); `basis: 'completion'` computes from
 * today, i.e. the completion date. See `RecurrenceBasisSchema` in `types.ts`
 * for why these differ and which is the default.
 */
export function completeTask(task: Task, now: Date): CompletionResult {
  const today = localDateOf(now)
  const completed: Task = { ...task, completed: true, completedAt: today }

  if (!task.recurrence) return { completed, next: null }

  const anchor = task.recurrence.basis === 'completion' ? today : (task.dueDate ?? today)
  const nextDue = nextOccurrence(task.recurrence, anchor)

  const next: Omit<Task, 'id'> = {
    ...task,
    dueDate: nextDue,
    completed: false,
    completedAt: undefined,
  }
  return { completed, next }
}

/** Local calendar date a task is anchored to for due/overdue purposes. Undefined if it has none. */
export function taskDueDate(task: Task): IsoDate | undefined {
  return task.dueDate
}
