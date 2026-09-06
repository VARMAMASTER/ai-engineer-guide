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
  minutes: z.number().int().positive(),
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
export type Topic = z.infer<typeof topicSchema>
export type TopicQuestion = z.infer<typeof topicQuestionSchema>
export type Project = z.infer<typeof projectSchema>
export type Milestone = z.infer<typeof milestoneSchema>
export type Doc = z.infer<typeof docSchema>
export type Reading = z.infer<typeof readingSchema>
export type Week = z.infer<typeof weekSchema>
export type Day = z.infer<typeof daySchema>
export type DayTask = z.infer<typeof dayTaskSchema>

export type ContentItem =
  | DsaPattern | DsaProblem | SdPattern | SdQuestion | Topic | TopicQuestion
  | Project | Milestone | Doc | Reading | Week | Day
