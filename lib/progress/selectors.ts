import { diffDays, addDays } from '@/lib/date'
import { content, completionKey } from '@/lib/content/index'
import type { DayTask } from '@/lib/content/schema'

export type Track = DayTask['track']
export type Completed = Record<string, string>

const TRACKS: Track[] = ['dsa', 'study-sd', 'study-ml', 'reading', 'build', 'review']

export function dayNumber(startDate: string | null, today: string): number | null {
  if (!startDate) return null
  return Math.max(1, diffDays(startDate, today) + 1)
}

export function weekNumber(startDate: string | null, today: string): number | null {
  const d = dayNumber(startDate, today)
  return d === null ? null : Math.ceil(d / 7)
}

export function streak(completed: Completed, today: string): number {
  const dates = new Set(Object.values(completed))
  let cursor = dates.has(today) ? today : dates.has(addDays(today, -1)) ? addDays(today, -1) : null
  if (!cursor) return 0
  let n = 0
  while (dates.has(cursor)) {
    n += 1
    cursor = addDays(cursor, -1)
  }
  return n
}

function emptyTracks(): Record<Track, number> {
  return { dsa: 0, 'study-sd': 0, 'study-ml': 0, reading: 0, build: 0, review: 0 }
}

export function tasksForDay(dayNum: number): DayTask[] {
  return content.days.find((d) => d.number === dayNum)?.tasks ?? []
}

export interface WeekProgress {
  planned: Record<Track, number>
  completed: Record<Track, number>
  plannedTotal: number
  completedTotal: number
}

export function weekProgress(weekNum: number, completed: Completed): WeekProgress {
  const weekId = `week-${String(weekNum).padStart(2, '0')}`
  const tasks = content.days
    .filter((d) => d.weekId === weekId && d.number <= 28)
    .flatMap((d) => d.tasks)

  const planned = emptyTracks()
  const done = emptyTracks()
  for (const t of tasks) {
    planned[t.track] += t.minutes
    if (completed[completionKey(t)]) done[t.track] += t.minutes
  }
  const sum = (r: Record<Track, number>) => TRACKS.reduce((s, k) => s + r[k], 0)
  return { planned, completed: done, plannedTotal: sum(planned), completedTotal: sum(done) }
}

export interface Meter { done: number; target: number }

export interface Month1Checks {
  problems: Meter
  patterns: Meter
  milestones: Meter
  docs: Meter
}

export function month1Checks(completed: Completed): Month1Checks {
  const month1Tasks = content.days.filter((d) => d.number <= 28).flatMap((d) => d.tasks)
  const scheduled = new Set(month1Tasks.map((t) => completionKey(t)))

  const countScheduled = (pred: (id: string) => boolean) =>
    Object.keys(completed).filter((id) => scheduled.has(id) && pred(id)).length

  return {
    problems: { done: countScheduled((id) => id.startsWith('dsa-')), target: 40 },
    patterns: {
      done: countScheduled((id) => id.startsWith('sdp-') || id.startsWith('mlp-')),
      target: 8,
    },
    milestones: {
      done: Object.keys(completed).filter((id) => id.startsWith('ms-rag-')).length,
      target: 4,
    },
    docs: {
      done: Object.keys(completed).filter((id) => id.startsWith('doc-rag-')).length,
      target: 7,
    },
  }
}
