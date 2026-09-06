import { describe, it, expect } from 'vitest'
import { dayNumber, weekNumber, streak, weekProgress, month1Checks } from '@/lib/progress/selectors'
import { content, completionKey } from '@/lib/content/index'

describe('dayNumber', () => {
  it('is 1 on the start date', () => {
    expect(dayNumber('2026-09-07', '2026-09-07')).toBe(1)
  })
  it('counts forward', () => {
    expect(dayNumber('2026-09-07', '2026-09-20')).toBe(14)
  })
  it('is null with no start date', () => {
    expect(dayNumber(null, '2026-09-07')).toBeNull()
  })
  it('clamps to 1 before the start date', () => {
    expect(dayNumber('2026-09-07', '2026-09-01')).toBe(1)
  })
})

describe('weekNumber', () => {
  it('puts days 1 to 7 in week 1 and day 8 in week 2', () => {
    expect(weekNumber('2026-09-07', '2026-09-07')).toBe(1)
    expect(weekNumber('2026-09-07', '2026-09-13')).toBe(1)
    expect(weekNumber('2026-09-07', '2026-09-14')).toBe(2)
  })
})

describe('streak', () => {
  it('is 0 with no completions', () => {
    expect(streak({}, '2026-09-10')).toBe(0)
  })
  it('counts consecutive days ending today', () => {
    const completed = { a: '2026-09-08', b: '2026-09-09', c: '2026-09-10' }
    expect(streak(completed, '2026-09-10')).toBe(3)
  })
  it('survives one day of grace when today has nothing yet', () => {
    const completed = { a: '2026-09-08', b: '2026-09-09' }
    expect(streak(completed, '2026-09-10')).toBe(2)
  })
  it('breaks after a two-day gap', () => {
    const completed = { a: '2026-09-05', b: '2026-09-06' }
    expect(streak(completed, '2026-09-10')).toBe(0)
  })
  it('counts a day once no matter how many items it holds', () => {
    const completed = { a: '2026-09-10', b: '2026-09-10', c: '2026-09-10' }
    expect(streak(completed, '2026-09-10')).toBe(1)
  })
  it('is 0 when the only completion is dated in the future', () => {
    const completed = { a: '2026-09-11' }
    expect(streak(completed, '2026-09-10')).toBe(0)
  })
})

describe('weekProgress', () => {
  it('reports planned and completed minutes per track for a week', () => {
    const r = weekProgress(1, {})
    expect(r.planned.dsa).toBe(300)
    expect(r.planned.build).toBe(600)
    expect(r.plannedTotal).toBe(1350)
    expect(r.completedTotal).toBe(0)
  })

  it('adds a completed task into its track', () => {
    const r = weekProgress(1, { 'dsa-217-contains-duplicate': '2026-09-07' })
    expect(r.completed.dsa).toBe(30)
    expect(r.completedTotal).toBe(30)
  })

  it('keeps the two duplicate-scheduled topic-transformers occurrences independent by completionKey', () => {
    // topic-transformers is scheduled twice: week 2 Thursday (day-11) and week 3
    // Tuesday (day-16). Each carries a distinct taskId so they must track separately.
    const day11Task = content.days
      .find((d) => d.number === 11)!
      .tasks.find((t) => t.refId === 'topic-transformers')!
    const day16Task = content.days
      .find((d) => d.number === 16)!
      .tasks.find((t) => t.refId === 'topic-transformers')!
    expect(day11Task.taskId).toBe('day-11-study-ml')
    expect(day16Task.taskId).toBe('day-16-study-ml')

    const onlyWeek2Done = { [completionKey(day11Task)]: '2026-09-07' }
    const week2FromWeek2 = weekProgress(2, onlyWeek2Done)
    const week3FromWeek2 = weekProgress(3, onlyWeek2Done)
    expect(week2FromWeek2.completed['study-ml']).toBe(day11Task.minutes)
    expect(week3FromWeek2.completed['study-ml']).toBe(0)
    expect(week2FromWeek2.completed['study-ml']).not.toBe(week3FromWeek2.completed['study-ml'])

    const onlyWeek3Done = { [completionKey(day16Task)]: '2026-09-13' }
    const week2FromWeek3 = weekProgress(2, onlyWeek3Done)
    const week3FromWeek3 = weekProgress(3, onlyWeek3Done)
    expect(week2FromWeek3.completed['study-ml']).toBe(0)
    expect(week3FromWeek3.completed['study-ml']).toBe(day16Task.minutes)
    expect(week2FromWeek3.completed['study-ml']).not.toBe(week3FromWeek3.completed['study-ml'])
  })
})

describe('month1Checks', () => {
  it('reports zeros for an empty record', () => {
    const c = month1Checks({})
    expect(c.problems).toEqual({ done: 0, target: 40 })
    expect(c.patterns).toEqual({ done: 0, target: 8 })
    expect(c.milestones).toEqual({ done: 0, target: 4 })
    expect(c.docs).toEqual({ done: 0, target: 7 })
  })

  it('counts a completed problem, pattern, milestone, and doc', () => {
    const c = month1Checks({
      'dsa-217-contains-duplicate': '2026-09-07',
      'sdp-caching': '2026-09-09',
      'ms-rag-1': '2026-09-13',
      'doc-rag-problem': '2026-10-06',
    })
    expect(c.problems.done).toBe(1)
    expect(c.patterns.done).toBe(1)
    expect(c.milestones.done).toBe(1)
    expect(c.docs.done).toBe(1)
  })

  it('ignores a DSA problem that is not in the month 1 plan', () => {
    const c = month1Checks({ 'dsa-51-n-queens': '2026-09-07' })
    expect(c.problems.done).toBe(0)
  })
})
