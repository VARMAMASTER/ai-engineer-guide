import { describe, it, expect } from 'vitest'
import { topics, topicQuestions } from '@/content/ai-ml'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

const EXPECTED_TOPIC_IDS = [
  'topic-statistics-metrics', 'topic-classical-ml', 'topic-deep-learning',
  'topic-embeddings', 'topic-transformers', 'topic-llm-pretraining',
  'topic-fine-tuning', 'topic-inference', 'topic-rag-evaluation', 'topic-agents-safety',
]

describe('ai/ml bank', () => {
  it('has the 10 expected topics in study order', () => {
    expect(topics.map((t) => t.id)).toEqual(EXPECTED_TOPIC_IDS)
    expect(topics.map((t) => t.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('has at least 110 questions', () => {
    expect(topicQuestions.length).toBeGreaterThanOrEqual(110)
  })

  it('gives every topic at least 10 questions', () => {
    for (const t of topics) {
      expect(topicQuestions.filter((q) => q.topicId === t.id).length, t.id).toBeGreaterThanOrEqual(10)
    }
  })

  it('writes every question as a question', () => {
    for (const q of topicQuestions) {
      expect(q.text.length, q.id).toBeGreaterThan(15)
    }
  })

  it('passes schema validation', () => {
    const c = {
      dsaPatterns: [], dsaProblems: [], sdPatterns: [], sdQuestions: [],
      topics, topicQuestions, projects: [], milestones: [],
      docs: [], readings: [], weeks: [], days: [],
    } as ValidatableContent
    expect(validate(c)).toEqual([])
  })
})
