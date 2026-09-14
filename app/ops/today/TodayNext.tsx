'use client'

import Link from 'next/link'
import Panel from '@/components/ui/Panel'
import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import EmptyState from '@/components/ui/EmptyState'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { classifyTasks } from '@/lib/ops/due'
import { explainPriority, prioritize } from '@/lib/ops/priority'
import { evaluateGoal, goalsNeedingAttention } from '@/lib/ops/goals'
import { opsSummary } from '@/lib/ops/summary'
import { completeAndAdvance } from '@/lib/ops/data'
import { localDateOf } from '@/lib/ops/date'
import type { Task } from '@/lib/ops/types'
import { OpsErrorBanner, OpsPending } from '../OpsState'
import TaskRow from '../TaskRow'
import { formatDateLong, formatNumber } from '../format'
import { useOps } from '../useOps'

const UPCOMING_WINDOW_DAYS = 7

const STATUS_TONE = {
  attention: 'var(--danger)',
  behind: 'var(--warning)',
  ok: 'var(--positive)',
  idle: 'var(--text-muted)',
} as const

export default function TodayNext() {
  return (
    <ToastProvider>
      <TodayNextInner />
    </ToastProvider>
  )
}

function TodayNextInner() {
  const ops = useOps()
  const toast = useToast()

  if (ops.status !== 'ready' || ops.now === null) {
    return <OpsPending status={ops.status} error={ops.error} onRetry={ops.reload} />
  }

  const now = ops.now
  const { tasks, goals } = ops.data
  const today = localDateOf(now)

  const { overdue, dueToday, upcoming, noDueDate } = classifyTasks(tasks, now, UPCOMING_WINDOW_DAYS)
  // "What is due" is the overdue, today and next-seven-days sets together, put
  // through the one ordering the app has. Undated tasks are deliberately not
  // here: `prioritize` would rank them last anyway, and a "Today / Next" list
  // that ends in forty things with no date is a backlog, not a plan.
  const due = prioritize([...overdue, ...dueToday, ...upcoming], now)
  const summary = opsSummary({ tasks, goals, now })
  const behindGoals = goalsNeedingAttention(goals, now)

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

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <OpsErrorBanner error={ops.error} onDismiss={ops.dismissError} />

      <Panel className="flex min-w-0 flex-col gap-3 p-4" data-testid="ops-summary">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 text-sm font-medium" style={{ color: STATUS_TONE[summary.status] }}>
            {summary.headline}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {summary.metrics.map((metric) => (
            <Stat key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
        <p className="text-xs text-[var(--text-faint)]">{formatDateLong(today)}</p>
      </Panel>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2>What is next</h2>
          {/*
            The ordering, said out loud. It is lexicographic — four keys
            compared left to right — rather than a weighted score, precisely so
            a sentence like this one can exist. A user who disagrees with the
            top of the list can see which rule put it there and change the
            fact, instead of guessing at a number.
          */}
          <p className="text-xs text-[var(--text-muted)]">
            Overdue first, then due today, then due soon. Within each: high priority first, then the
            earliest date, then the oldest task.
          </p>
        </div>

        {due.length === 0 ? (
          <Panel className="p-4">
            <EmptyState
              title="Nothing is due."
              description={
                tasks.some((t) => !t.completed)
                  ? 'Everything open is either further out than a week or has no date on it.'
                  : 'There are no open tasks at all.'
              }
              action={
                <Link href="/ops/tasks" className="chip">
                  Go to Tasks
                </Link>
              }
            />
          </Panel>
        ) : (
          <ul className="flex min-w-0 flex-col gap-3">
            {due.map((task) => (
              <li key={task.id} className="min-w-0">
                <TaskRow
                  task={task}
                  now={now}
                  reason={explainPriority(task, now)}
                  busy={ops.busy}
                  onComplete={() => void complete(task)}
                />
              </li>
            ))}
          </ul>
        )}

        {noDueDate.length > 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            {noDueDate.length} open {noDueDate.length === 1 ? 'task has' : 'tasks have'} no due date.{' '}
            <Link href="/ops/tasks" className="underline">
              See them in Tasks
            </Link>
            .
          </p>
        ) : null}
      </section>

      {behindGoals.length > 0 ? (
        <section className="flex min-w-0 flex-col gap-3">
          <h2>Goals that need attention</h2>
          <ul className="flex min-w-0 flex-col gap-3">
            {behindGoals.map((goal) => {
              const evaluation = evaluateGoal(goal, now)
              return (
                <li key={goal.id} className="min-w-0">
                  <Panel className="flex min-w-0 flex-wrap items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">{goal.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatNumber(goal.current)} of {formatNumber(goal.target)} {goal.unit}
                        {evaluation.status === 'missed'
                          ? ` — deadline passed on ${formatDateLong(goal.deadline)}`
                          : ` — ${evaluation.daysRemaining} ${evaluation.daysRemaining === 1 ? 'day' : 'days'} left`}
                      </p>
                    </div>
                    <Tag variant="outline">
                      {evaluation.status === 'missed' ? 'Missed' : 'Behind'}
                    </Tag>
                  </Panel>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-[var(--text-muted)]">
            <Link href="/ops/goals" className="underline">
              Open Goals
            </Link>{' '}
            for the pace maths.
          </p>
        </section>
      ) : null}
    </div>
  )
}
