import { describe, it, expect } from 'vitest'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

function base(): ValidatableContent {
  return {
    dsaPatterns: [], dsaProblems: [],
    sdPatterns: [], sdQuestions: [],
    topics: [], topicQuestions: [],
    projects: [], milestones: [], docs: [],
    readings: [], weeks: [], days: [],
  }
}

describe('validate', () => {
  it('reports duplicate ids', () => {
    const c = base()
    c.topics = [
      { id: 'topic-a', name: 'A', order: 1, summary: 's' },
      { id: 'topic-a', name: 'B', order: 2, summary: 's' },
    ]
    expect(validate(c).some((e) => e.includes('duplicate id: topic-a'))).toBe(true)
  })

  it('reports an unresolvable refId', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday',
      tasks: [{ refId: 'dsa-999-nope', track: 'dsa', minutes: 30 }],
    }]
    expect(validate(c).some((e) => e.includes('unresolved refId: dsa-999-nope'))).toBe(true)
  })

  it('accepts a fixed review id as a refId', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-05', number: 5, weekId: 'week-01', kind: 'weekday',
      tasks: [{ refId: 'review-week', taskId: 'day-05-review-week', track: 'review', minutes: 10 }],
    }]
    expect(validate(c).some((e) => e.includes('unresolved refId'))).toBe(false)
  })

  it('reports a duplicate completion key', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [
      { id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday',
        tasks: [{ refId: 'review-week', track: 'review', minutes: 10 }] },
      { id: 'day-02', number: 2, weekId: 'week-01', kind: 'weekday',
        tasks: [{ refId: 'review-week', track: 'review', minutes: 10 }] },
    ]
    expect(validate(c).some((e) => e.includes('duplicate completion key: review-week'))).toBe(true)
  })

  it('reports a weekday without exactly two DSA tasks', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday',
      tasks: [{ refId: 'review-week', track: 'review', minutes: 10 }],
    }]
    expect(validate(c).some((e) => e.includes('day-01: expected 2 dsa tasks, found 0'))).toBe(true)
  })

  it('reports a weekend day that does not total 300 minutes', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-06', number: 6, weekId: 'week-01', kind: 'weekend',
      tasks: [{ refId: 'review-week', taskId: 'day-06-build', track: 'build', minutes: 250 }],
    }]
    expect(validate(c).some((e) => e.includes('day-06: weekend day totals 250 minutes, expected 300'))).toBe(true)
  })

  it('reports a week outside the minute tolerance', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-01', number: 1, weekId: 'week-01', kind: 'special',
      tasks: [{ refId: 'review-mock', track: 'review', minutes: 60 }],
    }]
    expect(validate(c).some((e) => e.includes('week-01: 60 minutes planned, expected 1290 to 1410'))).toBe(true)
  })

  it('reports a day with no tasks', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{ id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday', tasks: [] }]
    expect(validate(c).some((e) => e.includes('day-01: has no tasks'))).toBe(true)
  })

  it('reports a bad LeetCode url', () => {
    const c = base()
    c.dsaPatterns = [{ id: 'dsap-x', name: 'X', order: 1, signals: ['s'], template: 't', pitfalls: ['p'] }]
    c.dsaProblems = [{
      id: 'dsa-1-two-sum', patternId: 'dsap-x', name: 'Two Sum', leetcodeNumber: 1,
      url: 'http://leetcode.com/problems/two-sum', difficulty: 'easy', core: true,
      companies: [], minutes: 20,
    }]
    expect(validate(c).some((e) => e.includes('dsa-1-two-sum: invalid LeetCode url'))).toBe(true)
  })

  it('reports the wrong DSA bank size once the bank is populated', () => {
    const c = base()
    c.dsaPatterns = [{ id: 'dsap-x', name: 'X', order: 1, signals: ['s'], template: 't', pitfalls: ['p'] }]
    c.dsaProblems = [{
      id: 'dsa-1-two-sum', patternId: 'dsap-x', name: 'Two Sum', leetcodeNumber: 1,
      url: 'https://leetcode.com/problems/two-sum/', difficulty: 'easy', core: true,
      companies: [], minutes: 20,
    }]
    const errs = validate(c)
    expect(errs.some((e) => e.includes('dsa bank has 1 problems, expected 150'))).toBe(true)
    expect(errs.some((e) => e.includes('dsa bank has 1 core problems, expected 75'))).toBe(true)
  })

  it('reports a project without exactly four milestones', () => {
    const c = base()
    c.projects = [{
      id: 'proj-rag', month: 1, name: 'RAG', goal: 'g', architecture: 'a',
      constraints: ['c'], defense: ['d'],
    }]
    expect(validate(c).some((e) => e.includes('proj-rag: has 0 milestones, expected 4'))).toBe(true)
  })

  it('passes clean content', () => {
    expect(validate(base())).toEqual([])
  })
})
