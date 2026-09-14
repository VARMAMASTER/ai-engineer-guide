import { describe, expect, it } from 'vitest'
import { explainPriority, prioritize } from '@/lib/ops/priority'
import { makeTask } from './helpers'

describe('lib/ops/priority', () => {
  const now = new Date(2026, 8, 14, 9, 0) // 2026-09-14

  it('no tasks: an empty ordering', () => {
    expect(prioritize([], now)).toEqual([])
  })

  it('excludes completed tasks entirely', () => {
    const done = makeTask({ dueDate: '2026-09-01', completed: true, completedAt: '2026-09-01' })
    expect(prioritize([done], now)).toEqual([])
  })

  it('overdue beats due-today beats due-soon beats no-date, regardless of priority', () => {
    const noDate = makeTask({ title: 'no date', priority: 'high' })
    const dueSoon = makeTask({ title: 'due soon', priority: 'high', dueDate: '2026-09-20' })
    const dueToday = makeTask({ title: 'due today', priority: 'low' })
    dueToday.dueDate = '2026-09-14'
    const overdue = makeTask({ title: 'overdue', priority: 'low', dueDate: '2026-09-01' })

    const ordered = prioritize([noDate, dueSoon, dueToday, overdue], now)
    expect(ordered.map((t) => t.title)).toEqual(['overdue', 'due today', 'due soon', 'no date'])
  })

  it('within the same bucket, high priority beats medium beats low', () => {
    const low = makeTask({ title: 'low', priority: 'low', dueDate: '2026-09-14' })
    const high = makeTask({ title: 'high', priority: 'high', dueDate: '2026-09-14' })
    const medium = makeTask({ title: 'medium', priority: 'medium', dueDate: '2026-09-14' })

    const ordered = prioritize([low, high, medium], now)
    expect(ordered.map((t) => t.title)).toEqual(['high', 'medium', 'low'])
  })

  it('ties within bucket and priority break by earliest due date, then by the oldest task', () => {
    const laterDue = makeTask({ title: 'later', priority: 'high', dueDate: '2026-09-25', createdAt: '2026-01-01' })
    const earlierDue = makeTask({ title: 'earlier', priority: 'high', dueDate: '2026-09-16', createdAt: '2026-01-01' })
    const olderSameDue = makeTask({ title: 'older', priority: 'high', dueDate: '2026-09-16', createdAt: '2025-01-01' })

    const ordered = prioritize([laterDue, earlierDue, olderSameDue], now)
    expect(ordered.map((t) => t.title)).toEqual(['older', 'earlier', 'later'])
  })

  it('explainPriority narrates the ordering rule in one sentence', () => {
    const overdue = makeTask({ dueDate: '2026-09-10', priority: 'high' })
    expect(explainPriority(overdue, now)).toBe('Overdue by 4 days and high priority.')

    const dueToday = makeTask({ dueDate: '2026-09-14', priority: 'medium' })
    expect(explainPriority(dueToday, now)).toBe('Due today and medium priority.')

    const noDate = makeTask({ priority: 'low' })
    expect(explainPriority(noDate, now)).toBe('No due date; ranked by low priority alone.')
  })
})
