/**
 * Reminder logic: which reminders are due to fire right now.
 *
 * This is the decision the spec asks for — "the logic that decides what is
 * due" — and nothing more. Sending a web push notification needs VAPID keys,
 * a subscription store and a scheduled sender; that is later-stage
 * infrastructure (`docs/superpowers/specs/2026-09-14-unified-app-design.md`
 * section 2, "Reminders"). This module has no fetch, no storage, no push:
 * it takes rules, tasks and an instant, and returns which rules should fire.
 *
 * A reminder needs both a `dueDate` and a `dueTime` on its task to have a
 * concrete instant to count back from — a date-only task has no "before"
 * to be early relative to, so it never fires and `reminderFiresAt` returns
 * `null` rather than guessing a default time of day.
 */
import { addDays, localDateOf, localTimeOf, type IsoDate, type IsoTime } from './date'
import type { ReminderRule, Task } from './types'

const MINUTES_PER_DAY = 24 * 60

export interface DueReminder {
  rule: ReminderRule
  task: Task
  /** The local instant, `YYYY-MM-DDTHH:MM`, the reminder is scheduled to fire at. */
  firesAt: string
}

/** The local `YYYY-MM-DDTHH:MM` instant a rule fires at, or `null` if its task has no fireable due instant. */
export function reminderFiresAt(rule: ReminderRule, task: Task): string | null {
  if (!task.dueDate || !task.dueTime) return null
  return offsetInstant(task.dueDate, task.dueTime, -rule.offsetMinutes)
}

function offsetInstant(date: IsoDate, time: IsoTime, deltaMinutes: number): string {
  const [h, m] = time.split(':').map(Number)
  let totalMinutes = h * 60 + m + deltaMinutes
  let dayShift = 0
  while (totalMinutes < 0) {
    totalMinutes += MINUTES_PER_DAY
    dayShift -= 1
  }
  while (totalMinutes >= MINUTES_PER_DAY) {
    totalMinutes -= MINUTES_PER_DAY
    dayShift += 1
  }
  const shiftedDate = dayShift === 0 ? date : addDays(date, dayShift)
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `${shiftedDate}T${hh}:${mm}`
}

function toComparableInstant(nowLocalDate: IsoDate, nowLocalTime: IsoTime): string {
  return `${nowLocalDate}T${nowLocalTime}`
}

/**
 * Reminders whose fire instant has arrived: at or before `now`, and not more
 * than `graceMinutes` in the past (default 60) — so a sender that runs every
 * few minutes fires each reminder once, and one that was offline for a day
 * doesn't replay a week of stale reminders when it comes back.
 */
export function dueReminders(
  rules: readonly ReminderRule[],
  tasks: readonly Task[],
  now: Date,
  graceMinutes = 60,
): DueReminder[] {
  const tasksById = new Map(tasks.map((t) => [t.id, t]))
  const nowLocalDate = localDateOf(now)
  const nowLocalTime = localTimeOf(now)
  const nowInstant = toComparableInstant(nowLocalDate, nowLocalTime)
  const earliestInstant = offsetInstant(nowLocalDate, nowLocalTime, -graceMinutes)

  const due: DueReminder[] = []
  for (const rule of rules) {
    const task = tasksById.get(rule.taskId)
    if (!task || task.completed) continue
    const firesAt = reminderFiresAt(rule, task)
    if (firesAt === null) continue
    if (firesAt <= nowInstant && firesAt >= earliestInstant) {
      due.push({ rule, task, firesAt })
    }
  }
  return due
}
