import { dsaPatterns, dsaProblems } from '@/content/dsa'
import { sdPatterns, sdQuestions } from '@/content/system-design'
import { topics, topicQuestions } from '@/content/ai-ml'
import { projects, milestones } from '@/content/projects'
import { readings } from '@/content/readings'
import { weeks, days } from '@/content/plan'
import { slugOf } from './ids'
import type { ContentItem, DayTask, Doc } from './schema'

export const REVIEW_IDS = ['review-week', 'review-mock', 'review-retro', 'review-publish'] as const

const DOC_NAMES = [
  'problem', 'architecture', 'ml', 'tradeoffs', 'scaling', 'failures', 'interview-questions',
] as const

export const allDocs: Doc[] = projects.flatMap((p) =>
  DOC_NAMES.map((name, i) => ({
    id: `doc-${slugOf(p.id)}-${name}`,
    projectId: p.id,
    name,
    order: i + 1,
  })),
)

export function docsForProject(projectId: string): Doc[] {
  return allDocs.filter((d) => d.projectId === projectId)
}

export const content = {
  dsaPatterns, dsaProblems,
  sdPatterns, sdQuestions,
  topics, topicQuestions,
  projects, milestones, docs: allDocs,
  readings, weeks, days,
}

export const byId: Map<string, ContentItem> = new Map(
  [
    ...dsaPatterns, ...dsaProblems,
    ...sdPatterns, ...sdQuestions,
    ...topics, ...topicQuestions,
    ...projects, ...milestones, ...allDocs,
    ...readings, ...weeks, ...days,
  ].map((item) => [item.id, item as ContentItem]),
)

export function resolveRef(id: string): ContentItem | undefined {
  return byId.get(id)
}

export function completionKey(task: DayTask): string {
  return task.taskId ?? task.refId
}

/**
 * Display text for a day task's `refId`.
 *
 * Most refIds resolve to a content item and take its name/title/text. The four
 * review ids have no content item behind them, so they carry fixed wording
 * here — one place, so Today and Roadmap can never disagree about what a task
 * is called.
 */
const REVIEW_LABELS: Record<string, string> = {
  'review-week': 'Weekly review',
  'review-mock': 'Mock interview loop',
  'review-retro': 'Month retrospective',
  'review-publish': 'Publish defense docs',
}

export function labelForTask(refId: string): string {
  const item = resolveRef(refId)
  if (item) {
    if ('name' in item && typeof item.name === 'string') return item.name
    if ('title' in item && typeof item.title === 'string') return item.title
    if ('text' in item && typeof item.text === 'string') return item.text
    return item.id
  }
  return REVIEW_LABELS[refId] ?? refId.replace(/-/g, ' ')
}
