import { describe, expect, it } from 'vitest'
import { classifyTasks, daysOverdue, isDueToday, isOverdue } from '@/lib/ops/due'
import { makeTask } from './helpers'

describe('lib/ops/due', () => {
  it('no tasks: every bucket is empty', () => {
    const result = classifyTasks([], new Date(2026, 8, 14, 9, 0), 7)
    expect(result).toEqual({ overdue: [], dueToday: [], upcoming: [], noDueDate: [] })
  })

  it('a task due today at 23:59 is due today, not overdue, right up to the last minute of the day', () => {
    const task = makeTask({ dueDate: '2026-09-14', dueTime: '23:59' })
    const justBeforeMidnight = new Date(2026, 8, 14, 23, 59, 30)
    expect(isDueToday(task, justBeforeMidnight)).toBe(true)
    expect(isOverdue(task, justBeforeMidnight)).toBe(false)
  })

  it('becomes overdue only once the calendar day has actually turned over', () => {
    const task = makeTask({ dueDate: '2026-09-14', dueTime: '23:59' })
    const nextMorning = new Date(2026, 8, 15, 0, 0, 1)
    expect(isOverdue(task, nextMorning)).toBe(true)
    expect(isDueToday(task, nextMorning)).toBe(false)
  })

  it('an overdue recurring task that was never completed is still just overdue', () => {
    const task = makeTask({
      dueDate: '2026-09-01',
      recurrence: { type: 'daily', basis: 'schedule' },
    })
    const now = new Date(2026, 8, 14, 12, 0)
    expect(isOverdue(task, now)).toBe(true)
    expect(daysOverdue(task, now)).toBe(13)
    // Recurrence never auto-advances a task that hasn't been completed —
    // that only happens through `completeTask` (see tasks.test.ts).
    expect(task.dueDate).toBe('2026-09-01')
  })

  it('a completed task is never due, overdue, or upcoming', () => {
    const task = makeTask({ dueDate: '2026-09-01', completed: true, completedAt: '2026-09-01' })
    const now = new Date(2026, 8, 14, 12, 0)
    expect(isOverdue(task, now)).toBe(false)
    const result = classifyTasks([task], now, 7)
    expect(result.overdue).toEqual([])
    expect(result.noDueDate).toEqual([])
  })

  it('classifies overdue, due-today and upcoming-within-N-days tasks separately', () => {
    const overdueTask = makeTask({ dueDate: '2026-09-10' })
    const todayTask = makeTask({ dueDate: '2026-09-14' })
    const soonTask = makeTask({ dueDate: '2026-09-18' })
    const farTask = makeTask({ dueDate: '2026-10-01' })
    const noDateTask = makeTask({})
    const now = new Date(2026, 8, 14, 9, 0)

    const result = classifyTasks([overdueTask, todayTask, soonTask, farTask, noDateTask], now, 7)
    expect(result.overdue).toEqual([overdueTask])
    expect(result.dueToday).toEqual([todayTask])
    expect(result.upcoming).toEqual([soonTask])
    // farTask (2026-10-01) has a due date but falls outside the 7-day
    // window, so it belongs to none of these buckets; `noDueDate` means
    // literally "has no due date at all".
    expect(result.noDueDate).toEqual([noDateTask])
  })
})
