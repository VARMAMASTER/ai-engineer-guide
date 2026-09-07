import { describe, it, expect } from 'vitest'
import {
  aiSdPatterns,
  aiSdQuestions,
  aiSdPatternSchema,
  aiSdQuestionSchema,
} from '@/content/ai-system-design'

const STEPS = ['define', 'data', 'architecture', 'evaluate', 'deploy', 'wrapup'] as const

describe('AI system design bank', () => {
  it('has exactly eight patterns, ordered 1 to 8 with aisdp- ids', () => {
    expect(aiSdPatterns).toHaveLength(8)
    expect(aiSdPatterns.map((p) => p.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    for (const p of aiSdPatterns) expect(p.id.startsWith('aisdp-'), p.id).toBe(true)
  })

  it('covers the eight AI infrastructure shapes the round actually asks about', () => {
    expect(aiSdPatterns.map((p) => p.id)).toEqual([
      'aisdp-llm-serving',
      'aisdp-ai-gateway',
      'aisdp-rag-platform',
      'aisdp-agent-platform',
      'aisdp-eval-platform',
      'aisdp-multimodal',
      'aisdp-training-infra',
      'aisdp-ai-product',
    ])
  })

  it('gives every pattern at least three named trade-offs', () => {
    for (const p of aiSdPatterns) {
      expect(p.tradeoffs.length, p.id).toBeGreaterThanOrEqual(3)
      for (const t of p.tradeoffs) expect(t.length, p.id).toBeGreaterThan(40)
    }
  })

  it('has at least 28 questions with unique aisdq- ids', () => {
    expect(aiSdQuestions.length).toBeGreaterThanOrEqual(28)
    const ids = aiSdQuestions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id.startsWith('aisdq-'), id).toBe(true)
  })

  it('attaches every question to a pattern that exists', () => {
    const ids = new Set(aiSdPatterns.map((p) => p.id))
    for (const q of aiSdQuestions) expect(ids.has(q.patternId), q.id).toBe(true)
  })

  it('gives every pattern at least three questions', () => {
    for (const p of aiSdPatterns) {
      expect(aiSdQuestions.filter((q) => q.patternId === p.id).length, p.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('gives every question at least two prompts in each of the six steps', () => {
    for (const q of aiSdQuestions) {
      for (const step of STEPS) {
        expect(q.steps[step].length, `${q.id}.${step}`).toBeGreaterThanOrEqual(2)
        for (const p of q.steps[step]) expect(p.trim().length, `${q.id}.${step}`).toBeGreaterThan(0)
      }
    }
  })

  it('answers all six steps in the solution, none of them a hedge under 80 characters', () => {
    for (const q of aiSdQuestions) {
      for (const step of STEPS) {
        expect(q.solution[step].trim().length, `${q.id}.solution.${step}`).toBeGreaterThanOrEqual(80)
      }
    }
  })

  it('gives every solution at least two estimates carrying their arithmetic', () => {
    for (const q of aiSdQuestions) {
      expect(q.solution.numbers.length, q.id).toBeGreaterThanOrEqual(2)
      for (const n of q.solution.numbers) expect(n.trim().length, q.id).toBeGreaterThan(20)
    }
  })

  it('makes every delivery budget sum exactly to the question minutes', () => {
    for (const q of aiSdQuestions) {
      const b = q.delivery.budget
      const total =
        b.requirements + b.estimates + b.apiAndData + b.architecture + b.deepDive + b.wrapUp
      expect(total, `${q.id} budget`).toBe(q.minutes)
    }
  })

  it('gives every delivery an opening, two traps and two pushbacks with answers', () => {
    for (const q of aiSdQuestions) {
      expect(q.delivery.opening.trim().length, q.id).toBeGreaterThan(0)
      expect(q.delivery.traps.length, `${q.id} traps`).toBeGreaterThanOrEqual(2)
      expect(q.delivery.whenPushed.length, `${q.id} whenPushed`).toBeGreaterThanOrEqual(2)
      for (const w of q.delivery.whenPushed) {
        expect(w.challenge.trim().length, q.id).toBeGreaterThan(0)
        expect(w.answer.trim().length, `${q.id}: ${w.challenge}`).toBeGreaterThan(40)
      }
    }
  })

  it('gives every question a mermaid flowchart with real mechanism', () => {
    for (const q of aiSdQuestions) {
      expect(q.diagram.startsWith('flowchart'), `${q.id} diagram`).toBe(true)
      expect(q.diagram.includes('-->'), `${q.id} diagram`).toBe(true)
      const edges = q.diagram.split('\n').filter((l) => l.includes('-->') || l.includes('-.->'))
      expect(edges.length, `${q.id} diagram edges`).toBeGreaterThanOrEqual(4)
    }
  })

  it('names at least one company per question', () => {
    for (const q of aiSdQuestions) expect(q.companies.length, q.id).toBeGreaterThanOrEqual(1)
  })

  it('passes its own zod schemas', () => {
    for (const p of aiSdPatterns) expect(aiSdPatternSchema.safeParse(p).success, p.id).toBe(true)
    for (const q of aiSdQuestions) {
      const r = aiSdQuestionSchema.safeParse(q)
      expect(r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)).toEqual(
        [],
      )
    }
  })

  it('keeps GPU memory arithmetic in the serving bank rather than hand-waving it', () => {
    const serving = aiSdQuestions.filter((q) => q.patternId === 'aisdp-llm-serving')
    for (const q of serving) {
      const blob = [q.solution.architecture, ...q.solution.numbers].join(' ').toLowerCase()
      expect(/kv cache|kv-cache|hbm|gb|gib/.test(blob), q.id).toBe(true)
    }
  })
})
