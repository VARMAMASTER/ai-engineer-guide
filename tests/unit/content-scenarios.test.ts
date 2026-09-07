import { describe, it, expect } from 'vitest'
import { scenarios, scenarioSchema, type ScenarioArea } from '@/content/scenarios'

const AREAS: ScenarioArea[] = ['rag', 'agent', 'inference', 'prompt', 'evaluation', 'safety']

const normalise = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

describe('debugging scenario bank', () => {
  it('has at least 60 scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(60)
  })

  it('has unique ids matching scn-<slug>', () => {
    const ids = scenarios.map((s) => s.id)
    expect(new Set(ids).size, 'duplicate scenario id').toBe(ids.length)
    for (const scenario of scenarios) {
      expect(scenario.id, scenario.id).toMatch(/^scn-[a-z0-9-]+$/)
    }
  })

  it('covers all six areas with at least 8 scenarios each', () => {
    for (const area of AREAS) {
      const inArea = scenarios.filter((s) => s.area === area)
      expect(inArea.length, `area ${area} is thin`).toBeGreaterThanOrEqual(8)
    }
    // No stray areas beyond the six.
    expect([...new Set(scenarios.map((s) => s.area))].sort()).toEqual([...AREAS].sort())
  })

  it('gives every scenario at least 2 things to establish before proposing a fix', () => {
    for (const scenario of scenarios) {
      expect(scenario.firstQuestions.length, scenario.id).toBeGreaterThanOrEqual(2)
      for (const question of scenario.firstQuestions) {
        expect(question.trim().length, `${scenario.id}: first question too vague`)
          .toBeGreaterThan(40)
      }
    }
  })

  it('gives every scenario at least 2 candidate causes', () => {
    for (const scenario of scenarios) {
      expect(scenario.causes.length, scenario.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('makes every cause falsifiable - a hypothesis paired with a real check', () => {
    for (const scenario of scenarios) {
      for (const cause of scenario.causes) {
        expect(cause.hypothesis.trim().length, `${scenario.id}: hypothesis too short`)
          .toBeGreaterThan(40)
        // "Chunk boundaries split the fact" is an opinion. The check is what makes it a
        // diagnosis, so it has to describe an observation someone could actually make.
        expect(cause.check.trim().length, `${scenario.id}: check too short to be actionable`)
          .toBeGreaterThan(40)
      }
    }
  })

  it('never repeats a symptom - two scenarios with the same symptom are one scenario', () => {
    const seen = new Map<string, string>()
    for (const scenario of scenarios) {
      const key = normalise(scenario.symptom)
      const previous = seen.get(key)
      expect(previous, `${scenario.id} repeats the symptom of ${previous}`).toBeUndefined()
      seen.set(key, scenario.id)
    }
  })

  it('states symptoms concretely rather than as a category of badness', () => {
    for (const scenario of scenarios) {
      // "retrieval is bad" is not a scenario. A real symptom carries an observation.
      expect(scenario.symptom.trim().length, `${scenario.id}: symptom too vague`)
        .toBeGreaterThan(120)
    }
  })

  it('has a non-empty fix, tradeoff and senior signal on every scenario', () => {
    for (const scenario of scenarios) {
      expect(scenario.fix.trim().length, `${scenario.id}: fix`).toBeGreaterThan(80)
      // Every real fix costs something. A tradeoff nobody wrote down is a tradeoff
      // nobody thought about.
      expect(scenario.tradeoff.trim().length, `${scenario.id}: tradeoff`).toBeGreaterThan(80)
      expect(scenario.seniorSignal.trim().length, `${scenario.id}: seniorSignal`)
        .toBeGreaterThan(60)
    }
  })

  it('does not resolve every scenario into the same advice', () => {
    // Sixty scenarios all ending in "add evaluation and monitoring" is a failed bank.
    const fixes = scenarios.map((s) => normalise(s.fix))
    expect(new Set(fixes).size).toBe(fixes.length)
    const monitoringOnly = fixes.filter((f) => /^add (evaluation|monitoring|observability)/.test(f))
    expect(monitoringOnly.length, 'too many fixes open with the same reflex').toBeLessThan(3)
  })

  it('keeps every scenario inside a 10-20 minute discussion', () => {
    for (const scenario of scenarios) {
      expect(scenario.minutes, scenario.id).toBeGreaterThanOrEqual(10)
      expect(scenario.minutes, scenario.id).toBeLessThanOrEqual(20)
    }
  })

  it('passes the scenario schema', () => {
    for (const scenario of scenarios) {
      const parsed = scenarioSchema.safeParse(scenario)
      expect(parsed.success, `${scenario.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })
})
