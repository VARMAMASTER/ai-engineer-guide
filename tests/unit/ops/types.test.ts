import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OVERFLOW_POLICY,
  DEFAULT_RECURRENCE_BASIS,
  parseGoal,
  parseReminderRule,
  parseRecurrenceRule,
  parseTask,
} from '@/lib/ops/types'

describe('lib/ops/types (zod boundary validation)', () => {
  it('parses a minimal valid task and fills in defaults', () => {
    const task = parseTask({
      id: 't1',
      title: 'Ship the thing',
      priority: 'high',
      createdAt: '2026-09-14',
    })
    expect(task.tags).toEqual([])
    expect(task.completed).toBe(false)
  })

  it('rejects a task with a dueTime but no dueDate', () => {
    expect(() =>
      parseTask({
        id: 't1',
        title: 'bad',
        priority: 'low',
        createdAt: '2026-09-14',
        dueTime: '09:00',
      }),
    ).toThrow()
  })

  it('rejects a task marked completed with no completedAt', () => {
    expect(() =>
      parseTask({
        id: 't1',
        title: 'bad',
        priority: 'low',
        createdAt: '2026-09-14',
        completed: true,
      }),
    ).toThrow()
  })

  it('rejects a malformed date string', () => {
    expect(() =>
      parseTask({
        id: 't1',
        title: 'bad date',
        priority: 'low',
        createdAt: '09/14/2026',
      }),
    ).toThrow()
  })

  it('applies the default recurrence basis (schedule) when omitted', () => {
    const rule = parseRecurrenceRule({ type: 'daily' })
    expect(rule.basis).toBe(DEFAULT_RECURRENCE_BASIS)
    expect(rule.basis).toBe('schedule')
  })

  it('applies the default overflow policy (clamp) when omitted', () => {
    const rule = parseRecurrenceRule({ type: 'monthlyByDayOfMonth', day: 31 })
    if (rule.type !== 'monthlyByDayOfMonth') throw new Error('unexpected type')
    expect(rule.overflow).toBe(DEFAULT_OVERFLOW_POLICY)
    expect(rule.overflow).toBe('clamp')
  })

  it('rejects a weekly rule with no weekdays', () => {
    expect(() => parseRecurrenceRule({ type: 'weekly', weekdays: [] })).toThrow()
  })

  it('parses a goal and rejects one whose start is after its deadline', () => {
    const goal = parseGoal({
      id: 'g1',
      title: 'Read 12 books',
      target: 12,
      unit: 'books',
      startDate: '2026-01-01',
      deadline: '2026-12-31',
    })
    expect(goal.current).toBe(0)

    expect(() =>
      parseGoal({
        id: 'g2',
        title: 'impossible',
        target: 1,
        unit: 'things',
        startDate: '2026-12-31',
        deadline: '2026-01-01',
      }),
    ).toThrow()
  })

  it('parses a reminder rule', () => {
    const rule = parseReminderRule({ id: 'r1', taskId: 't1', offsetMinutes: 30 })
    expect(rule.offsetMinutes).toBe(30)
  })

  it('rejects a negative reminder offset', () => {
    expect(() => parseReminderRule({ id: 'r1', taskId: 't1', offsetMinutes: -5 })).toThrow()
  })
})
