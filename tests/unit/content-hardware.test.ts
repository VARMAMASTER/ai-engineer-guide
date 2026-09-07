import { describe, it, expect } from 'vitest'
import { hwTopics, hwQuestions } from '@/content/hardware'
import { hwTopicSchema, hwQuestionSchema } from '@/lib/content/schema'

const MIN_TOPICS = 6
const MIN_QUESTIONS = 35
const MIN_PER_TOPIC = 4

describe('hardware bank — topics', () => {
  it(`has at least ${MIN_TOPICS} topics`, () => {
    expect(hwTopics.length).toBeGreaterThanOrEqual(MIN_TOPICS)
  })

  it('gives every topic a unique id', () => {
    expect(new Set(hwTopics.map((t) => t.id)).size).toBe(hwTopics.length)
  })

  it('orders topics uniquely and sequentially from 1', () => {
    const orders = hwTopics.map((t) => t.order)
    expect(new Set(orders).size).toBe(orders.length)
    expect([...orders].sort((a, b) => a - b)).toEqual(
      hwTopics.map((_, i) => i + 1),
    )
  })

  it('summarises every topic as a capability, not a label', () => {
    for (const t of hwTopics) {
      expect(t.summary.length, `${t.id} summary`).toBeGreaterThan(60)
      expect(t.name.trim().length, `${t.id} name`).toBeGreaterThan(0)
    }
  })

  it('passes the topic schema', () => {
    for (const t of hwTopics) {
      const parsed = hwTopicSchema.safeParse(t)
      expect(parsed.success, `${t.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })
})

describe('hardware bank — questions', () => {
  it(`has at least ${MIN_QUESTIONS} questions`, () => {
    expect(hwQuestions.length).toBeGreaterThanOrEqual(MIN_QUESTIONS)
  })

  it('gives every question a unique id', () => {
    expect(new Set(hwQuestions.map((q) => q.id)).size).toBe(hwQuestions.length)
  })

  it('resolves every topicId to a real topic', () => {
    const ids = new Set(hwTopics.map((t) => t.id))
    for (const q of hwQuestions) {
      expect(ids.has(q.topicId), `${q.id} -> ${q.topicId}`).toBe(true)
    }
  })

  it(`gives every topic at least ${MIN_PER_TOPIC} questions`, () => {
    for (const t of hwTopics) {
      expect(
        hwQuestions.filter((q) => q.topicId === t.id).length,
        t.id,
      ).toBeGreaterThanOrEqual(MIN_PER_TOPIC)
    }
  })

  it('writes every question as something an interviewer would say out loud', () => {
    // Either a question mark, or the imperative form a real interviewer uses
    // ("Walk me down the memory hierarchy", "Compare A100 and H100").
    const IMPERATIVE = /^(Walk|Explain|Compare|Describe|Derive|Contrast|Map)\b/
    for (const q of hwQuestions) {
      expect(q.text.length, `${q.id} text`).toBeGreaterThan(25)
      expect(
        q.text.trim().endsWith('?') || IMPERATIVE.test(q.text.trim()),
        `${q.id} is neither a question nor an interviewer's imperative prompt`,
      ).toBe(true)
    }
  })

  it('writes answers long enough to carry a mechanism', () => {
    for (const q of hwQuestions) {
      expect(q.answer.length, `${q.id} answer length`).toBeGreaterThan(100)
    }
  })

  it('writes a key point that adds something the answer did not say', () => {
    for (const q of hwQuestions) {
      expect(q.keyPoint.length, `${q.id} keyPoint length`).toBeGreaterThan(30)
      expect(
        q.answer.includes(q.keyPoint),
        `${q.id} keyPoint restates its own answer`,
      ).toBe(false)
    }
  })

  it('budgets 8-12 minutes per question', () => {
    for (const q of hwQuestions) {
      expect(q.minutes, `${q.id} minutes`).toBeGreaterThanOrEqual(8)
      expect(q.minutes, `${q.id} minutes`).toBeLessThanOrEqual(12)
    }
  })

  it('backs at least half of the questions with a citable figure', () => {
    const withNumbers = hwQuestions.filter((q) => (q.numbers?.length ?? 0) > 0)
    expect(withNumbers.length * 2).toBeGreaterThanOrEqual(hwQuestions.length)
  })

  it('never ships an empty numbers entry', () => {
    for (const q of hwQuestions) {
      for (const n of q.numbers ?? []) {
        expect(n.trim().length, `${q.id} numbers entry`).toBeGreaterThan(0)
      }
    }
  })

  it('passes the question schema', () => {
    for (const q of hwQuestions) {
      const parsed = hwQuestionSchema.safeParse(q)
      expect(parsed.success, `${q.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })
})

describe('hardware bank — figures stay hedged', () => {
  const allNumbers = hwQuestions.flatMap((q) => q.numbers ?? [])

  it('never states a specific H200 bandwidth figure', () => {
    const text = hwQuestions
      .flatMap((q) => [q.text, q.answer, q.keyPoint, ...(q.numbers ?? [])])
      .join(' ')
    expect(/H200/i.test(text), 'H200 was not verified in the research pass').toBe(false)
  })

  it('keeps the B200 bandwidth figure hedged wherever it appears', () => {
    for (const n of allNumbers) {
      if (!/B200/.test(n)) continue
      if (!/TB\/s/.test(n)) continue
      expect(
        /reported around|~|approx/i.test(n),
        `unhedged B200 bandwidth figure: ${n}`,
      ).toBe(true)
    }
  })

  it('attributes the CPU tokenization latency figure rather than asserting it', () => {
    const tokenization = hwQuestions.filter((q) =>
      /50%/.test([q.answer, ...(q.numbers ?? [])].join(' ')),
    )
    expect(tokenization.length).toBeGreaterThan(0)
    for (const q of tokenization) {
      const body = [q.answer, ...(q.numbers ?? [])].join(' ')
      expect(
        /one (source|study)|reported by one|not a consensus|not a universal/i.test(body),
        `${q.id} states a single study's figure as established fact`,
      ).toBe(true)
    }
  })
})
