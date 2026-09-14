/**
 * The row <-> domain boundary for Ops.
 *
 * Split out of `data.ts` on purpose: everything here is a pure transform, so
 * it is asserted directly in `tests/unit/ops/rows.test.ts` with no database,
 * no browser and no network. `data.ts` is then thin enough to read in one
 * sitting, and the part that can actually be wrong is the part under test.
 *
 * THREE CONVERSIONS, EACH LOAD-BEARING.
 *
 * 1. `null` -> `undefined`. Postgres has one absent value; the domain types use
 *    zod `.optional()`, which means `undefined`. Handing a `null` to
 *    `parseTask` fails validation, so the mapping is not cosmetic.
 *
 * 2. `numeric` -> `number`. PostgREST returns `numeric` as a JS number for the
 *    magnitudes this app deals in, but it can arrive as a string, so both are
 *    coerced rather than trusted.
 *
 * 3. Every row is PARSED, not cast. `rowToTask` runs the zod schema, which is
 *    also what validates the `recurrence` JSONB against `RecurrenceRuleSchema`.
 *    A cast would let a malformed rule — one written by an older version of the
 *    app, or by hand — reach `nextOccurrence` and produce a wrong date silently.
 *    A parse turns that into a row that is visibly skipped instead.
 */
import { parseGoal, parseReminderRule, parseTask } from './types'
import type { Goal, ReminderRule, Task } from './types'

/** The columns each table is read with. Written once so a read and a parse cannot drift. */
export const TASK_COLUMNS =
  'id, title, notes, due_date, due_time, priority, tags, completed, completed_on, recurrence, created_on'
export const GOAL_COLUMNS =
  'id, title, target, unit, current_value, start_date, deadline, linked_task_ids'
export const REMINDER_COLUMNS = 'id, task_id, offset_minutes'

export interface TaskRow {
  id: string
  title: string
  notes: string | null
  due_date: string | null
  due_time: string | null
  priority: string
  tags: string[] | null
  completed: boolean
  completed_on: string | null
  recurrence: unknown
  created_on: string
}

export interface GoalRow {
  id: string
  title: string
  target: number | string
  unit: string
  current_value: number | string
  start_date: string
  deadline: string
  linked_task_ids: string[] | null
}

export interface ReminderRow {
  id: string
  task_id: string
  offset_minutes: number | string
}

/** A row written back. `user_id` is added by `data.ts`, which is the only place that knows it. */
export type TaskWrite = Omit<TaskRow, 'recurrence' | 'notes'> & {
  notes: string | null
  recurrence: unknown
}

function num(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

/** `null` (Postgres absent) becomes `undefined` (zod absent). */
function opt<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

export function rowToTask(row: TaskRow): Task {
  return parseTask({
    id: row.id,
    title: row.title,
    notes: opt(row.notes),
    dueDate: opt(row.due_date),
    dueTime: opt(row.due_time),
    priority: row.priority,
    tags: row.tags ?? [],
    completed: row.completed,
    completedAt: opt(row.completed_on),
    recurrence: opt(row.recurrence as Record<string, unknown> | null),
    createdAt: row.created_on,
  })
}

export function taskToRow(task: Task): TaskWrite {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes ?? null,
    due_date: task.dueDate ?? null,
    due_time: task.dueTime ?? null,
    priority: task.priority,
    tags: task.tags,
    completed: task.completed,
    // The CHECK constraint refuses a completed task with no date, exactly as
    // TaskSchema does; this keeps the two from disagreeing about which is set.
    completed_on: task.completedAt ?? null,
    recurrence: task.recurrence ?? null,
    created_on: task.createdAt,
  }
}

export function rowToGoal(row: GoalRow): Goal {
  return parseGoal({
    id: row.id,
    title: row.title,
    target: num(row.target),
    unit: row.unit,
    current: num(row.current_value),
    startDate: row.start_date,
    deadline: row.deadline,
    linkedTaskIds: row.linked_task_ids ?? [],
  })
}

export function goalToRow(goal: Goal): GoalRow {
  return {
    id: goal.id,
    title: goal.title,
    target: goal.target,
    unit: goal.unit,
    current_value: goal.current,
    start_date: goal.startDate,
    deadline: goal.deadline,
    linked_task_ids: goal.linkedTaskIds ?? [],
  }
}

export function rowToReminder(row: ReminderRow): ReminderRule {
  return parseReminderRule({
    id: row.id,
    taskId: row.task_id,
    offsetMinutes: num(row.offset_minutes),
  })
}

export function reminderToRow(rule: ReminderRule): ReminderRow {
  return { id: rule.id, task_id: rule.taskId, offset_minutes: rule.offsetMinutes }
}

/**
 * What a batch of rows parsed into, and how many did not.
 *
 * One unreadable row must not blank the page. The alternative — letting the
 * parse throw — turns a single bad `recurrence` blob into "Ops is broken", and
 * the alternative to THAT, casting instead of parsing, turns it into a silently
 * wrong date. Skipping the row and COUNTING it is the only option that is both
 * survivable and honest: the UI says how many rows it could not read rather
 * than pretending they were never there.
 */
export interface ParseOutcome<T> {
  items: T[]
  skipped: number
}

function parseAll<Row, T>(rows: readonly Row[], parse: (row: Row) => T): ParseOutcome<T> {
  const items: T[] = []
  let skipped = 0
  for (const row of rows) {
    try {
      items.push(parse(row))
    } catch {
      skipped += 1
    }
  }
  return { items, skipped }
}

export function rowsToTasks(rows: readonly TaskRow[]): ParseOutcome<Task> {
  return parseAll(rows, rowToTask)
}

export function rowsToGoals(rows: readonly GoalRow[]): ParseOutcome<Goal> {
  return parseAll(rows, rowToGoal)
}

export function rowsToReminders(rows: readonly ReminderRow[]): ParseOutcome<ReminderRule> {
  return parseAll(rows, rowToReminder)
}
