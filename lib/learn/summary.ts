/**
 * Learn's contribution to the shared seam — the `AppSummary` that was missing.
 *
 * Diet, Train and Ops each published one (`lib/diet/summary.ts`,
 * `lib/train/summary.ts`, `lib/ops/summary.ts`); Learn never did, which meant
 * the one app the product is built around was invisible to Today and to the
 * agent. The agent cannot write "you logged 3 of 5 study days and you are over
 * on calories" if the study half does not appear at the seam at all, so this
 * file exists before the agent does.
 *
 * It is pure, like the other three: data in, `AppSummary` out, no I/O, no
 * clock. `today` is a parameter precisely so the agent can ask "what did Learn
 * look like last Tuesday" over the same already-loaded completions, which is
 * how a fourteen-day picture is built without widening the summary type or
 * reaching into Learn's tables.
 *
 * It imports `lib/progress` and `lib/content` — Learn's own selectors and its
 * own plan content — and nothing from Diet, Train or Ops. The ESLint zone in
 * `eslint.config.mjs` enforces that.
 */
import { completionKey, content } from '@/lib/content/index'
import {
  dayNumber,
  streak,
  tasksForDay,
  weekNumber,
  weekProgress,
  type Completed,
} from '@/lib/progress/selectors'
import type { AppSummary, AppStatus, SummaryMetric, SummaryProvider } from '@/lib/summary'

/** The plan's full length, per the guide. */
export const PLAN_DAYS = 180

/**
 * The last day that actually has tasks written for it.
 *
 * Derived rather than hardcoded: the plan is authored a month at a time, and a
 * summary that claims "nothing planned today" on day 31 because the content
 * simply has not been written yet would be a lie about the user, not about the
 * content. Past this day the card says which of the two it is.
 */
const AUTHORED_DAYS = content.days.reduce((max, day) => Math.max(max, day.number), 0)

/**
 * How far into a week before a half-finished week is worth flagging.
 *
 * Calling a week "behind" on its second day is noise — the week has not had a
 * chance to be met yet, which is the same reason `lib/train/analytics.ts`
 * counts streaks only over fully-elapsed weeks.
 */
const WEEK_JUDGEMENT_DAY = 5

/** Below this share of the week's planned minutes, the week is off track. */
const WEEK_OFF_TRACK = 0.5

export interface LearnSummaryInput {
  /** Day 1 of the 180-day plan, or null if it has not been set. */
  startDate: string | null
  /** `completionKey` → the local date it was completed. */
  completed: Completed
  /** The local date this summary describes, `YYYY-MM-DD`. */
  today: string
  /** Where the card links. Defaults to the roadmap, which is Learn's front door. */
  href?: string
}

interface DayCounts {
  planned: number
  done: number
}

function countsForDay(dayNum: number, completed: Completed): DayCounts {
  const tasks = tasksForDay(dayNum)
  let done = 0
  for (const task of tasks) {
    if (completed[completionKey(task)]) done += 1
  }
  return { planned: tasks.length, done }
}

/** Position within the current plan week, 1-7. */
function dayWithinWeek(dayNum: number): number {
  return ((dayNum - 1) % 7) + 1
}

export const learnSummary: SummaryProvider<LearnSummaryInput> = (input): AppSummary => {
  const { startDate, completed, today } = input
  const href = input.href ?? '/roadmap'
  const base = { appId: 'learn', title: 'Learn', href, date: today } as const

  const day = dayNumber(startDate, today)
  if (day === null) {
    return {
      ...base,
      status: 'idle',
      headline: 'The 180-day plan has no start date yet, so nothing is scheduled.',
      metrics: [],
    }
  }

  const { planned, done } = countsForDay(day, completed)
  const streakDays = streak(completed, today)

  const metrics: SummaryMetric[] = [
    {
      label: 'Day',
      value: String(day),
      of: `/ ${PLAN_DAYS}`,
      fraction: Math.min(1, day / PLAN_DAYS),
    },
  ]
  if (planned > 0) {
    metrics.push({
      label: 'Today',
      value: String(done),
      of: `/ ${planned}`,
      fraction: done / planned,
    })
  }
  metrics.push({ label: 'Streak', value: `${streakDays}d` })

  // The week's own picture, used only to decide whether a part-finished day is
  // a normal morning or a week quietly coming apart.
  const week = weekNumber(startDate, today)
  const progress = week === null ? null : weekProgress(week, completed)
  const weekOffTrack =
    progress !== null &&
    progress.plannedTotal > 0 &&
    dayWithinWeek(day) >= WEEK_JUDGEMENT_DAY &&
    progress.completedTotal / progress.plannedTotal < WEEK_OFF_TRACK

  let status: AppStatus
  if (day > AUTHORED_DAYS) status = 'idle'
  else if (planned === 0) status = streakDays > 0 ? 'ok' : 'idle'
  else if (done === planned) status = 'ok'
  else if (weekOffTrack) status = 'attention'
  else if (done > 0) status = 'behind'
  else status = 'idle'

  return {
    ...base,
    status,
    headline: headlineFor({ day, planned, done, streakDays, weekOffTrack }),
    metrics: metrics.slice(0, 3),
  }
}

function headlineFor(args: {
  day: number
  planned: number
  done: number
  streakDays: number
  weekOffTrack: boolean
}): string {
  const { day, planned, done, streakDays, weekOffTrack } = args
  const where = `Day ${day} of ${PLAN_DAYS}`

  if (day > AUTHORED_DAYS) {
    return `${where} — the plan is written as far as day ${AUTHORED_DAYS} so far.`
  }
  if (planned === 0) {
    return `${where} — a rest day, nothing scheduled.`
  }
  if (done === planned) {
    const tail = streakDays > 1 ? ` That's ${streakDays} days running.` : ''
    return `${where} — today's ${planned === 1 ? 'task is' : `${planned} tasks are`} done.${tail}`
  }
  if (done === 0) {
    return `${where} — nothing ticked off yet, ${planned} ${planned === 1 ? 'task' : 'tasks'} scheduled.`
  }
  if (weekOffTrack) {
    return `${where} — ${done} of ${planned} done today, and this week is under half finished.`
  }
  return `${where} — ${done} of ${planned} done today.`
}
