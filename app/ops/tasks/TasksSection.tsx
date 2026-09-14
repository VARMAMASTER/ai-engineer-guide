'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import Panel from '@/components/ui/Panel'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { localDateOf } from '@/lib/ops/date'
import { explainPriority, prioritize } from '@/lib/ops/priority'
import { completeAndAdvance, deleteTask, reopenTask, saveTask } from '@/lib/ops/data'
import type { Task } from '@/lib/ops/types'
import { OpsErrorBanner, OpsPending } from '../OpsState'
import TaskEditor from '../TaskEditor'
import TaskRow from '../TaskRow'
import { formatDateLong } from '../format'
import { useOps } from '../useOps'

type Filter = 'open' | 'done' | 'all'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Completed' },
  { id: 'all', label: 'All' },
]

export default function TasksSection() {
  return (
    <ToastProvider>
      <TasksSectionInner />
    </ToastProvider>
  )
}

function TasksSectionInner() {
  const ops = useOps()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('open')
  /** `undefined` = closed, `null` = writing a new task, a Task = editing it. */
  const [editing, setEditing] = useState<Task | null | undefined>(undefined)

  if (ops.status !== 'ready' || ops.now === null) {
    return <OpsPending status={ops.status} error={ops.error} onRetry={ops.reload} />
  }

  const now = ops.now
  const today = localDateOf(now)
  const { tasks } = ops.data

  const open = prioritize(tasks, now)
  const done = tasks
    .filter((t) => t.completed)
    // Most recently finished first; the completion date is a calendar string,
    // so a plain reverse string compare is the right comparison.
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? '') * -1)

  const shown = filter === 'open' ? open : filter === 'done' ? done : [...open, ...done]

  async function save(task: Task) {
    return ops.mutate(async ({ supabase, userId }) => {
      await saveTask(supabase, userId, task)
      toast.show({ tone: 'success', message: `Saved “${task.title}”.` })
    })
  }

  async function remove(task: Task) {
    return ops.mutate(async ({ supabase }) => {
      await deleteTask(supabase, task.id)
      toast.show({ message: `Deleted “${task.title}”.` })
    })
  }

  async function complete(task: Task) {
    await ops.mutate(async ({ supabase, userId, now: at }) => {
      const outcome = await completeAndAdvance(supabase, userId, task, at)
      toast.show({
        tone: 'success',
        message: outcome.next?.dueDate
          ? `Done. Next one: ${formatDateLong(outcome.next.dueDate)}.`
          : `Done: ${task.title}.`,
      })
    })
  }

  async function reopen(task: Task) {
    await ops.mutate(async ({ supabase, userId }) => {
      await reopenTask(supabase, userId, task)
      // Said plainly, because it is the one thing about reopening that
      // surprises people: completing a recurring task already wrote the next
      // occurrence, and un-ticking this one does not unwrite it.
      toast.show({
        message: task.recurrence
          ? 'Reopened. The occurrence that was spawned is still on the list.'
          : 'Reopened.',
      })
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <OpsErrorBanner error={ops.error} onDismiss={ops.dismissError} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter tasks">
          {FILTERS.map((option) => (
            <Chip
              key={option.id}
              pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <Button
          variant="accent"
          onClick={() => setEditing(null)}
          aria-haspopup="dialog"
          aria-expanded={editing !== undefined}
          data-testid="ops-new-task"
        >
          New task
        </Button>
      </div>

      {ops.data.skipped > 0 ? (
        <p className="text-xs text-[var(--warning)]">
          {ops.data.skipped} stored {ops.data.skipped === 1 ? 'row' : 'rows'} could not be read and{' '}
          {ops.data.skipped === 1 ? 'is' : 'are'} not shown.
        </p>
      ) : null}

      {shown.length === 0 ? (
        <Panel className="p-4">
          <EmptyState
            title={filter === 'done' ? 'Nothing completed yet.' : 'No tasks yet.'}
            description="A task can be a one-off or repeat — daily, weekly on chosen days, or monthly by date or by weekday."
            action={
              <Chip onClick={() => setEditing(null)}>
                {filter === 'done' ? 'Write a task' : 'Write the first one'}
              </Chip>
            }
          />
        </Panel>
      ) : (
        <ul className="flex min-w-0 flex-col gap-3">
          {shown.map((task) => (
            <li key={task.id} className="min-w-0">
              <TaskRow
                task={task}
                now={now}
                reason={task.completed ? undefined : explainPriority(task, now)}
                busy={ops.busy}
                onComplete={() => void complete(task)}
                onReopen={() => void reopen(task)}
                onEdit={() => setEditing(task)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing !== undefined ? (
        <TaskEditor
          // Remounts per task, so the form never carries the previous one's
          // values — see the note in TaskEditor.
          key={editing?.id ?? 'new'}
          open
          onClose={() => setEditing(undefined)}
          task={editing}
          today={today}
          busy={ops.busy}
          onSave={save}
          onDelete={remove}
        />
      ) : null}
    </div>
  )
}
