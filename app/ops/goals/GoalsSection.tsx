'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Meter from '@/components/ui/Meter'
import NumberInput from '@/components/ui/NumberInput'
import Panel from '@/components/ui/Panel'
import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { localDateOf } from '@/lib/ops/date'
import { evaluateGoal, type GoalEvaluation } from '@/lib/ops/goals'
import { deleteGoal, newId, saveGoal } from '@/lib/ops/data'
import { parseGoal, type Goal } from '@/lib/ops/types'
import { OpsErrorBanner, OpsPending } from '../OpsState'
import { formatDate, formatDateLong, formatNumber } from '../format'
import { useOps } from '../useOps'

const STATUS_LABEL = {
  achieved: 'Achieved',
  'on-pace': 'On pace',
  behind: 'Behind',
  missed: 'Missed',
} as const

const STATUS_COLOUR = {
  achieved: 'var(--positive)',
  'on-pace': 'var(--positive)',
  behind: 'var(--warning)',
  missed: 'var(--danger)',
} as const

export default function GoalsSection() {
  return (
    <ToastProvider>
      <GoalsSectionInner />
    </ToastProvider>
  )
}

function GoalsSectionInner() {
  const ops = useOps()
  const toast = useToast()
  const [editing, setEditing] = useState<Goal | null | undefined>(undefined)

  if (ops.status !== 'ready' || ops.now === null) {
    return <OpsPending status={ops.status} error={ops.error} onRetry={ops.reload} />
  }

  const now = ops.now
  const today = localDateOf(now)
  const { goals } = ops.data

  async function save(goal: Goal) {
    return ops.mutate(async ({ supabase, userId }) => {
      await saveGoal(supabase, userId, goal)
      toast.show({ tone: 'success', message: `Saved “${goal.title}”.` })
    })
  }

  async function remove(goal: Goal) {
    return ops.mutate(async ({ supabase }) => {
      await deleteGoal(supabase, goal.id)
      toast.show({ message: `Deleted “${goal.title}”.` })
    })
  }

  async function logProgress(goal: Goal, amount: number) {
    const next: Goal = { ...goal, current: Math.max(0, goal.current + amount) }
    await ops.mutate(async ({ supabase, userId }) => {
      await saveGoal(supabase, userId, next)
      toast.show({
        tone: 'success',
        message: `${formatNumber(next.current)} of ${formatNumber(goal.target)} ${goal.unit}.`,
      })
    })
  }

  const ordered = [...goals].sort((a, b) => a.deadline.localeCompare(b.deadline))

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <OpsErrorBanner error={ops.error} onDismiss={ops.dismissError} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">
          Progress counts up from zero at the start date. A goal that measures a reduction records
          the amount reduced, not the raw reading.
        </p>
        <Button
          variant="accent"
          onClick={() => setEditing(null)}
          aria-haspopup="dialog"
          data-testid="ops-new-goal"
        >
          New goal
        </Button>
      </div>

      {ordered.length === 0 ? (
        <Panel className="p-4">
          <EmptyState
            title="No goals yet."
            description="A goal is a target, a unit, and a date. Ops works out the pace it needs and whether the pace you are on gets there."
            action={<Button onClick={() => setEditing(null)}>Set one</Button>}
          />
        </Panel>
      ) : (
        <ul className="flex min-w-0 flex-col gap-3">
          {ordered.map((goal) => (
            <li key={goal.id} className="min-w-0">
              <GoalCard
                goal={goal}
                evaluation={evaluateGoal(goal, now)}
                busy={ops.busy}
                onEdit={() => setEditing(goal)}
                onLog={(amount) => void logProgress(goal, amount)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing !== undefined ? (
        <GoalEditor
          key={editing?.id ?? 'new'}
          goal={editing}
          today={today}
          busy={ops.busy}
          onClose={() => setEditing(undefined)}
          onSave={save}
          onDelete={remove}
        />
      ) : null}
    </div>
  )
}

/**
 * One goal's honest readout.
 *
 * `evaluateGoal` is deliberately blunt: once the deadline has passed and the
 * target was not met, `onPace` is false and `requiredPacePerDay` is `null`,
 * because a rate needed to hit a date that has already gone is not a real
 * number. This card is where that bluntness has to survive contact with the
 * screen — the failure being avoided is a goal that reports "97%, on track"
 * forever after its date quietly passed, which is the most common way a tracker
 * becomes decoration.
 *
 * So the shortfall is stated in the goal's own unit, and the projection is
 * stated as a projection: "at your current pace you would reach 34 of 50".
 * A meter alone would say 68% and imply nothing about whether that is enough.
 */
function GoalCard({
  goal,
  evaluation,
  busy,
  onEdit,
  onLog,
}: {
  goal: Goal
  evaluation: GoalEvaluation
  busy: boolean
  onEdit: () => void
  onLog: (amount: number) => void
}) {
  const [amount, setAmount] = useState<number | null>(null)

  const pace = evaluation.currentPacePerDay ?? 0
  const projected = goal.current + pace * Math.max(0, evaluation.daysRemaining)
  const shortfall = Math.max(0, goal.target - goal.current)

  return (
    <Panel className="flex min-w-0 flex-col gap-3 p-4" data-testid="ops-goal-card">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium break-words">{goal.title}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {formatNumber(goal.current)} of {formatNumber(goal.target)} {goal.unit} · due{' '}
            {formatDate(goal.deadline)}
          </p>
        </div>
        <Tag variant={evaluation.status === 'achieved' ? 'accent' : 'outline'}>
          {STATUS_LABEL[evaluation.status]}
        </Tag>
      </div>

      <Meter
        value={evaluation.fraction * 100}
        label={`${goal.title} progress`}
        showValue
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat
          label="Days left"
          value={evaluation.deadlinePassed ? '—' : String(evaluation.daysRemaining)}
        />
        <Stat
          label="Needed / day"
          value={
            evaluation.requiredPacePerDay === null ? '—' : formatNumber(evaluation.requiredPacePerDay)
          }
          unit={evaluation.requiredPacePerDay === null ? undefined : goal.unit}
        />
        <Stat
          label="Your pace / day"
          value={
            evaluation.currentPacePerDay === null ? '—' : formatNumber(evaluation.currentPacePerDay)
          }
          unit={evaluation.currentPacePerDay === null ? undefined : goal.unit}
        />
      </div>

      <p
        className="text-sm"
        style={{ color: STATUS_COLOUR[evaluation.status] }}
        data-testid="ops-goal-verdict"
      >
        {verdict(goal, evaluation, projected, shortfall)}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <Field label={`Add ${goal.unit}`} className="min-w-0 flex-1">
          <NumberInput
            value={amount}
            onChange={setAmount}
            placeholder="0"
            aria-label={`Amount of ${goal.unit} to add to ${goal.title}`}
          />
        </Field>
        <Button
          variant="accent"
          disabled={busy || amount === null || amount === 0}
          onClick={() => {
            if (amount === null) return
            onLog(amount)
            setAmount(null)
          }}
        >
          Log
        </Button>
        <Button variant="quiet" disabled={busy} onClick={onEdit}>
          Edit
        </Button>
      </div>
    </Panel>
  )
}

function verdict(
  goal: Goal,
  evaluation: GoalEvaluation,
  projected: number,
  shortfall: number,
): string {
  const unit = goal.unit

  if (evaluation.status === 'achieved') {
    return `Done — ${formatNumber(goal.current)} of ${formatNumber(goal.target)} ${unit}.`
  }

  if (evaluation.status === 'missed') {
    return `The deadline passed on ${formatDateLong(goal.deadline)} with ${formatNumber(shortfall)} ${unit} still to go. This one was missed.`
  }

  if (evaluation.currentPacePerDay === null) {
    return evaluation.requiredPacePerDay === null
      ? `Due today: all ${formatNumber(shortfall)} ${unit} of it.`
      : `Nothing logged yet. You need ${formatNumber(evaluation.requiredPacePerDay)} ${unit} a day to land it on time.`
  }

  if (evaluation.status === 'on-pace') {
    return `At ${formatNumber(evaluation.currentPacePerDay)} ${unit} a day you reach about ${formatNumber(projected)} by ${formatDate(goal.deadline)} — enough.`
  }

  return `At ${formatNumber(evaluation.currentPacePerDay)} ${unit} a day you reach about ${formatNumber(projected)} by ${formatDate(goal.deadline)}, short of ${formatNumber(goal.target)}. It needs ${formatNumber(evaluation.requiredPacePerDay ?? 0)} a day from here.`
}

function GoalEditor({
  goal,
  today,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  goal: Goal | null
  today: string
  busy: boolean
  onClose: () => void
  onSave: (goal: Goal) => Promise<boolean>
  onDelete: (goal: Goal) => Promise<boolean>
}) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [target, setTarget] = useState<number | null>(goal?.target ?? null)
  const [unit, setUnit] = useState(goal?.unit ?? '')
  const [current, setCurrent] = useState<number | null>(goal?.current ?? 0)
  const [startDate, setStartDate] = useState(goal?.startDate ?? today)
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [problem, setProblem] = useState<string | null>(null)

  async function save() {
    let next: Goal
    try {
      next = parseGoal({
        id: goal?.id ?? newId(),
        title: title.trim(),
        target,
        unit: unit.trim(),
        current: current ?? 0,
        startDate,
        deadline,
        linkedTaskIds: goal?.linkedTaskIds ?? [],
      })
    } catch {
      setProblem(
        'A goal needs a title, a positive target, a unit, and a deadline on or after the start date.',
      )
      return
    }
    setProblem(null)
    if (await onSave(next)) onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      data-testid="ops-goal-editor"
      footer={
        <>
          {goal ? (
            <Button
              variant="danger"
              className="mr-auto"
              disabled={busy}
              onClick={async () => {
                if (await onDelete(goal)) onClose()
              }}
            >
              Delete
            </Button>
          ) : null}
          <Button variant="quiet" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="accent" onClick={save} loading={busy} data-testid="ops-goal-save">
            {goal ? 'Save' : 'Add goal'}
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-3">
        <Field label="Title" error={problem ?? undefined}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Read 12 papers"
            autoComplete="off"
            data-testid="ops-goal-title"
          />
        </Field>

        <div className="flex flex-col gap-3 md:flex-row">
          <Field label="Target" className="min-w-0 flex-1">
            <NumberInput value={target} onChange={setTarget} aria-label="Target amount" />
          </Field>
          <Field label="Unit" className="min-w-0 flex-1" hint="papers, km, kg lost…">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} autoComplete="off" />
          </Field>
        </div>

        <Field label="Progress so far" hint="Counted from zero at the start date, never a raw reading.">
          <NumberInput value={current} onChange={setCurrent} aria-label="Progress so far" />
        </Field>

        <div className="flex flex-col gap-3 md:flex-row">
          <Field label="Start date" className="min-w-0 flex-1">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="Deadline" className="min-w-0 flex-1">
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              data-testid="ops-goal-deadline"
            />
          </Field>
        </div>
      </div>
    </Dialog>
  )
}
