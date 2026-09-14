import { describe, expect, it } from 'vitest'
import { completeTask } from '@/lib/ops/tasks'
import { makeTask } from './helpers'

describe('lib/ops/tasks', () => {
  const now = new Date(2026, 8, 14, 10, 0) // 2026-09-14

  it('marks a non-recurring task complete and spawns nothing', () => {
    const task = makeTask({ title: 'one-off' })
    const { completed, next } = completeTask(task, now)
    expect(completed.completed).toBe(true)
    expect(completed.completedAt).toBe('2026-09-14')
    expect(next).toBeNull()
  })

  it('a completed task with a recurrence rule spawns the next occurrence', () => {
    const task = makeTask({
      title: 'water the plants',
      dueDate: '2026-09-10',
      recurrence: { type: 'everyNDays', n: 3, basis: 'completion' },
    })
    const { completed, next } = completeTask(task, now)
    expect(completed.completed).toBe(true)
    expect(completed.completedAt).toBe('2026-09-14')
    expect(next).not.toBeNull()
    expect(next?.completed).toBe(false)
    expect(next?.completedAt).toBeUndefined()
    // completion-based: 3 days after the completion date (today), not the old due date.
    expect(next?.dueDate).toBe('2026-09-17')
    expect(next?.title).toBe('water the plants')
  })

  it('schedule-based recurrence anchors the next occurrence to the old due date, not the completion date', () => {
    const task = makeTask({
      title: 'rent',
      dueDate: '2026-09-01',
      recurrence: { type: 'monthlyByDayOfMonth', day: 1, overflow: 'clamp', basis: 'schedule' },
    })
    // Completed two weeks late.
    const { next } = completeTask(task, now)
    expect(next?.dueDate).toBe('2026-10-01')
  })
})
