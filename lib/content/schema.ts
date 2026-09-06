import { z } from 'zod'

export const difficultySchema = z.enum(['easy', 'medium', 'hard'])
export const companySchema = z.enum(['google', 'meta', 'amazon'])
export const trackSchema = z.enum(['dsa', 'study-sd', 'study-ml', 'reading', 'build', 'review'])

export const dsaPatternSchema = z.object({
  id: z.string().regex(/^dsap-[a-z0-9-]+$/),
  name: z.string().min(1),
  order: z.number().int().positive(),
  signals: z.array(z.string().min(1)).min(1),
  template: z.string().min(1),
  pitfalls: z.array(z.string().min(1)).min(1),
})

export const dsaProblemSchema = z.object({
  id: z.string().regex(/^dsa-\d+-[a-z0-9-]+$/),
  patternId: z.string().regex(/^dsap-[a-z0-9-]+$/),
  name: z.string().min(1),
  leetcodeNumber: z.number().int().positive(),
  url: z.string().regex(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/),
  difficulty: difficultySchema,
  core: z.boolean(),
  companies: z.array(companySchema),
  minutes: z.number().int().positive(),
})

export const sdPatternSchema = z.object({
  id: z.string().regex(/^(sdp|mlp)-[a-z0-9-]+$/),
  group: z.enum(['general', 'ml']),
  name: z.string().min(1),
  order: z.number().int().positive(),
  solves: z.string().min(1),
  tradeoffs: z.array(z.string().min(1)).min(1),
})

/**
 * The reference answer for a system design question, keyed to the same six steps as
 * `steps`. Each field is the decision a strong candidate reaches and why, not a prompt.
 * `numbers` carries the estimates the candidate should say out loud, with the arithmetic.
 */
export const sdSolutionSchema = z.object({
  define: z.string().min(40),
  data: z.string().min(40),
  architecture: z.string().min(40),
  evaluate: z.string().min(40),
  deploy: z.string().min(40),
  wrapup: z.string().min(40),
  numbers: z.array(z.string().min(1)).min(2),
})

/** One challenge the interviewer raises on this question, and the honest answer. */
export const sdPushbackSchema = z.object({
  challenge: z.string().min(1),
  answer: z.string().min(1),
})

/** Minutes per phase of the round. Must sum to the question's `minutes`. */
export const sdBudgetSchema = z.object({
  requirements: z.number().int().positive(),
  estimates: z.number().int().positive(),
  apiAndData: z.number().int().positive(),
  architecture: z.number().int().positive(),
  deepDive: z.number().int().positive(),
  wrapUp: z.number().int().positive(),
})

/** How to perform the answer inside the time box. */
export const sdDeliverySchema = z.object({
  budget: sdBudgetSchema,
  opening: z.string().min(1),
  traps: z.array(z.string().min(1)).min(2).max(4),
  whenPushed: z.array(sdPushbackSchema).min(2).max(3),
})

export const sdQuestionSchema = z.object({
  id: z.string().regex(/^(sdq|mlq)-[a-z0-9-]+$/),
  patternId: z.string().regex(/^(sdp|mlp)-[a-z0-9-]+$/),
  title: z.string().min(1),
  tier: z.union([z.literal(1), z.literal(2), z.literal('ml'), z.literal('ai')]),
  companies: z.array(z.string().min(1)),
  steps: z.object({
    define: z.array(z.string().min(1)).min(1),
    data: z.array(z.string().min(1)).min(1),
    architecture: z.array(z.string().min(1)).min(1),
    evaluate: z.array(z.string().min(1)).min(1),
    deploy: z.array(z.string().min(1)).min(1),
    wrapup: z.array(z.string().min(1)).min(1),
  }),
  solution: sdSolutionSchema,
  delivery: sdDeliverySchema,
  /** Mermaid `flowchart` source for the reference architecture the solution describes. */
  diagram: z.string().regex(/^flowchart (TD|LR|TB|RL|BT)\n/).refine((d) => d.includes('-->'), {
    message: 'diagram must contain at least one --> edge',
  }),
  minutes: z.number().int().positive(),
}).superRefine((q, ctx) => {
  const b = q.delivery.budget
  const total = b.requirements + b.estimates + b.apiAndData + b.architecture + b.deepDive + b.wrapUp
  if (total !== q.minutes) {
    ctx.addIssue({
      code: 'custom',
      path: ['delivery', 'budget'],
      message: `budget sums to ${total} minutes, expected ${q.minutes}`,
    })
  }
})

// Low-level design bank (spec 6.6c). Machine-coding rounds are reported at Flipkart and
// Uber as often as at the FAANG three, so the LLD bank widens the company union.
export const lldCompanySchema = z.enum(['google', 'meta', 'amazon', 'flipkart', 'uber'])

export const lldPatternSchema = z.object({
  id: z.string().regex(/^lldp-[a-z0-9-]+$/),
  name: z.string().min(1),
  order: z.number().int().min(1).max(8),
  solves: z.string().min(1),
  whenWrong: z.string().min(1),
  notes: z.array(z.string().min(1)).min(2),
  example: z.string().min(1),
  pitfalls: z.array(z.string().min(1)).min(2),
  // Mermaid classDiagram source (spec 6.10). Only on the patterns where structure is the point.
  diagram: z.string().min(1).optional(),
})

