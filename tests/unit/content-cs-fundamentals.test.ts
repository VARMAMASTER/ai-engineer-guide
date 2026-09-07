import { describe, it, expect } from 'vitest'
import { csTopics, csQuestions } from '@/content/cs-fundamentals'
import { csTopicSchema, csQuestionSchema } from '@/lib/content/schema'

const TOPIC_IDS = new Set(csTopics.map((t) => t.id))
const AREAS = ['os', 'networking', 'databases', 'concurrency', 'oop'] as const

describe('cs fundamentals topic bank', () => {
  it('has at least the five areas, each with a unique id', () => {
    expect(csTopics.length).toBeGreaterThanOrEqual(5)
    expect(TOPIC_IDS.size).toBe(csTopics.length)
  })

  it('covers every area exactly once', () => {
    for (const area of AREAS) {
      const matching = csTopics.filter((t) => t.area === area)
      expect(matching, `area ${area}`).toHaveLength(1)
    }
  })

  it('orders the topics 1..5 with no duplicates or gaps', () => {
    const orders = csTopics.map((t) => t.order).sort((a, b) => a - b)
    expect(orders).toEqual([1, 2, 3, 4, 5])
  })

  it('validates every topic against the schema', () => {
    for (const topic of csTopics) {
      const result = csTopicSchema.safeParse(topic)
      expect(result.success, `${topic.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true)
    }
  })

  it('gives every topic a summary that actually says what the area covers', () => {
    for (const topic of csTopics) {
      expect(topic.summary.length, topic.id).toBeGreaterThan(80)
    }
  })
})

describe('cs fundamentals question bank', () => {
  it('carries at least 55 questions with unique ids', () => {
    expect(csQuestions.length).toBeGreaterThanOrEqual(55)
    expect(new Set(csQuestions.map((q) => q.id)).size).toBe(csQuestions.length)
  })

  it('validates every question against the schema', () => {
    for (const question of csQuestions) {
      const result = csQuestionSchema.safeParse(question)
      expect(result.success, `${question.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true)
    }
  })

  it('resolves every topicId to a real topic', () => {
    for (const question of csQuestions) {
      expect(TOPIC_IDS.has(question.topicId), `${question.id} -> ${question.topicId}`).toBe(true)
    }
  })

  it('has at least 10 questions in every topic', () => {
    for (const topic of csTopics) {
      const owned = csQuestions.filter((q) => q.topicId === topic.id)
      expect(owned.length, topic.id).toBeGreaterThanOrEqual(10)
    }
  })

  // A one-line answer is a definition, not something you could say in an interview.
  it('answers every question in more than 100 characters', () => {
    for (const question of csQuestions) {
      expect(question.answer.length, question.id).toBeGreaterThan(100)
    }
  })

  // The lazy failure mode is a keyPoint that restates the opening of its own answer. That
  // pattern was caught for real in the AI/ML bank, so it is asserted against here.
  it('gives every question a keyPoint that adds something the answer does not already say', () => {
    for (const question of csQuestions) {
      expect(question.keyPoint.length, question.id).toBeGreaterThan(30)
      expect(question.answer.includes(question.keyPoint), `${question.id} restates its answer`).toBe(false)
    }
  })

  it('budgets every question between 5 and 10 minutes', () => {
    for (const question of csQuestions) {
      expect(question.minutes, question.id).toBeGreaterThanOrEqual(5)
      expect(question.minutes, question.id).toBeLessThanOrEqual(10)
    }
  })

  // Amazon runs a dedicated CS-fundamentals round over OS, DBMS and networking; Meta runs
  // an OS/networking/Linux-internals screen. Those are the only two the research supports,
  // so no other company may appear and both must be present.
  it('tags only companies the research supports', () => {
    const tagged = new Set(csQuestions.flatMap((q) => q.companies))
    expect([...tagged].sort()).toEqual(['amazon', 'meta'])
  })

  it('tags Amazon across OS, databases and networking', () => {
    for (const topicId of ['cst-os', 'cst-databases', 'cst-networking']) {
      const amazon = csQuestions.filter((q) => q.topicId === topicId && q.companies.includes('amazon'))
      expect(amazon.length, topicId).toBeGreaterThan(0)
    }
  })

  it('leaves the OOP bank untagged, since no company attribution was researched for it', () => {
    for (const question of csQuestions.filter((q) => q.topicId === 'cst-oop')) {
      expect(question.companies, question.id).toEqual([])
    }
  })

  it('covers the questions the research names explicitly', () => {
    const ids = new Set(csQuestions.map((q) => q.id))
    for (const id of [
      'csq-process-vs-thread',
      'csq-context-switch-cost',
      'csq-deadlock-conditions',
      'csq-deadlock-detection',
      'csq-mesi',
      'csq-type-a-url',
      'csq-tcp-vs-udp',
      'csq-dns-resolution',
      'csq-isolation-levels',
      'csq-acid',
    ]) {
      expect(ids.has(id), `missing ${id}`).toBe(true)
    }
  })
})
