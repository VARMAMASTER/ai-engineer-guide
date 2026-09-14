/**
 * Ops persistence. The only file in `lib/ops/**` that performs I/O.
 *
 * Everything else in this directory is pure and takes `now` as a parameter;
 * this is the edge where a real clock and a real database are allowed in. The
 * split is what keeps the 62 logic tests free of a network, and it is why
 * every function here takes the Supabase client as an ARGUMENT rather than
 * reaching for one: a module-level client would be constructed during the
 * server render of anything that imports this file.
 *
 * SCOPING. Every row carries `user_id`, every policy on the three `ops_`
 * tables checks it, and the client used here is the browser client, which
 * carries the user's own token. RLS is therefore doing the scoping — the
 * `user_id` written below makes the INSERT satisfy `with check`, it is not the
 * thing keeping other people's rows out. A bug in a filter here cannot return
 * somebody else's data.
 *
 * WRITE POLICY. Online-first, like the rest of the app (spec section 3): a
 * write that fails throws, the caller surfaces it, and nothing is queued. What
 * this file does NOT do is optimistically rewrite local state and hope — the
 * callers re-read after a write, so what is on screen is what is in the table.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { completeTask } from './tasks'
import {
  GOAL_COLUMNS,
  REMINDER_COLUMNS,
  TASK_COLUMNS,
  goalToRow,
  reminderToRow,
  rowsToGoals,
  rowsToReminders,
  rowsToTasks,
  taskToRow,
  type GoalRow,
  type ReminderRow,
  type TaskRow,
} from './rows'
import type { Goal, ReminderRule, Task } from './types'

export interface OpsData {
  tasks: Task[]
  goals: Goal[]
  reminders: ReminderRule[]
  /**
   * Rows the database returned that did not parse. Surfaced rather than
   * swallowed — see `ParseOutcome` in `rows.ts`.
   */
  skipped: number
}

export const EMPTY_OPS_DATA: OpsData = { tasks: [], goals: [], reminders: [], skipped: 0 }

/**
 * A fresh identifier for a row this app is about to create.
 *
 * Minted in the browser rather than by the database because the pure layer
 * needs it: `completeTask` returns the next occurrence as an `Omit<Task, 'id'>`
 * precisely because a pure function cannot invent one, so the id has to exist
 * before the round trip, not after it. `crypto.randomUUID` is available in
 * every browser this app supports and in Node 19+; the fallback exists for the
 * jsdom-in-CI case rather than for production.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ops-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function fail(what: string, message: string): never {
  throw new Error(`Could not ${what}: ${message}`)
}

/** Everything this account holds in Ops, in one round trip per table. */
export async function loadOps(supabase: SupabaseClient): Promise<OpsData> {
  const [tasks, goals, reminders] = await Promise.all([
    supabase.from('ops_task').select(TASK_COLUMNS),
    supabase.from('ops_goal').select(GOAL_COLUMNS),
    supabase.from('ops_reminder').select(REMINDER_COLUMNS),
  ])

  if (tasks.error) fail('load your tasks', tasks.error.message)
  if (goals.error) fail('load your goals', goals.error.message)
  if (reminders.error) fail('load your reminders', reminders.error.message)

  const parsedTasks = rowsToTasks((tasks.data ?? []) as unknown as TaskRow[])
  const parsedGoals = rowsToGoals((goals.data ?? []) as unknown as GoalRow[])
  const parsedReminders = rowsToReminders((reminders.data ?? []) as unknown as ReminderRow[])

  return {
    tasks: parsedTasks.items,
    goals: parsedGoals.items,
    reminders: parsedReminders.items,
    skipped: parsedTasks.skipped + parsedGoals.skipped + parsedReminders.skipped,
  }
}

/* -------------------------------------------------------------------------- */
/* Tasks                                                                       */
/* -------------------------------------------------------------------------- */

export async function saveTask(supabase: SupabaseClient, userId: string, task: Task): Promise<void> {
  const { error } = await supabase
    .from('ops_task')
    .upsert({ user_id: userId, ...taskToRow(task), updated_at: new Date().toISOString() })
  if (error) fail('save that task', error.message)
}

export async function deleteTask(supabase: SupabaseClient, id: string): Promise<void> {
  // No `.eq('user_id', ...)`: the delete policy already restricts this to the
  // caller's own rows, and a redundant filter here would read as though it were
  // the thing providing the safety. Reminders attached to the task go with it
  // through the composite foreign key's cascade.
  const { error } = await supabase.from('ops_task').delete().eq('id', id)
  if (error) fail('delete that task', error.message)
}

export interface CompletionOutcome {
  completed: Task
  /** The occurrence that was spawned, or null when the task does not recur. */
  next: Task | null
}

/**
 * Tick a task off, and — if it recurs — write its next occurrence.
 *
 * The decision is `completeTask`'s, not this function's: which date the next
 * occurrence is computed from is the schedule-vs-completion `basis` on the
 * rule, and it is settled in `tasks.ts`. All this adds is an identifier and a
 * round trip.
 *
 * Both rows go in ONE `upsert` call. Two sequential writes could leave a task
 * ticked off with its successor missing — which, for a recurring obligation,
 * is precisely the failure the recurrence exists to prevent.
 */
export async function completeAndAdvance(
  supabase: SupabaseClient,
  userId: string,
  task: Task,
  now: Date,
): Promise<CompletionOutcome> {
  const { completed, next } = completeTask(task, now)
  const nextTask: Task | null = next ? { ...next, id: newId() } : null

  const stamp = new Date().toISOString()
  const rows = [{ user_id: userId, ...taskToRow(completed), updated_at: stamp }]
  if (nextTask) rows.push({ user_id: userId, ...taskToRow(nextTask), updated_at: stamp })

  const { error } = await supabase.from('ops_task').upsert(rows)
  if (error) fail('complete that task', error.message)

  return { completed, next: nextTask }
}

/** Undo a completion. Deliberately does NOT remove a spawned occurrence — see below. */
export async function reopenTask(supabase: SupabaseClient, userId: string, task: Task): Promise<Task> {
  const reopened: Task = { ...task, completed: false, completedAt: undefined }
  await saveTask(supabase, userId, reopened)
  return reopened
}

/* -------------------------------------------------------------------------- */
/* Goals                                                                       */
/* -------------------------------------------------------------------------- */

export async function saveGoal(supabase: SupabaseClient, userId: string, goal: Goal): Promise<void> {
  const { error } = await supabase
    .from('ops_goal')
    .upsert({ user_id: userId, ...goalToRow(goal), updated_at: new Date().toISOString() })
  if (error) fail('save that goal', error.message)
}

export async function deleteGoal(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('ops_goal').delete().eq('id', id)
  if (error) fail('delete that goal', error.message)
}

/* -------------------------------------------------------------------------- */
/* Reminder rules — rules only. Nothing here sends anything.                   */
/* -------------------------------------------------------------------------- */

export async function saveReminder(
  supabase: SupabaseClient,
  userId: string,
  rule: ReminderRule,
): Promise<void> {
  const { error } = await supabase
    .from('ops_reminder')
    .upsert({ user_id: userId, ...reminderToRow(rule) })
  if (error) fail('save that reminder', error.message)
}

export async function deleteReminder(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('ops_reminder').delete().eq('id', id)
  if (error) fail('delete that reminder', error.message)
}
