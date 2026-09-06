import { describe, it, expect } from 'vitest'
import { lldPatterns, lldQuestions } from '@/content/lld'
import { lldPatternSchema, lldQuestionSchema } from '@/lib/content/schema'

const PATTERN_IDS = new Set(lldPatterns.map((p) => p.id))

describe('lld pattern bank', () => {
  it('has exactly 8 patterns with order 1..8 and no duplicate ids', () => {
    expect(lldPatterns).toHaveLength(8)
    expect(lldPatterns.map((p) => p.order).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(PATTERN_IDS.size).toBe(8)
  })

  it('has ids matching lldp-<slug>', () => {
    for (const pattern of lldPatterns) {
      expect(pattern.id, pattern.id).toMatch(/^lldp-[a-z0-9-]+$/)
    }
  })

  it('covers the eight areas the spec names', () => {
    expect([...PATTERN_IDS].sort()).toEqual([
      'lldp-behavioural', 'lldp-concurrency', 'lldp-creational', 'lldp-interfaces',
      'lldp-modelling', 'lldp-solid', 'lldp-structural', 'lldp-testability',
    ])
  })

  it('gives every pattern a non-empty whenWrong and at least 2 pitfalls', () => {
    for (const pattern of lldPatterns) {
      expect(pattern.whenWrong.trim().length, pattern.id).toBeGreaterThan(0)
      expect(pattern.pitfalls.length, pattern.id).toBeGreaterThanOrEqual(2)
      for (const pitfall of pattern.pitfalls) expect(pitfall.trim().length).toBeGreaterThan(0)
    }
  })

  it('gives every pattern a runnable-looking Python example, never Java or C++', () => {
    for (const pattern of lldPatterns) {
      expect(pattern.example, pattern.id).toMatch(/\bdef \w+\(/)
      expect(pattern.example, pattern.id).not.toMatch(/\b(public|std::|#include|System\.out)\b/)
      expect(pattern.example.split('\n').length, pattern.id).toBeGreaterThan(10)
    }
  })

  it('passes the pattern schema', () => {
    for (const pattern of lldPatterns) {
      const parsed = lldPatternSchema.safeParse(pattern)
      expect(parsed.success, `${pattern.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })

  it('provides a class diagram for the three structural patterns', () => {
    const withDiagram = lldPatterns.filter((p) => p.diagram).map((p) => p.id).sort()
    expect(withDiagram).toEqual(['lldp-behavioural', 'lldp-creational', 'lldp-structural'])
    for (const pattern of lldPatterns.filter((p) => p.diagram)) {
      expect(pattern.diagram!.startsWith('classDiagram'), pattern.id).toBe(true)
      expect(pattern.diagram!.match(/^\s*class \w+/gm)?.length ?? 0).toBeGreaterThanOrEqual(3)
      expect(pattern.diagram!, pattern.id).toMatch(/(<\|--|<\|\.\.|\*--|o--|-->)/)
    }
  })
})

describe('lld machine-coding bank', () => {
  it('has exactly 25 problems with unique ids matching lldq-<slug>', () => {
    expect(lldQuestions).toHaveLength(25)
    expect(new Set(lldQuestions.map((q) => q.id)).size).toBe(25)
    for (const question of lldQuestions) {
      expect(question.id, question.id).toMatch(/^lldq-[a-z0-9-]+$/)
    }
  })

  it('covers the 25 problems the spec names', () => {
    expect(lldQuestions.map((q) => q.id).sort()).toEqual([
      'lldq-atm', 'lldq-billing-discounts', 'lldq-bookmyshow-seat-booking', 'lldq-chess',
      'lldq-deck-of-cards', 'lldq-elevator-system', 'lldq-file-system', 'lldq-food-ordering',
      'lldq-hotel-booking', 'lldq-inventory-management', 'lldq-library-management',
      'lldq-logging-framework', 'lldq-lru-cache', 'lldq-notification-service',
      'lldq-parking-lot', 'lldq-pub-sub', 'lldq-rate-limiter', 'lldq-ride-hailing-dispatch',
      'lldq-snake-and-ladder', 'lldq-splitwise', 'lldq-task-scheduler', 'lldq-text-editor',
      'lldq-tic-tac-toe', 'lldq-undo-redo', 'lldq-vending-machine',
    ])
  })

  it('references only real lldp- pattern ids', () => {
    for (const question of lldQuestions) {
      expect(question.patterns.length, question.id).toBeGreaterThan(0)
      for (const patternId of question.patterns) {
        expect(PATTERN_IDS.has(patternId), `${question.id} -> ${patternId}`).toBe(true)
      }
    }
  })

  it('exercises every pattern at least once across the bank', () => {
    const used = new Set(lldQuestions.flatMap((q) => q.patterns))
    expect([...PATTERN_IDS].filter((id) => !used.has(id))).toEqual([])
  })

  it('has at least 3 clarifying questions and at least 2 extensions each', () => {
    for (const question of lldQuestions) {
      expect(question.clarify.length, question.id).toBeGreaterThanOrEqual(3)
      expect(question.clarify.length, question.id).toBeLessThanOrEqual(5)
      expect(question.extensions.length, question.id).toBeGreaterThanOrEqual(2)
      expect(question.extensions.length, question.id).toBeLessThanOrEqual(4)
      for (const item of [...question.clarify, ...question.extensions]) {
        expect(item.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('has a substantial Python solution sketch for every problem', () => {
    for (const question of lldQuestions) {
      expect(question.solution.length, question.id).toBeGreaterThan(200)
      expect(question.solution, question.id).toMatch(/\bclass \w+/)
      expect(question.solution, question.id).toMatch(/\bdef \w+\(/)
      expect(question.solution, question.id).not.toMatch(/\b(public|std::|#include|System\.out)\b/)
    }
  })

  it('names entities with relationships, and keeps minutes in the 45..90 round range', () => {
    for (const question of lldQuestions) {
      expect(question.entities.length, question.id).toBeGreaterThanOrEqual(2)
      expect(question.minutes, question.id).toBeGreaterThanOrEqual(45)
      expect(question.minutes, question.id).toBeLessThanOrEqual(90)
      expect(question.companies.length, question.id).toBeGreaterThan(0)
    }
  })

  it('gives every problem a class diagram with real relationships', () => {
    for (const question of lldQuestions) {
      const diagram = question.diagram
      expect(diagram.trim().length, question.id).toBeGreaterThan(0)
      expect(diagram.startsWith('classDiagram'), question.id).toBe(true)
      const classes = diagram.match(/^\s*class \w+/gm) ?? []
      expect(classes.length, question.id).toBeGreaterThanOrEqual(3)
      const arrows = diagram.match(/^\s*\w+\s+(<\|--|<\|\.\.|\*--|o--|-->)\s+\w+/gm) ?? []
      expect(arrows.length, `${question.id} has no relationship arrows`).toBeGreaterThanOrEqual(1)
    }
  })

  it('uses composition or aggregation somewhere, not only plain associations', () => {
    for (const question of lldQuestions) {
      expect(question.diagram, question.id).toMatch(/^\s*\w+\s+(\*--|o--)\s+\w+/m)
    }
  })

  it('declares in the diagram every class the diagram wires up', () => {
    for (const question of lldQuestions) {
      const declared = new Set(
        [...question.diagram.matchAll(/^\s*class (\w+)/gm)].map((m) => m[1]),
      )
      const arrows = [
        ...question.diagram.matchAll(/^\s*(\w+)\s+(?:<\|--|<\|\.\.|\*--|o--|-->)\s+(\w+)/gm),
      ]
      for (const [, left, right] of arrows) {
        expect(declared.has(left), `${question.id}: ${left} used but not declared`).toBe(true)
        expect(declared.has(right), `${question.id}: ${right} used but not declared`).toBe(true)
      }
    }
  })

  it('passes the question schema', () => {
    for (const question of lldQuestions) {
      const parsed = lldQuestionSchema.safeParse(question)
      expect(parsed.success, `${question.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })
})
