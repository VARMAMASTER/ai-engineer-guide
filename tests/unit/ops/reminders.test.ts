import { describe, expect, it } from 'vitest'
import { dueReminders, reminderFiresAt } from '@/lib/ops/reminders'
import { makeTask } from './helpers'
import type { ReminderRule } from '@/lib/ops/types'

describe('lib/ops/reminders', () => {
  it('a task with no due time has no fireable instant', () => {
    const task = makeTask({ dueDate: '2026-09-14' })
    const rule: ReminderRule = { id: 'r1', taskId: task.id, offsetMinutes: 30 }
    expect(reminderFiresAt(rule, task)).toBeNull()
  })

  it('a task with no due date at all has no fireable instant', () => {
    const task = makeTask({})
    const rule: ReminderRule = { id: 'r1', taskId: task.id, offsetMinutes: 30 }
    expect(reminderFiresAt(rule, task)).toBeNull()
  })

  it('fires the given number of minutes before the due instant, rolling back across a day boundary', () => {
    const task = makeTask({ dueDate: '2026-09-14', dueTime: '00:10' })
    const rule: ReminderRule = { id: 'r1', taskId: task.id, offsetMinutes: 20 }
    expect(reminderFiresAt(rule, task)).toBe('2026-09-13T23:50')
  })

  it('dueReminders fires a rule whose instant has just arrived', () => {
    const task = makeTask({ dueDate: '2026-09-14', dueTime: '10:00' })
    const rule: ReminderRule = { id: 'r1', taskId: task.id, offsetMinutes: 15 }
    const now = new Date(2026, 8, 14, 9, 45) // exactly the fire instant
    const due = dueReminders([rule], [task], now)
    expect(due).toHaveLength(1)
    expect(due[0].firesAt).toBe('2026-09-14T09:45')
  })

  it('dueReminders does not fire a rule whose instant is still in the future', () => {
    const task = makeTask({ dueDate: '2026-09-14', dueTime: '10:00' })
    const rule: ReminderRule = { id: 'r1', taskId: task.id, offsetMinutes: 15 }
    const now = new Date(2026, 8, 14, 9, 0)
    expect(dueReminders([rule], [task], now)).toEqual([])
  })

  it('dueReminders does not replay a reminder far in the past (beyond the grace window)', () => {
    const task = makeTask({ dueDate: '2026-09-01', dueTime: '10:00' })
    const rule: ReminderRule = { id: 'r1', taskId: task.id, offsetMinutes: 15 }
    const now = new Date(2026, 8, 14, 9, 45)
    expect(dueReminders([rule], [task], now, 60)).toEqual([])
  })

  it('dueReminders never fires for a completed task', () => {
    const task = makeTask({ dueDate: '2026-09-14', dueTime: '10:00', completed: true, completedAt: '2026-09-13' })
    const rule: ReminderRule = { id: 'r1', taskId: task.id, offsetMinutes: 15 }
    const now = new Date(2026, 8, 14, 9, 45)
    expect(dueReminders([rule], [task], now)).toEqual([])
  })
})
