import { describe, it, expect } from 'vitest'
import { companyGuides } from '@/content/companies'
import { companyGuideSchema } from '@/lib/content/schema'

const EXPECTED_IDS = [
  'co-google', 'co-amazon', 'co-microsoft', 'co-meta', 'co-openai', 'co-anthropic',
]

// Regex shapes for real content ids that a `drill` entry is allowed to reference.
const KNOWN_ID_SHAPES = [
  /dsap-[a-z0-9-]+/g,
  /(?:sdp|mlp)-[a-z0-9-]+/g,
  /lldq-[a-z0-9-]+/g,
  /topic-[a-z0-9-]+/g,
]

function idsMentioned(text: string): string[] {
  const found: string[] = []
  for (const re of KNOWN_ID_SHAPES) {
    const matches = text.match(re)
    if (matches) found.push(...matches)
  }
  return found
}

describe('company guides', () => {
  it('has exactly the six expected guides with unique ids', () => {
    expect(companyGuides).toHaveLength(6)
    expect(new Set(companyGuides.map((g) => g.id)).size).toBe(6)
    expect([...companyGuides.map((g) => g.id)].sort()).toEqual([...EXPECTED_IDS].sort())
  })

  it('has ids matching co-<slug>', () => {
    for (const guide of companyGuides) {
      expect(guide.id, guide.id).toMatch(/^co-[a-z0-9-]+$/)
    }
  })

  it('has order 1..6 with no duplicates', () => {
    expect(companyGuides.map((g) => g.order).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
    expect(new Set(companyGuides.map((g) => g.order)).size).toBe(6)
  })

  it('orders the three companies with real India engineering presence first', () => {
    const byId = new Map(companyGuides.map((g) => [g.id, g.order]))
    const indiaPresence = ['co-google', 'co-amazon', 'co-microsoft']
    const stretchOrRelocation = ['co-meta', 'co-openai', 'co-anthropic']
    const maxIndiaOrder = Math.max(...indiaPresence.map((id) => byId.get(id)!))
    const minOtherOrder = Math.min(...stretchOrRelocation.map((id) => byId.get(id)!))
    expect(maxIndiaOrder).toBeLessThan(minOtherOrder)
  })

  it('gives every guide a non-empty name and level', () => {
    for (const guide of companyGuides) {
      expect(guide.name.trim().length, guide.id).toBeGreaterThan(0)
      expect(guide.level.trim().length, guide.id).toBeGreaterThan(0)
    }
  })

  it('gives every guide at least 3 rounds, each with positive count and minutes', () => {
    for (const guide of companyGuides) {
      expect(guide.rounds.length, guide.id).toBeGreaterThanOrEqual(3)
      for (const round of guide.rounds) {
        expect(round.name.trim().length, `${guide.id}: round name`).toBeGreaterThan(0)
        expect(round.count, `${guide.id}: ${round.name} count`).toBeGreaterThan(0)
        expect(round.minutes, `${guide.id}: ${round.name} minutes`).toBeGreaterThan(0)
        expect(round.what.trim().length, `${guide.id}: ${round.name} what`).toBeGreaterThan(0)
      }
    }
  })

  it('gives every guide at least 2 concrete failsOn entries', () => {
    for (const guide of companyGuides) {
      expect(guide.failsOn.length, guide.id).toBeGreaterThanOrEqual(2)
      for (const item of guide.failsOn) {
        expect(item.trim().length, guide.id).toBeGreaterThan(0)
      }
    }
  })

  it('gives every guide at least 3 drill entries', () => {
    for (const guide of companyGuides) {
      expect(guide.drill.length, guide.id).toBeGreaterThanOrEqual(3)
      for (const item of guide.drill) {
        expect(item.trim().length, guide.id).toBeGreaterThan(0)
      }
    }
  })

  it('gives every guide a non-empty marketNote', () => {
    for (const guide of companyGuides) {
      expect(guide.marketNote.trim().length, guide.id).toBeGreaterThan(0)
    }
  })

  it('has at least one drill entry per guide reference a real content id shape', () => {
    for (const guide of companyGuides) {
      const mentioned = guide.drill.flatMap((d) => idsMentioned(d))
      expect(mentioned.length, `${guide.id}: no recognizable content ids in drill`).toBeGreaterThan(0)
    }
  })

  it('shapes every dsap-/sdp-/mlp-/lldq-/topic- id mentioned in drill text correctly', () => {
    for (const guide of companyGuides) {
      for (const id of guide.drill.flatMap((d) => idsMentioned(d))) {
        expect(id, `${guide.id}: ${id}`).toMatch(/^(dsap|sdp|mlp|lldq|topic)-[a-z0-9-]+$/)
      }
    }
  })

  it('passes the company guide schema', () => {
    for (const guide of companyGuides) {
      const parsed = companyGuideSchema.safeParse(guide)
      expect(parsed.success, `${guide.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })
})
