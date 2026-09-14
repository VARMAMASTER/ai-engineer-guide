/**
 * Ops domain types: tasks, goals, reminder rules, recurrence.
 *
 * Pure data only — no I/O, no database, no framework imports. Validation is
 * with `zod` at the boundary (see `parseTask`/`parseGoal`/`parseReminderRule`
 * below); once parsed, the rest of `lib/ops/**` trusts the TypeScript types.
 */
import { z } from 'zod'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** `YYYY-MM-DD`, local calendar date. */
export const DateSchema = z.string().regex(DATE_RE, 'expected YYYY-MM-DD')
/** `HH:MM`, local 24-hour time. */
export const TimeSchema = z.string().regex(TIME_RE, 'expected HH:MM')

export const PrioritySchema = z.enum(['low', 'medium', 'high'])
export type Priority = z.infer<typeof PrioritySchema>

/** 0 = Sunday .. 6 = Saturday. */
export const WeekdaySchema = z.number().int().min(0).max(6)
export type Weekday = z.infer<typeof WeekdaySchema>

/**
 * Which date a recurring task's next occurrence is computed from.
 *
 * - `'schedule'`: from the previous DUE date, regardless of when it was
 *   completed (or whether it was completed at all). "Rent is due the 1st of
 *   every month" — missing March doesn't push April to the 2nd.
 * - `'completion'`: from the date the task was actually COMPLETED. "Water the
 *   plants every 3 days" — if you water it late, the clock restarts from
 *   when you actually did it, not from when it was originally due.
 *
 * Default is `'schedule'` (see `DEFAULT_RECURRENCE_BASIS`): most recurring
 * obligations (rent, weekly review, monthly report) are calendar-anchored,
 * and schedule-based is the safer default when the caller hasn't thought
 * about the distinction. Habit-style tasks should set `basis: 'completion'`
 * explicitly.
 */
export const RecurrenceBasisSchema = z.enum(['schedule', 'completion'])
export type RecurrenceBasis = z.infer<typeof RecurrenceBasisSchema>

export const DEFAULT_RECURRENCE_BASIS: RecurrenceBasis = 'schedule'

/**
 * What to do when a monthly rule names a day that doesn't exist in a given
 * month (the 31st in a 30-day month, or the 29th/30th/31st in February; or,
 * for `monthlyByWeekday`, a 5th ordinal in a month with only 4).
 *
 * - `'clamp'` (default): fall back to the last valid day/occurrence in that
 *   month. "The 31st" in February means "the last day of February" — the
 *   monthly cadence never silently disappears for a quarter of the year.
 * - `'skip'`: that month is skipped entirely; the next occurrence lands in
 *   the next month that actually has the named day.
 *
 * Both are documented, defensible choices per the spec; `'clamp'` is the
 * default because a bill or reminder that vanishes for a month is a worse
 * surprise than one that lands a day or two early.
 */
export const OverflowPolicySchema = z.enum(['clamp', 'skip'])
export type OverflowPolicy = z.infer<typeof OverflowPolicySchema>

export const DEFAULT_OVERFLOW_POLICY: OverflowPolicy = 'clamp'

export const RecurrenceRuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('daily'),
    basis: RecurrenceBasisSchema.default(DEFAULT_RECURRENCE_BASIS),
  }),
  z.object({
    type: z.literal('everyNDays'),
    n: z.number().int().min(1),
    basis: RecurrenceBasisSchema.default(DEFAULT_RECURRENCE_BASIS),
  }),
  z.object({
    type: z.literal('weekly'),
    /** Which weekdays this recurs on; at least one. */
    weekdays: z.array(WeekdaySchema).min(1),
    basis: RecurrenceBasisSchema.default(DEFAULT_RECURRENCE_BASIS),
  }),
  z.object({
    type: z.literal('monthlyByDayOfMonth'),
    day: z.number().int().min(1).max(31),
    overflow: OverflowPolicySchema.default(DEFAULT_OVERFLOW_POLICY),
    basis: RecurrenceBasisSchema.default(DEFAULT_RECURRENCE_BASIS),
  }),
  z.object({
    type: z.literal('monthlyByWeekday'),
    /** 1st/2nd/3rd/4th/5th, or -1 for "last". */
    ordinal: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(-1),
    ]),
    weekday: WeekdaySchema,
    overflow: OverflowPolicySchema.default(DEFAULT_OVERFLOW_POLICY),
    basis: RecurrenceBasisSchema.default(DEFAULT_RECURRENCE_BASIS),
  }),
])
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>

export const TaskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    notes: z.string().optional(),
    /** Local calendar date the task is due, if any. */
    dueDate: DateSchema.optional(),
    /** Local time-of-day, only meaningful alongside `dueDate`. */
    dueTime: TimeSchema.optional(),
    priority: PrioritySchema,
    tags: z.array(z.string()).default([]),
    completed: z.boolean().default(false),
    /** Local calendar date the task was actually completed, if it was. */
    completedAt: DateSchema.optional(),
    recurrence: RecurrenceRuleSchema.optional(),
    /** Local calendar date the task was created; used only to break ties by age. */
    createdAt: DateSchema,
  })
  .refine((t) => !t.dueTime || !!t.dueDate, {
    message: 'dueTime requires dueDate',
    path: ['dueTime'],
  })
  .refine((t) => !t.completed || !!t.completedAt, {
    message: 'a completed task must record completedAt',
    path: ['completedAt'],
  })
export type Task = z.infer<typeof TaskSchema>

/**
 * A goal's `current` is cumulative progress toward `target`, starting from 0
 * at `startDate` — "5 kg lost", "40 problems solved", "12 chapters read".
 * This is the assumption that makes a single `evaluateGoal` function work
 * uniformly across goal shapes: progress is monotonically non-decreasing
 * from a zero baseline. A goal that instead counts down from a starting
 * value (e.g. "lose weight from 80kg to 75kg") should be modelled by its
 * caller as `current = amount lost so far`, target = 5, not as raw weight.
 */
export const GoalSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    target: z.number().positive(),
    unit: z.string().min(1),
    current: z.number().min(0).default(0),
    /** Local calendar date progress tracking began, for pace calculations. */
    startDate: DateSchema,
    /** Local calendar date the goal is due by. */
    deadline: DateSchema,
    linkedTaskIds: z.array(z.string()).optional(),
  })
  .refine((g) => g.startDate <= g.deadline, {
    message: 'startDate must not be after deadline',
    path: ['deadline'],
  })
export type Goal = z.infer<typeof GoalSchema>

/**
 * A reminder rule: fire this many minutes before a task's due date/time.
 *
 * This is decision logic only — "is this reminder due to fire right now,
 * given `now`" — never delivery. The scheduled sender (web push, VAPID,
 * subscription store) is later-stage infrastructure per the spec; see
 * `lib/ops/reminders.ts`.
 */
export const ReminderRuleSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  /** Minutes before the task's due date/time that this rule should fire. */
  offsetMinutes: z.number().int().min(0),
})
export type ReminderRule = z.infer<typeof ReminderRuleSchema>

export function parseTask(input: unknown): Task {
  return TaskSchema.parse(input)
}

export function parseGoal(input: unknown): Goal {
  return GoalSchema.parse(input)
}

export function parseReminderRule(input: unknown): ReminderRule {
  return ReminderRuleSchema.parse(input)
}

export function parseRecurrenceRule(input: unknown): RecurrenceRule {
  return RecurrenceRuleSchema.parse(input)
}
