/**
 * "What should I do next" — a single, explainable ordering.
 *
 * The rule, in one sentence: **overdue beats due-today beats due-soon beats
 * no-date; within each of those, high priority beats medium beats low; ties
 * break by earliest due date, then by the oldest task.**
 *
 * This is a lexicographic sort over four keys (bucket, priority, due date,
 * age) rather than a weighted score, on purpose — the spec asks for an
 * ordering a user can look at and explain, and nobody can reconstruct why a
 * task with weight 0.4 beat one with weight 0.35. A strict ranking of
 * "which fact wins ties" is something `explainReason` can just narrate.
 * Completed tasks are excluded — they are never "next".
 */
import { compareDates, diffDays, localDateOf } from './date'
import type { Priority, Task } from './types'

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

type Bucket = 0 | 1 | 2 | 3 // overdue | dueToday | upcoming | noDueDate

function bucketOf(task: Task, today: string): Bucket {
  if (!task.dueDate) return 3
  const cmp = compareDates(task.dueDate, today)
  if (cmp < 0) return 0
  if (cmp === 0) return 1
  return 2
}

/** Sort key tuple, in priority order (compared left to right). Exposed for testing/explaining. */
export interface PriorityKey {
  bucket: Bucket
  priorityRank: number
  dueDate: string // sentinel '9999-99-99' when the task has none, so it sorts last within its bucket
  createdAt: string
}

export function priorityKey(task: Task, now: Date): PriorityKey {
  const today = localDateOf(now)
  return {
    bucket: bucketOf(task, today),
    priorityRank: PRIORITY_RANK[task.priority],
    dueDate: task.dueDate ?? '9999-99-99',
    createdAt: task.createdAt,
  }
}

function compareKeys(a: PriorityKey, b: PriorityKey): number {
  if (a.bucket !== b.bucket) return a.bucket - b.bucket
  if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return 0
}

/** Incomplete tasks ordered "what should I do next" first. Stable: equal-key tasks keep their input order. */
export function prioritize(tasks: readonly Task[], now: Date): Task[] {
  return tasks
    .filter((t) => !t.completed)
    .map((task) => ({ task, key: priorityKey(task, now) }))
    .sort((a, b) => compareKeys(a.key, b.key))
    .map(({ task }) => task)
}

/** A one-sentence, human reason a task sits where it does in `prioritize`'s ordering. */
export function explainPriority(task: Task, now: Date): string {
  const today = localDateOf(now)
  const bucket = bucketOf(task, today)
  const priorityWord = task.priority === 'high' ? 'high priority' : task.priority === 'medium' ? 'medium priority' : 'low priority'

  if (bucket === 0 && task.dueDate) {
    const days = diffDays(task.dueDate, today)
    const dayWord = days === 1 ? '1 day' : `${days} days`
    return `Overdue by ${dayWord} and ${priorityWord}.`
  }
  if (bucket === 1) return `Due today and ${priorityWord}.`
  if (bucket === 2 && task.dueDate) {
    const days = diffDays(today, task.dueDate)
    const dayWord = days === 1 ? 'tomorrow' : `in ${days} days`
    return `Due ${dayWord} and ${priorityWord}.`
  }
  return `No due date; ranked by ${priorityWord} alone.`
}
