import { describe, expect, it } from 'vitest'
import { opsSummary } from '@/lib/ops/summary'
import { makeTask } from './helpers'

describe('lib/ops/summary', () => {
  const now = new Date(2026, 8, 14, 9, 0) // Monday, 2026-09-14

  it('no tasks or goals: idle-but-ok, nothing due', () => {
    const summary = opsSummary({ tasks: [], goals: [], now })
    expect(summary.status).toBe('ok')
    expect(summary.headline).toBe('Nothing due today.')
    expect(summary.metrics.length).toBeLessThanOrEqual(3)
  })

  it('produces the exact example headline: N due today, one overdue since a named weekday', () => {
    const dueToday = [
      makeTask({ dueDate: '2026-09-14' }),
      makeTask({ dueDate: '2026-09-14' }),
      makeTask({ dueDate: '2026-09-14' }),
    ]
    // 2026-09-08 is a Tuesday.
    const overdue = makeTask({ dueDate: '2026-09-08' })

    const summary = opsSummary({ tasks: [...dueToday, overdue], goals: [], now })
    expect(summary.headline).toBe('3 due today, one overdue since Tuesday.')
    expect(summary.status).toBe('attention')
  })

  it('is never more than three metrics, per the summary seam contract', () => {
    const summary = opsSummary({ tasks: [makeTask({ dueDate: '2026-09-14' })], goals: [], now })
    expect(summary.metrics.length).toBeLessThanOrEqual(3)
  })

  it('reports the local date matching `now`', () => {
    const summary = opsSummary({ tasks: [], goals: [], now })
    expect(summary.date).toBe('2026-09-14')
  })

  it('status is "behind" (not "attention") when only goals are behind pace and nothing is overdue', () => {
    const behindGoal = {
      id: 'g1',
      title: 'behind',
      target: 100,
      unit: 'pages',
      current: 1,
      startDate: '2026-01-01',
      deadline: '2026-09-15',
    }
    const summary = opsSummary({ tasks: [], goals: [behindGoal], now })
    expect(summary.status).toBe('behind')
  })
})