export const lldQuestionSchema = z.object({
  id: z.string().regex(/^lldq-[a-z0-9-]+$/),
  name: z.string().min(1),
  statement: z.string().min(1),
  clarify: z.array(z.string().min(1)).min(3).max(5),
  entities: z.array(z.string().min(1)).min(2),
  solution: z.string().min(200),
  // Mermaid classDiagram source (spec 6.10). Required here: for a machine-coding answer the
  // class diagram is the primary artefact and the Python sketch is the supporting detail.
  diagram: z.string().min(1),
  patterns: z.array(z.string().regex(/^lldp-[a-z0-9-]+$/)).min(1),
  extensions: z.array(z.string().min(1)).min(2).max(4),
  minutes: z.number().int().min(45).max(90),
  companies: z.array(lldCompanySchema).min(1),
})

export const topicSchema = z.object({
  id: z.string().regex(/^topic-[a-z0-9-]+$/),
  name: z.string().min(1),
  order: z.number().int().positive(),
  summary: z.string().min(1),
})

export const topicQuestionSchema = z.object({
  id: z.string().regex(/^q-[a-z0-9-]+$/),
  topicId: z.string().regex(/^topic-[a-z0-9-]+$/),
  text: z.string().min(1),
  answer: z.string().min(1),
  keyPoint: z.string().min(1),
  minutes: z.number().int().positive(),
})

export const projectSchema = z.object({
  id: z.string().regex(/^proj-[a-z0-9-]+$/),
  month: z.number().int().min(1).max(6),
  name: z.string().min(1),
  goal: z.string().min(1),
  architecture: z.string().min(1),
  constraints: z.array(z.string().min(1)).min(1),
  defense: z.array(z.string().min(1)).min(1),
})

export const milestoneSchema = z.object({
  id: z.string().regex(/^ms-[a-z0-9-]+-\d+$/),
  projectId: z.string().regex(/^proj-[a-z0-9-]+$/),
  order: z.number().int().min(1).max(4),
  title: z.string().min(1),
  scope: z.array(z.string().min(1)).min(1),
  acceptance: z.array(z.string().min(1)).min(1),
  hours: z.number().int().positive(),
})

export const docSchema = z.object({
  id: z.string().regex(/^doc-[a-z0-9-]+$/),
  projectId: z.string().regex(/^proj-[a-z0-9-]+$/),
  name: z.string().min(1),
  order: z.number().int().min(1).max(7),
})

// Authored, not generated (spec 6.10). A structured object rather than a paragraph, because a
// reader clicking a paper at 11pm wants to extract it, not read an essay. `result` and `limits`
// carry minimums because those two fields are where a summary either earns its place or turns
// into marketing.
export const readingSummarySchema = z.object({
  problem: z.string().min(1),
  idea: z.string().min(1),
  how: z.string().min(1),
  result: z.string().min(40),
  soWhat: z.string().min(1),
  limits: z.string().min(40),
})

export const readingSchema = z.object({
  id: z.string().regex(/^read-[a-z0-9-]+$/),
  weekId: z.string().regex(/^week-\d{2}$/),
  kind: z.enum(['paper', 'post', 'api']),
  title: z.string().min(1),
  source: z.string().min(1),
  year: z.number().int().min(1990).max(2030),
  url: z.string().url(),
  why: z.string().min(1),
  minutes: z.number().int().positive(),
  summary: readingSummarySchema,
  // Optional Mermaid `flowchart` source showing the method's mechanism. Present only where a
  // picture beats the prose: pipeline, architecture and training-method papers. Absent for
  // posts, API launches, and papers whose contribution is a finding rather than a mechanism.
  diagram: z.string().min(1).optional(),
})

export const weekSchema = z.object({
  id: z.string().regex(/^week-\d{2}$/),
  number: z.number().int().min(1).max(26),
  month: z.number().int().min(1).max(6),
  theme: z.string().min(1),
  targets: z.array(z.string().min(1)).min(1),
})

export const dayTaskSchema = z.object({
  refId: z.string().min(1),
  taskId: z.string().min(1).optional(),
  track: trackSchema,
  minutes: z.number().int().positive(),
  note: z.string().min(1).optional(),
})

export const daySchema = z.object({
  id: z.string().regex(/^day-\d{2}$/),
  number: z.number().int().min(1).max(30),
  weekId: z.string().regex(/^week-\d{2}$/),
  kind: z.enum(['weekday', 'weekend', 'special']),
  tasks: z.array(dayTaskSchema).min(1),
})

export type DsaPattern = z.infer<typeof dsaPatternSchema>
export type DsaProblem = z.infer<typeof dsaProblemSchema>
export type SdPattern = z.infer<typeof sdPatternSchema>
export type SdQuestion = z.infer<typeof sdQuestionSchema>
export type SdSolution = z.infer<typeof sdSolutionSchema>
export type SdDelivery = z.infer<typeof sdDeliverySchema>
export type SdBudget = z.infer<typeof sdBudgetSchema>
export type SdPushback = z.infer<typeof sdPushbackSchema>
export type LldCompany = z.infer<typeof lldCompanySchema>
export type LldPattern = z.infer<typeof lldPatternSchema>
export type LldQuestion = z.infer<typeof lldQuestionSchema>
export type Topic = z.infer<typeof topicSchema>
export type TopicQuestion = z.infer<typeof topicQuestionSchema>
export type Project = z.infer<typeof projectSchema>
export type Milestone = z.infer<typeof milestoneSchema>
export type Doc = z.infer<typeof docSchema>
export type ReadingSummary = z.infer<typeof readingSummarySchema>
export type Reading = z.infer<typeof readingSchema>
export type Week = z.infer<typeof weekSchema>
export type Day = z.infer<typeof daySchema>
export type DayTask = z.infer<typeof dayTaskSchema>

export type ContentItem =
  | DsaPattern | DsaProblem | SdPattern | SdQuestion | LldPattern | LldQuestion
  | Topic | TopicQuestion
  | Project | Milestone | Doc | Reading | Week | Day
