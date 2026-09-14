'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { newId } from '@/lib/ops/data'
import { parseTask, type Priority, type RecurrenceRule, type Task } from '@/lib/ops/types'
import type { IsoDate } from '@/lib/ops/date'
import RecurrenceEditor from './RecurrenceEditor'

export interface TaskEditorProps {
  open: boolean
  onClose: () => void
  /** The task being edited, or null to write a new one. */
  task: Task | null
  /** Today, from the one clock reading the page made. New tasks are dated with it. */
  today: IsoDate
  busy: boolean
  onSave: (task: Task) => Promise<boolean>
  onDelete?: (task: Task) => Promise<boolean>
}

function tagsFrom(raw: string): string[] {
  return [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))]
}

/**
 * Write or edit one task.
 *
 * The form's own state is plain strings, exactly as the inputs hold them, and
 * it is turned into a `Task` in ONE place — `build()` — which then runs
 * `parseTask` before anything is saved. Validating with the same zod schema the
 * database mirrors, rather than with a hand-written check, is what stops the UI
 * and the table disagreeing about what a valid task is; the two refinements
 * that are easy to violate by hand (a time with no date, a completed task with
 * no completion date) are caught here as a message rather than 300ms later as a
 * constraint violation.
 *
 * Keyed remount. The parent mounts this with `key={task?.id ?? 'new'}`, so
 * opening the editor on a different task gets fresh state instead of last
 * task's values — the alternative is an effect that copies props into state,
 * which is the classic way a form ends up one edit behind.
 */
export default function TaskEditor({
  open,
  onClose,
  task,
  today,
  busy,
  onSave,
  onDelete,
}: TaskEditorProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [tags, setTags] = useState((task?.tags ?? []).join(', '))
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(task?.recurrence ?? null)
  const [problem, setProblem] = useState<string | null>(null)

  function build(): Task {
    return parseTask({
      id: task?.id ?? newId(),
      title: title.trim(),
      notes: notes.trim() === '' ? undefined : notes.trim(),
      dueDate: dueDate === '' ? undefined : dueDate,
      // A time with no date is the one combination the schema refuses, and the
      // date field is the one that can be cleared while the time keeps a value.
      dueTime: dueDate !== '' && dueTime !== '' ? dueTime : undefined,
      priority,
      tags: tagsFrom(tags),
      completed: task?.completed ?? false,
      completedAt: task?.completedAt,
      recurrence: recurrence ?? undefined,
      createdAt: task?.createdAt ?? today,
    })
  }

  async function save() {
    let next: Task
    try {
      next = build()
    } catch (cause) {
      setProblem(
        title.trim() === ''
          ? 'A task needs a title.'
          : cause instanceof Error
            ? cause.message
            : 'That task is not valid.',
      )
      return
    }
    setProblem(null)
    if (await onSave(next)) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      data-testid="ops-task-editor"
      footer={
        <>
          {task && onDelete ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (await onDelete(task)) onClose()
              }}
              className="mr-auto"
            >
              Delete
            </Button>
          ) : null}
          <Button variant="quiet" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="accent" onClick={save} loading={busy} data-testid="ops-task-save">
            {task ? 'Save' : 'Add task'}
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-3">
        <Field label="Title" error={problem ?? undefined}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Renew the domain"
            autoComplete="off"
            data-testid="ops-task-title"
          />
        </Field>

        <Field label="Notes" hint="Optional.">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>

        <div className="flex flex-col gap-3 md:flex-row">
          <Field label="Due date" className="min-w-0 flex-1">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value)
                // Clearing the date clears the time with it, rather than
                // leaving a time behind that has nothing to be a time of.
                if (e.target.value === '') setDueTime('')
              }}
              data-testid="ops-task-due-date"
            />
          </Field>
          <Field
            label="Due time"
            className="min-w-0 flex-1"
            hint={dueDate === '' ? 'Needs a due date first.' : 'Orders the day; never makes it overdue early.'}
          >
            <Input
              type="time"
              value={dueTime}
              disabled={dueDate === ''}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <Field label="Priority" className="min-w-0 flex-1">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
          <Field label="Tags" className="min-w-0 flex-1" hint="Comma separated.">
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="admin, money"
              autoComplete="off"
            />
          </Field>
        </div>

        <RecurrenceEditor
          value={recurrence}
          onChange={setRecurrence}
          anchor={dueDate === '' ? today : dueDate}
        />

        {recurrence && dueDate === '' ? (
          <p className="hint">
            With no due date, the first occurrence is counted from today.
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
