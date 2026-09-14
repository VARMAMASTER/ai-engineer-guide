'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import NumberInput from '@/components/ui/NumberInput'
import Panel from '@/components/ui/Panel'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { dueReminders, reminderFiresAt } from '@/lib/ops/reminders'
import { deleteReminder, newId, saveReminder } from '@/lib/ops/data'
import { parseReminderRule, type ReminderRule, type Task } from '@/lib/ops/types'
import { OpsErrorBanner, OpsPending } from '../OpsState'
import { formatInstant, formatOffset } from '../format'
import { useOps } from '../useOps'

/** The offsets people actually ask for, plus an escape hatch. */
const PRESETS = [0, 10, 30, 60, 120, 1440, 2880]

export default function RemindersSection() {
  return (
    <ToastProvider>
      <RemindersSectionInner />
    </ToastProvider>
  )
}

function RemindersSectionInner() {
  const ops = useOps()
  const toast = useToast()
  const [writing, setWriting] = useState(false)

  if (ops.status !== 'ready' || ops.now === null) {
    return <OpsPending status={ops.status} error={ops.error} onRetry={ops.reload} />
  }

  const now = ops.now
  const { tasks, reminders } = ops.data
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const firingNow = dueReminders(reminders, tasks, now)
  const openTasks = tasks.filter((t) => !t.completed)

  async function save(rule: ReminderRule) {
    return ops.mutate(async ({ supabase, userId }) => {
      await saveReminder(supabase, userId, rule)
      toast.show({ tone: 'success', message: 'Reminder rule saved.' })
    })
  }

  async function remove(rule: ReminderRule) {
    await ops.mutate(async ({ supabase }) => {
      await deleteReminder(supabase, rule.id)
      toast.show({ message: 'Reminder rule deleted.' })
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <OpsErrorBanner error={ops.error} onDismiss={ops.dismissError} />

      {/*
        Said first, said plainly, and not softened. The rules below are real —
        they are stored, and `dueReminders` decides which of them would fire
        right now — but NOTHING IS SENT. Delivery needs VAPID keys, a push
        subscription store and a scheduled sender, none of which exists.
        A half-built notification is worse than none: the user stops watching
        the list because they believe they will be told.
      */}
      <Panel className="flex min-w-0 flex-col gap-1 p-4" data-testid="ops-reminders-notice">
        <p className="text-sm font-medium text-[var(--warning)]">Nothing is delivered yet.</p>
        <p className="text-sm text-[var(--text-muted)]">
          These are rules, not notifications. Ops works out exactly when each one would fire and
          shows it here — no push, no email, no sound, and nothing that arrives while the app is
          closed. Sending needs a push subscription store and a scheduled sender, which is a later
          stage.
        </p>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>Rules</h2>
        <Button
          variant="accent"
          onClick={() => setWriting(true)}
          disabled={openTasks.length === 0}
          aria-haspopup="dialog"
          data-testid="ops-new-reminder"
        >
          New rule
        </Button>
      </div>

      {firingNow.length > 0 ? (
        <Panel className="flex min-w-0 flex-col gap-2 p-4">
          <p className="text-sm font-medium">Would be firing now</p>
          <ul className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            {firingNow.map((due) => (
              <li key={due.rule.id}>
                {due.task.title} — {formatInstant(due.firesAt)}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {reminders.length === 0 ? (
        <Panel className="p-4">
          <EmptyState
            title="No reminder rules."
            description={
              openTasks.length === 0
                ? 'A rule attaches to a task, and there are no open tasks to attach one to.'
                : 'A rule says how long before a task is due you would want to know.'
            }
            action={
              openTasks.length === 0 ? (
                <Link href="/ops/tasks" className="chip">
                  Write a task first
                </Link>
              ) : (
                <Button onClick={() => setWriting(true)}>Add a rule</Button>
              )
            }
          />
        </Panel>
      ) : (
        <ul className="flex min-w-0 flex-col gap-3">
          {reminders.map((rule) => {
            const task = byId.get(rule.taskId)
            const firesAt = task ? reminderFiresAt(rule, task) : null
            return (
              <li key={rule.id} className="min-w-0">
                <Panel className="flex min-w-0 flex-col gap-2 p-3" data-testid="ops-reminder-row">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">
                        {task?.title ?? 'A task that is no longer here'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{formatOffset(rule.offsetMinutes)}</p>
                    </div>
                    {task?.completed ? <Tag variant="outline">Task done</Tag> : null}
                  </div>

                  {firesAt ? (
                    <p className="text-xs text-[var(--text-faint)]">
                      Would fire at {formatInstant(firesAt)}.
                    </p>
                  ) : (
                    // Not an error and not hidden: a date-only task has no
                    // instant to be early relative to, so `reminderFiresAt`
                    // returns null rather than inventing 09:00. Saying so is
                    // the difference between a rule that is off and a rule the
                    // user thinks is on.
                    <p className="text-xs text-[var(--warning)]">
                      This task has no due time, so this rule has nothing to count back from and
                      would never fire.
                    </p>
                  )}

                  <div>
                    <Button variant="quiet" disabled={ops.busy} onClick={() => void remove(rule)}>
                      Delete
                    </Button>
                  </div>
                </Panel>
              </li>
            )
          })}
        </ul>
      )}

      {writing ? (
        <ReminderEditor
          tasks={openTasks}
          busy={ops.busy}
          onClose={() => setWriting(false)}
          onSave={save}
        />
      ) : null}
    </div>
  )
}

function ReminderEditor({
  tasks,
  busy,
  onClose,
  onSave,
}: {
  tasks: Task[]
  busy: boolean
  onClose: () => void
  onSave: (rule: ReminderRule) => Promise<boolean>
}) {
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? '')
  const [offset, setOffset] = useState(30)
  const [custom, setCustom] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const task = tasks.find((t) => t.id === taskId)
  const preview = task ? reminderFiresAt({ id: 'preview', taskId, offsetMinutes: offset }, task) : null

  async function save() {
    let rule: ReminderRule
    try {
      rule = parseReminderRule({ id: newId(), taskId, offsetMinutes: offset })
    } catch {
      setProblem('Pick a task and a whole number of minutes.')
      return
    }
    setProblem(null)
    if (await onSave(rule)) onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="New reminder rule"
      description="Stored and evaluated. Not delivered."
      data-testid="ops-reminder-editor"
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="accent" onClick={save} loading={busy} data-testid="ops-reminder-save">
            Add rule
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-3">
        <Field label="Task" error={problem ?? undefined}>
          <Select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            {tasks.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Remind me">
          <Select
            value={custom ? 'custom' : String(offset)}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setCustom(true)
                return
              }
              setCustom(false)
              setOffset(Number(e.target.value))
            }}
          >
            {PRESETS.map((minutes) => (
              <option key={minutes} value={String(minutes)}>
                {formatOffset(minutes)}
              </option>
            ))}
            <option value="custom">A custom number of minutes before</option>
          </Select>
        </Field>

        {custom ? (
          <Field label="Minutes before" hint="Up to 30 days.">
            <NumberInput
              value={offset}
              onChange={(value) => setOffset(Math.min(43200, Math.max(0, Math.round(value ?? 0))))}
              aria-label="Minutes before the task is due"
            />
          </Field>
        ) : null}

        <Panel tier="solid" className="p-3">
          {preview ? (
            <p className="text-sm">
              Would fire at <span className="tnum">{formatInstant(preview)}</span>.
            </p>
          ) : (
            <p className="text-sm text-[var(--warning)]">
              {task?.dueDate
                ? 'This task has a date but no time, so there is no instant to count back from. Give it a due time in Tasks and this rule will have something to fire against.'
                : 'This task has no due date, so this rule would never fire.'}
            </p>
          )}
        </Panel>
      </div>
    </Dialog>
  )
}
