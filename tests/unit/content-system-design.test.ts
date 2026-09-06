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

  it('passes schema validation', () => {
    const c = {
      dsaPatterns: [], dsaProblems: [], sdPatterns, sdQuestions,
      topics: [], topicQuestions: [], projects: [], milestones: [],
      docs: [], readings: [], weeks: [], days: [],
    } as ValidatableContent
    expect(validate(c)).toEqual([])
  })
})
