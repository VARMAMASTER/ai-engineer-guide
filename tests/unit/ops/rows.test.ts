import { describe, expect, it } from 'vitest'
import {
  goalToRow,
  reminderToRow,
  rowToGoal,
  rowToReminder,
  rowToTask,
  rowsToGoals,
  rowsToReminders,
  rowsToTasks,
  taskToRow,
  type GoalRow,
  type ReminderRow,
  type TaskRow,
} from '@/lib/ops/rows'
import type { Goal, ReminderRule, Task } from '@/lib/ops/types'

/**
 * The row boundary is the one place an Ops value changes shape, so it is the
 * one place a value can silently change MEANING. These assert the three
 * conversions that are easy to get wrong and impossible to see in a diff:
 * absent-as-null vs absent-as-undefined, numeric-as-string, and a `recurrence`
 * blob that is validated rather than trusted.
 */

function taskRow(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 't1',
    title: 'Pay the rent',
    notes: null,
    due_date: '2026-10-01',
    due_time: null,
    priority: 'high',
    tags: [],
    completed: false,
    completed_on: null,
    recurrence: null,
    created_on: '2026-09-14',
    ...overrides,
  }
}

describe('rowToTask', () => {
  it('turns absent columns into absent fields, not nulls', () => {
    const task = rowToTask(taskRow())
    expect(task.notes).toBeUndefined()
    expect(task.dueTime).toBeUndefined()
    expect(task.completedAt).toBeUndefined()
    expect(task.recurrence).toBeUndefined()
    // Null would fail TaskSchema outright, so a regression here is loud — but
    // only because this is asserted; the schema is what turns it into a throw.
    expect(task.dueDate).toBe('2026-10-01')
  })

  it('keeps the domain created date out of the row audit stamp', () => {
    expect(rowToTask(taskRow()).createdAt).toBe('2026-09-14')
  })

  it('parses a recurrence blob against the schema rather than casting it', () => {
    const task = rowToTask(
      taskRow({
        recurrence: { type: 'monthlyByWeekday', ordinal: 3, weekday: 2, overflow: 'clamp', basis: 'schedule' },
      }),
    )
    expect(task.recurrence).toEqual({
      type: 'monthlyByWeekday',
      ordinal: 3,
      weekday: 2,
      overflow: 'clamp',
      basis: 'schedule',
    })
  })

  it('applies the schema defaults a stored rule may predate', () => {
    // A rule written before `basis` existed has no basis column of its own —
    // the schema's default is what makes an old row readable rather than a
    // migration.
    const task = rowToTask(taskRow({ recurrence: { type: 'daily' } }))
    expect(task.recurrence).toEqual({ type: 'daily', basis: 'schedule' })
  })

  it('refuses a row that violates a schema refinement', () => {
    // A time with no date. The table has the same CHECK, so this is belt and
    // braces — but the parse is what stops it reaching `reminderFiresAt`.
    expect(() => rowToTask(taskRow({ due_date: null, due_time: '09:00' }))).toThrow()
  })
})

describe('taskToRow', () => {
  it('round-trips a task unchanged', () => {
    const task: Task = {
      id: 't2',
      title: 'Weekly review',
      notes: 'Inbox to zero',
      dueDate: '2026-09-18',
      dueTime: '17:30',
      priority: 'medium',
      tags: ['admin'],
      completed: false,
      recurrence: { type: 'weekly', weekdays: [5], basis: 'schedule' },
      createdAt: '2026-09-14',
    }
    expect(rowToTask(taskToRow(task) as TaskRow)).toEqual(task)
  })

  it('writes absent optional fields as null, which is what the column holds', () => {
    const row = taskToRow({
      id: 't3',
      title: 'Something',
      priority: 'low',
      tags: [],
      completed: false,
      createdAt: '2026-09-14',
    })
    expect(row.notes).toBeNull()
    expect(row.due_date).toBeNull()
    expect(row.due_time).toBeNull()
    expect(row.completed_on).toBeNull()
    expect(row.recurrence).toBeNull()
  })
})

describe('goals', () => {
  const row: GoalRow = {
    id: 'g1',
    title: 'Read 12 papers',
    // PostgREST can hand `numeric` back as a string; both spellings must land
    // on a number, or every pace calculation silently concatenates instead.
    target: '12',
    unit: 'papers',
    current_value: '3.5',
    start_date: '2026-09-01',
    deadline: '2026-12-31',
    linked_task_ids: null,
  }

  it('coerces numeric columns arriving as strings', () => {
    const goal = rowToGoal(row)
    expect(goal.target).toBe(12)
    expect(goal.current).toBe(3.5)
  })

  it('renames current_value to the domain field and back', () => {
    const goal: Goal = {
      id: 'g2',
      title: 'Walk',
      target: 100,
      unit: 'km',
      current: 40,
      startDate: '2026-01-01',
      deadline: '2026-06-30',
      linkedTaskIds: [],
    }
    expect(goalToRow(goal).current_value).toBe(40)
    expect(rowToGoal(goalToRow(goal))).toEqual(goal)
  })

  it('refuses a deadline before the start date', () => {
    expect(() => rowToGoal({ ...row, start_date: '2026-12-31', deadline: '2026-09-01' })).toThrow()
  })
})

describe('reminders', () => {
  it('round-trips a rule', () => {
    const rule: ReminderRule = { id: 'r1', taskId: 't1', offsetMinutes: 30 }
    expect(rowToReminder(reminderToRow(rule))).toEqual(rule)
  })

  it('coerces an offset arriving as a string', () => {
    const row: ReminderRow = { id: 'r2', task_id: 't1', offset_minutes: '1440' }
    expect(rowToReminder(row).offsetMinutes).toBe(1440)
  })
})

describe('batch parsing', () => {
  it('skips an unreadable row and counts it rather than throwing the page away', () => {
    const outcome = rowsToTasks([
      taskRow({ id: 'ok' }),
      taskRow({ id: 'bad', recurrence: { type: 'weekly', weekdays: [] } }),
      taskRow({ id: 'ok2' }),
    ])
    expect(outcome.items.map((t) => t.id)).toEqual(['ok', 'ok2'])
    expect(outcome.skipped).toBe(1)
  })

  it('counts nothing skipped when every row parses', () => {
    expect(rowsToGoals([]).skipped).toBe(0)
    expect(rowsToReminders([{ id: 'r', task_id: 't', offset_minutes: 0 }]).items).toHaveLength(1)
  })
})
