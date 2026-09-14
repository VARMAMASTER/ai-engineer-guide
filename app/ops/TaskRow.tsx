'use client'

import Button from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import Tag from '@/components/ui/Tag'
import { daysOverdue, dueBucket } from '@/lib/ops/due'
import { diffDays, localDateOf } from '@/lib/ops/date'
import type { Task } from '@/lib/ops/types'
import { PRIORITY_LABEL, describeRecurrence, formatDate, formatDateLong } from './format'

/** How a task's due date reads on a row, and which tone carries it. */
export function dueLabel(task: Task, now: Date): { text: string; tone: 'danger' | 'warning' | 'muted' } {
  if (!task.dueDate) return { text: 'No due date', tone: 'muted' }

  const time = task.dueTime ? ` at ${task.dueTime}` : ''
  const bucket = dueBucket(task, now, 7)

  if (bucket === 'overdue') {
    const days = daysOverdue(task, now)
    return { text: `Overdue by ${days} ${days === 1 ? 'day' : 'days'}`, tone: 'danger' }
  }
  if (bucket === 'dueToday') return { text: `Due today${time}`, tone: 'warning' }

  const days = diffDays(localDateOf(now), task.dueDate)
  if (days === 1) return { text: `Due tomorrow${time}`, tone: 'muted' }
  return { text: `Due ${formatDate(task.dueDate)}${time}`, tone: 'muted' }
}

const TONE_VAR = {
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  muted: 'var(--text-muted)',
} as const

export interface TaskRowProps {
  task: Task
  now: Date
  /**
   * Why this task sits where it does — `explainPriority`'s sentence.
   *
   * Optional because a plain alphabetical list has no ordering to explain, but
   * wherever `prioritize` decided the order this is REQUIRED reading, not a
   * tooltip: the whole reason the ranking is lexicographic rather than a
   * weighted score is that it can be said out loud. Hiding it would throw away
   * the property the design was chosen for.
   */
  reason?: string
  busy?: boolean
  onComplete?: () => void
  onReopen?: () => void
  onEdit?: () => void
}

export default function TaskRow({ task, now, reason, busy, onComplete, onReopen, onEdit }: TaskRowProps) {
  const due = dueLabel(task, now)

  return (
    <Panel
      className="flex min-w-0 flex-col gap-2 p-3"
      data-testid="ops-task-row"
      data-task-title={task.title}
      data-completed={task.completed ? 'true' : 'false'}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="min-w-0 text-sm font-medium break-words">{task.title}</p>

          <p className="mt-0.5 text-xs" style={{ color: TONE_VAR[due.tone] }}>
            {due.text}
          </p>

          {task.notes ? (
            <p className="mt-1 text-xs break-words text-[var(--text-muted)]">{task.notes}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <Tag variant={task.priority === 'high' ? 'accent' : 'outline'}>
            {PRIORITY_LABEL[task.priority]}
          </Tag>
        </div>
      </div>

      {task.recurrence || task.tags.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {task.recurrence ? (
            <Tag variant="outline" data-testid="ops-task-recurrence">
              ↻ {describeRecurrence(task.recurrence)}
            </Tag>
          ) : null}
          {task.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      ) : null}

      {reason ? (
        <p className="text-xs text-[var(--text-faint)]" data-testid="ops-task-reason">
          {reason}
        </p>
      ) : null}

      {task.completed && task.completedAt ? (
        <p className="text-xs text-[var(--positive)]">Done on {formatDateLong(task.completedAt)}.</p>
      ) : null}

      {onComplete || onEdit || onReopen ? (
        <div className="flex flex-wrap items-center gap-2">
          {onComplete && !task.completed ? (
            <Button variant="accent" disabled={busy} onClick={onComplete}>
              Complete
            </Button>
          ) : null}
          {onReopen && task.completed ? (
            <Button variant="quiet" disabled={busy} onClick={onReopen}>
              Reopen
            </Button>
          ) : null}
          {onEdit ? (
            <Button variant="quiet" disabled={busy} onClick={onEdit}>
              Edit
            </Button>
          ) : null}
        </div>
      ) : null}
    </Panel>
  )
}
