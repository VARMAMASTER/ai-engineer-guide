'use client'

import { useState, type ReactNode } from 'react'
import { content, resolveRef, completionKey } from '@/lib/content/index'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import { dayNumber } from '@/lib/progress/selectors'
import { todayIso } from '@/lib/date'
import type { DayTask } from '@/lib/content/schema'
import Checkbox from './Checkbox'

const MONTHS = [1, 2, 3, 4, 5, 6] as const

/** A short synopsis of what each month is about, for the collapsed month row. */
const MONTH_EMPHASIS: Record<number, string> = {
  1: 'Arrays through trees. RAG foundations.',
  2: 'Graphs. Deep learning and advanced retrieval.',
  3: 'DP begins. LLM pretraining and graph RAG.',
  4: 'DP continues. Agents and safety.',
  5: 'Intervals, bit manipulation. GPT internals.',
  6: 'Mixed review. Fine-tuning and evaluation.',
}

const REVIEW_LABELS: Record<string, string> = {
  'review-week': 'Weekly review',
  'review-mock': 'Mock interview loop',
  'review-retro': 'Month retrospective',
  'review-publish': 'Publish defense docs',
}

function primaryLabel(task: DayTask): string {
  const item = resolveRef(task.refId)
  if (item) {
    if ('name' in item && typeof item.name === 'string') return item.name
    if ('title' in item && typeof item.title === 'string') return item.title
    if ('text' in item && typeof item.text === 'string') return item.text
  }
  return REVIEW_LABELS[task.refId] ?? task.refId.replace(/-/g, ' ')
}

function metaForTask(task: DayTask): string {
  const item = resolveRef(task.refId)
  if (item && 'leetcodeNumber' in item) return `LC ${item.leetcodeNumber}`
  return `${task.minutes}m`
}

function taskLabel(task: DayTask): ReactNode {
  const primary = primaryLabel(task)
  if (!task.note) return primary
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span>{primary}</span>
      <span className="text-xs text-[var(--text-muted)]">{task.note}</span>
    </span>
  )
}

interface DayRowProps {
  dayId: string
  dayNum: number
  kind: string
  tasks: DayTask[]
  isCurrent: boolean
}

function DayRow({ dayId, dayNum, kind, tasks, isCurrent }: DayRowProps) {
  return (
    <div
      data-day-id={dayId}
      aria-current={isCurrent ? 'step' : undefined}
      className={[
        'surface-solid flex flex-col gap-1 p-3',
        isCurrent ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : '',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">Day {dayNum}</h4>
        <span className="readout text-[var(--text-faint)]">{kind}</span>
      </div>
      <div>
        {tasks.map((task) => (
          <Checkbox
            key={completionKey(task)}
            itemId={completionKey(task)}
            label={taskLabel(task)}
            meta={metaForTask(task)}
          />
        ))}
      </div>
    </div>
  )
}

interface WeekBlockProps {
  weekId: string
  weekNum: number
  theme: string
  expanded: boolean
  onToggle: () => void
  currentDayNum: number | null
}

/** Month 1's weeks: expandable into their days, each day's tasks as Checkbox rows. */
function WeekBlock({ weekId, weekNum, theme, expanded, onToggle, currentDayNum }: WeekBlockProps) {
  const days = content.days.filter((d) => d.weekId === weekId)

  return (
    <div className="surface-solid flex flex-col gap-2 p-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-11 w-full flex-col items-start gap-0.5 text-left"
      >
        <span className="text-sm font-semibold">Week {weekNum}</span>
        <span className="text-xs text-[var(--text-muted)]">{theme}</span>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-2">
          {days.map((day) => (
            <DayRow
              key={day.id}
              dayId={day.id}
              dayNum={day.number}
              kind={day.kind}
              tasks={day.tasks}
              isCurrent={currentDayNum !== null && day.number === currentDayNum}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

interface WeekTargetsProps {
  weekNum: number
  theme: string
  targets: string[]
}

/** Months 2-6: week targets as a plain read-only list, no checkboxes. */
function WeekTargets({ weekNum, theme, targets }: WeekTargetsProps) {
  return (
    <div className="surface-solid flex flex-col gap-2 p-3">
      <div>
        <p className="text-sm font-semibold">Week {weekNum}</p>
        <p className="text-xs text-[var(--text-muted)]">{theme}</p>
      </div>
      <ul className="flex flex-col gap-1 pl-4 text-sm text-[var(--text-muted)] [&>li]:list-disc">
        {targets.map((target, i) => (
          <li key={i}>{target}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The six-month plan as a vertical timeline. Month 1 drills all the way down
 * to per-day tasks with checkboxes, because that is the only month whose
 * plan is committed to specific days. Months 2 through 6 show week targets
 * as prose -- their day-by-day plan is written at the start of that month.
 */
export default function RoadmapTimeline() {
  const hydrated = useHydrated()
  const startDate = useProgress((s) => s.startDate)
  const [openMonths, setOpenMonths] = useState<Record<number, boolean>>({})
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({})

  const today = todayIso()
  const currentDay = hydrated ? dayNumber(startDate, today) : null

  function toggleMonth(n: number) {
    setOpenMonths((s) => ({ ...s, [n]: !s[n] }))
  }

  function toggleWeek(weekId: string) {
    setOpenWeeks((s) => ({ ...s, [weekId]: !s[weekId] }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Roadmap</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          The six-month plan: one shipped project per month, DSA and system design
          running underneath all six.
        </p>
      </div>

      <ol className="relative flex flex-col gap-4">
        {MONTHS.map((n) => {
          const project = content.projects.find((p) => p.month === n)
          const weeks = content.weeks.filter((w) => w.month === n)
          const expanded = Boolean(openMonths[n])
          const isCurrentMonth =
            currentDay !== null &&
            weeks.some((w) => content.days.some((d) => d.weekId === w.id && d.number === currentDay))

          return (
            <li key={n} className="relative pl-6">
              <span
                aria-hidden="true"
                className={[
                  'absolute top-5 left-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2',
                  isCurrentMonth
                    ? 'border-[var(--accent)] bg-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--ground)]',
                ].join(' ')}
              />
              {n < MONTHS.length ? (
                <span
                  aria-hidden="true"
                  className="absolute top-8 bottom-[-1rem] left-1.5 w-px -translate-x-1/2 bg-[var(--border)]"
                />
              ) : null}

              <div className="panel flex flex-col gap-3 p-4">
                <button
                  type="button"
                  onClick={() => toggleMonth(n)}
                  aria-expanded={expanded}
                  className="flex min-h-11 w-full flex-col items-start gap-1 text-left"
                >
                  <span className="text-base font-semibold">
                    Month {n}
                    {project ? `: ${project.name}` : ''}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">{MONTH_EMPHASIS[n]}</span>
                </button>

                {expanded ? (
                  <div className="flex flex-col gap-2">
                    {n === 1
                      ? weeks.map((w) => (
                          <WeekBlock
                            key={w.id}
                            weekId={w.id}
                            weekNum={w.number}
                            theme={w.theme}
                            expanded={Boolean(openWeeks[w.id])}
                            onToggle={() => toggleWeek(w.id)}
                            currentDayNum={currentDay}
                          />
                        ))
                      : weeks.map((w) => (
                          <WeekTargets
                            key={w.id}
                            weekNum={w.number}
                            theme={w.theme}
                            targets={w.targets}
                          />
                        ))}
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
