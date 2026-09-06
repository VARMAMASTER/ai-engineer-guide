import { describe, it, expect } from 'vitest'
import { sdPatterns, sdQuestions } from '@/content/system-design'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

describe('system design bank', () => {
  it('has 10 general and 10 ml patterns', () => {
    expect(sdPatterns.filter((p) => p.group === 'general')).toHaveLength(10)
    expect(sdPatterns.filter((p) => p.group === 'ml')).toHaveLength(10)
  })

  it('prefixes general patterns with sdp- and ml patterns with mlp-', () => {
    for (const p of sdPatterns) {
      expect(p.id.startsWith(p.group === 'general' ? 'sdp-' : 'mlp-'), p.id).toBe(true)
    }
  })

  it('has at least 60 questions, every one attached to a real pattern', () => {
    expect(sdQuestions.length).toBeGreaterThanOrEqual(60)
    const ids = new Set(sdPatterns.map((p) => p.id))
    for (const q of sdQuestions) expect(ids.has(q.patternId), q.id).toBe(true)
  })

  it('gives every pattern at least two questions', () => {
    for (const p of sdPatterns) {
      expect(sdQuestions.filter((q) => q.patternId === p.id).length, p.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('includes the five AI infrastructure questions', () => {
    for (const id of [
      'sdq-chatgpt-style-chat', 'sdq-enterprise-rag-search', 'sdq-llm-serving-platform',
      'sdq-ai-coding-assistant', 'sdq-agent-safeguards',
    ]) {
      expect(sdQuestions.some((q) => q.id === id), id).toBe(true)
    }
  })

  it('gives every question at least two prompts in each of the six steps', () => {
    for (const q of sdQuestions) {
      for (const step of ['define', 'data', 'architecture', 'evaluate', 'deploy', 'wrapup'] as const) {
        expect(q.steps[step].length, `${q.id}.${step}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('gives every question a solution covering all six steps', () => {
    for (const q of sdQuestions) {
      for (const step of ['define', 'data', 'architecture', 'evaluate', 'deploy', 'wrapup'] as const) {
        expect(q.solution[step].trim().length, `${q.id}.solution.${step}`).toBeGreaterThan(0)
      }
    }
  })

  it('has no placeholder-length solution step: every step is at least 40 characters', () => {
    for (const q of sdQuestions) {
      for (const step of ['define', 'data', 'architecture', 'evaluate', 'deploy', 'wrapup'] as const) {
        expect(q.solution[step].length, `${q.id}.solution.${step}`).toBeGreaterThanOrEqual(40)
      }
    }
  })

  it('gives every solution at least two sized estimates', () => {
    for (const q of sdQuestions) {
      expect(q.solution.numbers.length, q.id).toBeGreaterThanOrEqual(2)
      for (const n of q.solution.numbers) expect(n.trim().length, q.id).toBeGreaterThan(0)
    }
  })

  it('makes every delivery budget sum exactly to the question minutes', () => {
    for (const q of sdQuestions) {
      const b = q.delivery.budget
      const total = b.requirements + b.estimates + b.apiAndData + b.architecture + b.deepDive + b.wrapUp
      expect(total, `${q.id} budget`).toBe(q.minutes)
    }
  })

  it('gives every delivery an opening line, two traps, and two pushbacks', () => {
    for (const q of sdQuestions) {
      expect(q.delivery.opening.trim().length, q.id).toBeGreaterThan(0)
      expect(q.delivery.traps.length, `${q.id} traps`).toBeGreaterThanOrEqual(2)
      expect(q.delivery.whenPushed.length, `${q.id} whenPushed`).toBeGreaterThanOrEqual(2)
      for (const w of q.delivery.whenPushed) {
        expect(w.challenge.trim().length, q.id).toBeGreaterThan(0)
        expect(w.answer.trim().length, q.id).toBeGreaterThan(0)
      }
    }
  })

  it('gives every question a mermaid flowchart with at least one edge', () => {
    for (const q of sdQuestions) {
      expect(q.diagram.trim().length, `${q.id} diagram`).toBeGreaterThan(0)
      expect(q.diagram.startsWith('flowchart'), `${q.id} diagram`).toBe(true)
      expect(q.diagram.includes('-->'), `${q.id} diagram`).toBe(true)
    }
  })

  it('draws a diagram with real mechanism, not three nodes', () => {
    for (const q of sdQuestions) {
      const edges = q.diagram.split('\n').filter((l) => l.includes('-->') || l.includes('-.->'))
      expect(edges.length, `${q.id} diagram edges`).toBeGreaterThanOrEqual(4)
    }
  })

  it('passes schema validation', () => {
    const c = {
      dsaPatterns: [], dsaProblems: [], sdPatterns, sdQuestions,
      lldPatterns: [], lldQuestions: [],
      topics: [], topicQuestions: [], projects: [], milestones: [],
      docs: [], readings: [], weeks: [], days: [],
    } as ValidatableContent
    expect(validate(c)).toEqual([])
  })
})
