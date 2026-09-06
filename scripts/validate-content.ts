import { content, REVIEW_IDS, completionKey } from '@/lib/content/index'
import {
  dsaPatternSchema, dsaProblemSchema, sdPatternSchema, sdQuestionSchema,
  lldPatternSchema, lldQuestionSchema,
  topicSchema, topicQuestionSchema, projectSchema, milestoneSchema,
  docSchema, readingSchema, weekSchema, daySchema,
} from '@/lib/content/schema'
import type {
  DsaPattern, DsaProblem, SdPattern, SdQuestion, LldPattern, LldQuestion,
  Topic, TopicQuestion, Project, Milestone, Doc, Reading, Week, Day,
} from '@/lib/content/schema'

export interface ValidatableContent {
  dsaPatterns: DsaPattern[]; dsaProblems: DsaProblem[]
  sdPatterns: SdPattern[]; sdQuestions: SdQuestion[]
  lldPatterns: LldPattern[]; lldQuestions: LldQuestion[]
  topics: Topic[]; topicQuestions: TopicQuestion[]
  projects: Project[]; milestones: Milestone[]; docs: Doc[]
  readings: Reading[]; weeks: Week[]; days: Day[]
}

const WEEK_MIN = 1290
const WEEK_MAX = 1410
const LEETCODE_URL = /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/
const LLD_PATTERNS_EXPECTED = 8
const LLD_QUESTIONS_EXPECTED = 25
const LLD_PATTERN_ID = /^lldp-[a-z0-9-]+$/
const LLD_QUESTION_ID = /^lldq-[a-z0-9-]+$/

