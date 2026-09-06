import { describe, it, expect } from 'vitest'
import { behaviouralPrinciples, behaviouralQuestions, storySlots } from '@/content/behavioural'
import {
  behaviouralPrincipleSchema,
  behaviouralQuestionSchema,
  storySlotSchema,
} from '@/lib/content/schema'

const PRINCIPLE_IDS = new Set(behaviouralPrinciples.map((p) => p.id))

// The 16 Amazon Leadership Principles are public and named. Getting a name wrong in front
// of a bar raiser is a self-inflicted wound, so the names are pinned here.
const AMAZON_LP_NAMES = [
  'Are Right, A Lot',
  'Bias for Action',
  'Customer Obsession',
  'Deliver Results',
  'Dive Deep',
  'Earn Trust',
  'Frugality',
  'Have Backbone; Disagree and Commit',
  'Hire and Develop the Best',
  'Insist on the Highest Standards',
  'Invent and Simplify',
  'Learn and Be Curious',
  'Ownership',
  "Strive to be Earth's Best Employer",
  'Success and Scale Bring Broad Responsibility',
  'Think Big',
]

describe('behavioural principle bank', () => {
  it('has unique ids matching bp-<slug> and unique orders', () => {
    expect(PRINCIPLE_IDS.size).toBe(behaviouralPrinciples.length)
    for (const principle of behaviouralPrinciples) {
      expect(principle.id, principle.id).toMatch(/^bp-[a-z0-9-]+$/)
    }
    const orders = behaviouralPrinciples.map((p) => p.order)
    expect(new Set(orders).size, 'duplicate order values').toBe(orders.length)
  })

  it('carries all 16 Amazon leadership principles, named correctly', () => {
    const amazon = behaviouralPrinciples.filter((p) => p.company === 'amazon')
    expect(amazon).toHaveLength(16)
    expect(amazon.map((p) => p.name).sort()).toEqual([...AMAZON_LP_NAMES].sort())
  })

  it("covers Google's four behavioural themes", () => {
    const google = behaviouralPrinciples.filter((p) => p.company === 'google').map((p) => p.id)
    expect(google.sort()).toEqual([
      'bp-g-cognitive', 'bp-g-emergent-leadership', 'bp-g-googliness', 'bp-g-leadership',
    ])
  })

  it("covers Meta's four signals", () => {
    const meta = behaviouralPrinciples.filter((p) => p.company === 'meta').map((p) => p.id)
    expect(meta.sort()).toEqual([
      'bp-m-collaboration', 'bp-m-drives-results', 'bp-m-embracing-ambiguity', 'bp-m-growth-mindset',
    ])
  })

  it('carries the general set every loop asks about', () => {
    const general = behaviouralPrinciples.filter((p) => p.company === 'general').map((p) => p.id)
    for (const id of [
      'bp-conflict', 'bp-failure', 'bp-disagree-with-manager', 'bp-missed-deadline',
    ]) {
      expect(general, id).toContain(id)
    }
  })

  it('explains what the principle means in the room, not the marketing sentence', () => {
    for (const principle of behaviouralPrinciples) {
      expect(principle.meaning.length, principle.id).toBeGreaterThan(120)
    }
  })

  it('gives every principle a weak answer that is a real sentence, not a description of weakness', () => {
    for (const principle of behaviouralPrinciples) {
      expect(principle.weakAnswer.length, principle.id).toBeGreaterThan(60)
      // A sentence someone would say, not a rubric line like "fails to demonstrate ownership".
      expect(principle.weakAnswer, principle.id).not.toMatch(
        /^(fails|lacks|does not|shows no|no evidence|weak|poor|generic)\b/i,
      )
      expect(principle.weakAnswer, principle.id).toMatch(/\b(I|we|my|me|our)\b/)
    }
  })

  it('names at least 2 things the interviewer is scoring, each specific', () => {
    for (const principle of behaviouralPrinciples) {
      expect(principle.lookingFor.length, principle.id).toBeGreaterThanOrEqual(2)
      for (const item of principle.lookingFor) {
        expect(item.trim().length, principle.id).toBeGreaterThan(20)
      }
    }
  })

  it('passes the principle schema', () => {
    for (const principle of behaviouralPrinciples) {
      const parsed = behaviouralPrincipleSchema.safeParse(principle)
      expect(parsed.success, `${principle.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })
})

describe('behavioural question bank', () => {
  it('has at least 45 questions with unique bq- ids', () => {
    expect(behaviouralQuestions.length).toBeGreaterThanOrEqual(45)
    const ids = behaviouralQuestions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const question of behaviouralQuestions) {
      expect(question.id, question.id).toMatch(/^bq-[a-z0-9-]+$/)
    }
  })

  it('maps every question to at least one real bp- principle id', () => {
    for (const question of behaviouralQuestions) {
      expect(question.principleIds.length, question.id).toBeGreaterThanOrEqual(1)
      for (const principleId of question.principleIds) {
        expect(PRINCIPLE_IDS.has(principleId), `${question.id} -> ${principleId}`).toBe(true)
      }
      expect(new Set(question.principleIds).size, `${question.id} repeats a principle`)
        .toBe(question.principleIds.length)
    }
  })

  it('exercises every principle in at least one question', () => {
    const used = new Set(behaviouralQuestions.flatMap((q) => q.principleIds))
    expect([...PRINCIPLE_IDS].filter((id) => !used.has(id))).toEqual([])
  })

  it('gives every question at least 2 follow-up probes, which is where the round is decided', () => {
    for (const question of behaviouralQuestions) {
      expect(question.probes.length, question.id).toBeGreaterThanOrEqual(2)
      for (const probe of question.probes) {
        expect(probe.trim().length, question.id).toBeGreaterThan(20)
      }
    }
  })

  it('gives every question at least one trap that is specific to it, not generic advice', () => {
    for (const question of behaviouralQuestions) {
      expect(question.traps.length, question.id).toBeGreaterThanOrEqual(1)
      for (const trap of question.traps) {
        // "Be concise" is not a trap. A real one explains what the question invites and
        // what the interviewer is actually listening for, which takes more than a clause.
        expect(trap.trim().length, `${question.id}: trap too short to be specific`)
          .toBeGreaterThan(80)
      }
    }
  })

  it('keeps every question inside a plausible slice of a 45-minute round', () => {
    for (const question of behaviouralQuestions) {
      expect(question.minutes, question.id).toBeGreaterThanOrEqual(5)
      expect(question.minutes, question.id).toBeLessThanOrEqual(15)
    }
  })

  it('asks questions rather than stating topics', () => {
    for (const question of behaviouralQuestions) {
      expect(question.prompt.length, question.id).toBeGreaterThan(30)
      expect(question.prompt, question.id).toMatch(/(\?|^Tell me|^Walk me|^What|^Describe)/)
    }
  })

  it('passes the question schema', () => {
    for (const question of behaviouralQuestions) {
      const parsed = behaviouralQuestionSchema.safeParse(question)
      expect(parsed.success, `${question.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })
})

describe('reusable story slots', () => {
  const BUILD_PROJECT_IDS = [
    'proj-rag', 'proj-advanced-rag', 'proj-graph-rag',
    'proj-agents', 'proj-gpt-from-scratch', 'proj-fine-tune-eval',
  ]

  it('has at least 10 stories with unique story- ids', () => {
    expect(storySlots.length).toBeGreaterThanOrEqual(10)
    const ids = storySlots.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const story of storySlots) {
      expect(story.id, story.id).toMatch(/^story-[a-z0-9-]+$/)
    }
  })

  it('resolves every covers entry to a real principle id', () => {
    for (const story of storySlots) {
      expect(story.covers.length, story.id).toBeGreaterThanOrEqual(1)
      for (const principleId of story.covers) {
        expect(PRINCIPLE_IDS.has(principleId), `${story.id} -> ${principleId}`).toBe(true)
      }
    }
  })

  it('keys stories to the six build projects and to real work situations', () => {
    const sources = storySlots.map((s) => s.source)
    for (const projectId of BUILD_PROJECT_IDS) {
      expect(sources.some((s) => s.includes(projectId)), `no story sourced from ${projectId}`)
        .toBe(true)
    }
    const fromWork = storySlots.filter((s) => s.source.startsWith('Startup work'))
    expect(fromWork.length, 'needs work stories, not only side projects')
      .toBeGreaterThanOrEqual(5)
  })

  it('gives every STAR field a guiding question, never a fabricated achievement', () => {
    for (const story of storySlots) {
      for (const [field, text] of Object.entries(story.prompts)) {
        expect(text.trim().length, `${story.id}.${field}`).toBeGreaterThan(60)
        expect(text, `${story.id}.${field} must ask, not assert`).toMatch(/\?/)
      }
    }
  })

  it('covers enough principles between them to answer a full loop', () => {
    const covered = new Set(storySlots.flatMap((s) => s.covers))
    expect(covered.size).toBeGreaterThanOrEqual(20)
  })

  it('passes the story slot schema', () => {
    for (const story of storySlots) {
      const parsed = storySlotSchema.safeParse(story)
      expect(parsed.success, `${story.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })
})
