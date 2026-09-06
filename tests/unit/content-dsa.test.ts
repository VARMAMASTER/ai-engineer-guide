import { describe, it, expect } from 'vitest'
import { dsaPatterns, dsaProblems } from '@/content/dsa'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

describe('dsa bank', () => {
  it('has 18 patterns with unique sequential order', () => {
    expect(dsaPatterns).toHaveLength(18)
    const orders = dsaPatterns.map((p) => p.order).sort((a, b) => a - b)
    expect(orders).toEqual(Array.from({ length: 18 }, (_, i) => i + 1))
  })

  it('has exactly 150 problems, 75 of them core', () => {
    expect(dsaProblems).toHaveLength(150)
    expect(dsaProblems.filter((p) => p.core)).toHaveLength(75)
  })

  it('has the expected count in each pattern', () => {
    const counts: Record<string, number> = {
      'dsap-arrays-hashing': 9, 'dsap-two-pointers': 5, 'dsap-sliding-window': 6,
      'dsap-stack': 7, 'dsap-binary-search': 7, 'dsap-linked-list': 11,
      'dsap-trees': 15, 'dsap-heap': 7, 'dsap-backtracking': 9, 'dsap-tries': 3,
      'dsap-graphs': 13, 'dsap-advanced-graphs': 6, 'dsap-dp-1d': 12,
      'dsap-dp-2d': 11, 'dsap-greedy': 8, 'dsap-intervals': 6,
      'dsap-math-geometry': 8, 'dsap-bit-manipulation': 7,
    }
    for (const [patternId, expected] of Object.entries(counts)) {
      expect(dsaProblems.filter((p) => p.patternId === patternId).length, patternId).toBe(expected)
    }
  })

  it('has unique LeetCode numbers', () => {
    const nums = dsaProblems.map((p) => p.leetcodeNumber)
    expect(new Set(nums).size).toBe(150)
  })

  it('passes schema and url validation', () => {
    const c = {
      dsaPatterns, dsaProblems,
      sdPatterns: [], sdQuestions: [], lldPatterns: [], lldQuestions: [],
      topics: [], topicQuestions: [],
      projects: [], milestones: [], docs: [], readings: [], weeks: [], days: [],
    } as ValidatableContent
    expect(validate(c)).toEqual([])
  })

  it('gives every pattern signals, a template, and pitfalls', () => {
    for (const p of dsaPatterns) {
      expect(p.signals.length, p.id).toBeGreaterThanOrEqual(2)
      expect(p.template.length, p.id).toBeGreaterThan(40)
      expect(p.pitfalls.length, p.id).toBeGreaterThanOrEqual(2)
    }
  })
})