export function validate(c: ValidatableContent): string[] {
  const errors: string[] = []

  // 1. Shape: every item must satisfy its schema.
  const shapes = [
    [c.dsaPatterns, dsaPatternSchema], [c.dsaProblems, dsaProblemSchema],
    [c.sdPatterns, sdPatternSchema], [c.sdQuestions, sdQuestionSchema],
    [c.lldPatterns, lldPatternSchema], [c.lldQuestions, lldQuestionSchema],
    [c.topics, topicSchema], [c.topicQuestions, topicQuestionSchema],
    [c.projects, projectSchema], [c.milestones, milestoneSchema],
    [c.docs, docSchema], [c.readings, readingSchema],
    [c.weeks, weekSchema], [c.days, daySchema],
  ] as const
  for (const [items, schema] of shapes) {
    for (const item of items) {
      const r = schema.safeParse(item)
      if (!r.success) {
        const id = (item as { id?: string }).id ?? '<no id>'
        errors.push(`${id}: schema error: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
      }
    }
  }

  // 2. Global id uniqueness.
  const all = [
    ...c.dsaPatterns, ...c.dsaProblems, ...c.sdPatterns, ...c.sdQuestions,
    ...c.lldPatterns, ...c.lldQuestions, ...c.topics, ...c.topicQuestions, ...c.projects, ...c.milestones,
    ...c.docs, ...c.readings, ...c.weeks, ...c.days,
  ]
  const seen = new Set<string>()
  for (const item of all) {
    if (seen.has(item.id)) errors.push(`duplicate id: ${item.id}`)
    seen.add(item.id)
  }

  // 3. Reference integrity.
  const weekIds = new Set(c.weeks.map((w) => w.id))
  const projectIds = new Set(c.projects.map((p) => p.id))
  for (const p of c.dsaProblems) {
    if (!c.dsaPatterns.some((x) => x.id === p.patternId)) errors.push(`${p.id}: unknown patternId ${p.patternId}`)
  }
  for (const q of c.sdQuestions) {
    if (!c.sdPatterns.some((x) => x.id === q.patternId)) errors.push(`${q.id}: unknown patternId ${q.patternId}`)
  }
  const lldPatternIds = new Set(c.lldPatterns.map((p) => p.id))
  for (const q of c.lldQuestions) {
    for (const ref of q.patterns) {
      if (!lldPatternIds.has(ref)) errors.push(`${q.id}: unknown lld pattern ${ref}`)
    }
  }
  for (const q of c.topicQuestions) {
    if (!c.topics.some((x) => x.id === q.topicId)) errors.push(`${q.id}: unknown topicId ${q.topicId}`)
  }
  for (const m of c.milestones) {
    if (!projectIds.has(m.projectId)) errors.push(`${m.id}: unknown projectId ${m.projectId}`)
  }
  for (const d of c.docs) {
    if (!projectIds.has(d.projectId)) errors.push(`${d.id}: unknown projectId ${d.projectId}`)
  }
  for (const r of c.readings) {
    if (!weekIds.has(r.weekId)) errors.push(`${r.id}: unknown weekId ${r.weekId}`)
  }
  for (const d of c.days) {
    if (!weekIds.has(d.weekId)) errors.push(`${d.id}: unknown weekId ${d.weekId}`)
  }

  // 4. LeetCode urls.
  for (const p of c.dsaProblems) {
    if (!LEETCODE_URL.test(p.url)) errors.push(`${p.id}: invalid LeetCode url ${p.url}`)
  }

  // 4b. LLD ids: prefix-shaped, and unique within their own bank as well as globally.
  // The global check in step 2 catches a collision across banks; these two catch the
  // likelier mistake of pasting a problem twice inside `content/lld.ts`.
  const lldPatternSeen = new Set<string>()
  for (const p of c.lldPatterns) {
    if (!LLD_PATTERN_ID.test(p.id)) errors.push(`${p.id}: lld pattern id must match ${LLD_PATTERN_ID}`)
    if (lldPatternSeen.has(p.id)) errors.push(`duplicate lld pattern id: ${p.id}`)
    lldPatternSeen.add(p.id)
  }
  const lldQuestionSeen = new Set<string>()
  for (const q of c.lldQuestions) {
    if (!LLD_QUESTION_ID.test(q.id)) errors.push(`${q.id}: lld question id must match ${LLD_QUESTION_ID}`)
    if (lldQuestionSeen.has(q.id)) errors.push(`duplicate lld question id: ${q.id}`)
    lldQuestionSeen.add(q.id)
  }

  // 5. Bank sizes. Only enforced once the bank is being populated.
  if (c.dsaProblems.length > 0) {
    if (c.dsaProblems.length !== 150) errors.push(`dsa bank has ${c.dsaProblems.length} problems, expected 150`)
    const core = c.dsaProblems.filter((p) => p.core).length
    if (core !== 75) errors.push(`dsa bank has ${core} core problems, expected 75`)
  }
  // Either half being non-empty means the LLD bank is in play, so both halves must be
  // complete. A half-populated bank is the failure this catches: 25 questions pointing at
  // an empty pattern list would otherwise only surface as reference errors.
  if (c.lldPatterns.length > 0 || c.lldQuestions.length > 0) {
    if (c.lldPatterns.length !== LLD_PATTERNS_EXPECTED) {
      errors.push(`lld bank has ${c.lldPatterns.length} patterns, expected ${LLD_PATTERNS_EXPECTED}`)
    }
    if (c.lldQuestions.length !== LLD_QUESTIONS_EXPECTED) {
      errors.push(`lld bank has ${c.lldQuestions.length} questions, expected ${LLD_QUESTIONS_EXPECTED}`)
    }
  }

  // 6. Every project has exactly four milestones and seven docs.
  for (const p of c.projects) {
    const ms = c.milestones.filter((m) => m.projectId === p.id).length
    if (ms !== 4) errors.push(`${p.id}: has ${ms} milestones, expected 4`)
    const docs = c.docs.filter((d) => d.projectId === p.id).length
    if (docs !== 7) errors.push(`${p.id}: has ${docs} docs, expected 7`)
  }

  // 7. Day-level rules.
  const ids = new Set(all.map((i) => i.id))
  const keys = new Set<string>()
  for (const d of c.days) {
    if (d.tasks.length === 0) errors.push(`${d.id}: has no tasks`)
    for (const t of d.tasks) {
      if (!ids.has(t.refId) && !REVIEW_IDS.includes(t.refId as (typeof REVIEW_IDS)[number])) {
        errors.push(`${d.id}: unresolved refId: ${t.refId}`)
      }
      const key = completionKey(t)
      if (keys.has(key)) errors.push(`duplicate completion key: ${key}`)
      keys.add(key)
    }
    if (d.kind === 'weekday') {
      const dsa = d.tasks.filter((t) => t.track === 'dsa').length
      if (dsa !== 2) errors.push(`${d.id}: expected 2 dsa tasks, found ${dsa}`)
    }
    if (d.kind === 'weekend') {
      const total = d.tasks.reduce((s, t) => s + t.minutes, 0)
      if (total !== 300) errors.push(`${d.id}: weekend day totals ${total} minutes, expected 300`)
    }
  }

  // 8. Weekly minute budgets, days 1 to 28 only.
  for (const w of c.weeks) {
    const wdays = c.days.filter((d) => d.weekId === w.id && d.number <= 28)
    if (wdays.length === 0) continue
    const total = wdays.flatMap((d) => d.tasks).reduce((s, t) => s + t.minutes, 0)
    if (total < WEEK_MIN || total > WEEK_MAX) {
      errors.push(`${w.id}: ${total} minutes planned, expected ${WEEK_MIN} to ${WEEK_MAX}`)
    }
  }

  return errors
}

function main(): void {
  const errors = validate(content as ValidatableContent)
  if (errors.length > 0) {
    console.error(`content validation failed with ${errors.length} error(s):`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(
    `content validation passed: ${content.dsaProblems.length} problems, ` +
      `${content.sdQuestions.length} system design questions, ` +
      `${content.lldPatterns.length} lld patterns, ${content.lldQuestions.length} lld questions, ` +
      `${content.days.length} days`,
  )
}

if (process.argv[1]?.includes('validate-content')) main()
