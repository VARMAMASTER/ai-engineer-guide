/**
 * The adapter, and the ONLY file in `lib/agent/**` that knows an app exists.
 *
 * Read this before reading it as a boundary violation. Spec 4.2 permits the
 * agent exactly one privilege — it "reads every app through those same read
 * APIs, never by joining tables" — and someone has to do the reading. This
 * file is that someone, and it is kept deliberately stupid:
 *
 *   - It calls each app's OWN loader and each app's OWN published
 *     `SummaryProvider`. It writes no query against another app's tables, and
 *     it joins nothing.
 *   - It hands onward `AppSummary` and nothing else. Every gram of the agent's
 *     analysis — `observations.ts`, `readiness.ts`, `brief.ts` — sees only the
 *     seam, which is why the whole brief can be tested against four fixture
 *     summaries with no database at all.
 *
 * If a rule ever needs something an `AppSummary` cannot carry, the fix is a
 * richer shared type agreed in `lib/summary.ts`, not a new import here.
 *
 * ── The one honest caveat, stated where it matters ──
 *
 * A timeline is built by asking each app for its summary AS AT each of the last
 * fourteen dates, over data loaded once. For Diet, Train and Learn that is
 * exact: entries, sets, weights and completions are all dated events, so
 * replaying a past date reconstructs that date. For Ops it is an approximation,
 * because a task carries its CURRENT state — a task that was overdue on Tuesday
 * and was completed on Wednesday reads as never having been overdue.
 *
 * That error runs in one direction only: it under-reports. The agent may
 * therefore miss a fact about Ops; it cannot manufacture one. Given the brief
 * is advice about somebody's health and habits, an approximation that can only
 * fall silent is the one worth shipping.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays } from '@/lib/date'
import type { AppSummary } from '@/lib/summary'
import { dietSummary } from '@/lib/diet/summary'
import { trainSummary } from '@/lib/train/summary'
import { opsSummary } from '@/lib/ops/summary'
import { learnSummary } from '@/lib/learn/summary'
import { loadLearnState } from '@/lib/learn/data'
import { fetchTrainState } from '@/lib/train/data'
import { loadOps } from '@/lib/ops/data'
import type { DietSnapshot } from '@/lib/diet/data'
import type { AppTimeline } from './types'

/**
 * Days of history the agent looks over.
 *
 * Two weeks: long enough that "flat for twelve days" and "six of the last
 * fourteen" are statements about a habit, short enough that it is still about
 * now. It is also the window Diet's own analytics use to switch from the
 * population formula to a measured TDEE, so the two halves of the app agree
 * about what counts as recent.
 */
export const WINDOW_DAYS = 14

/** Midday, so a replayed date sits safely inside itself in any timezone. */
function middayOf(date: string): Date {
  return new Date(`${date}T12:00:00`)
}

function windowDates(today: string): string[] {
  return Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i - (WINDOW_DAYS - 1)))
}

/** Build one app's timeline, or nothing at all if the app cannot be read. */
function timeline(
  appId: string,
  dates: string[],
  make: (date: string) => AppSummary | null,
): AppTimeline | null {
  const days: AppSummary[] = []
  for (const date of dates) {
    const summary = make(date)
    if (summary) days.push(summary)
  }
  if (days.length === 0) return null
  const first = days[0]
  return { appId, title: first.title, href: first.href, days }
}

export interface CollectResult {
  timelines: AppTimeline[]
  /** Apps that could not be read at all, by id, with why. Shown, never swallowed. */
  unavailable: { appId: string; reason: string }[]
}

/**
 * Every app's fortnight, through the seam.
 *
 * One app failing does not fail the brief. A brief covering three of four apps
 * and saying so is worth more than a 500, and the omission is reported rather
 * than quietly rendered as "nothing logged" — which would be the agent telling
 * somebody they had skipped a fortnight of training because a query timed out.
 */
export async function collectTimelines(args: {
  supabase: SupabaseClient
  today: string
  /** Diet's snapshot, loaded by the caller through Diet's own query module. */
  diet: DietSnapshot | null
  dietError?: string | null
}): Promise<CollectResult> {
  const { supabase, today, diet } = args
  const dates = windowDates(today)
  const timelines: AppTimeline[] = []
  const unavailable: { appId: string; reason: string }[] = []

  if (diet) {
    const built = timeline('diet', dates, (date) =>
      dietSummary({
        date,
        entries: diet.entries,
        weights: diet.weights,
        targets: diet.targets,
        window: diet.window,
      }),
    )
    if (built) timelines.push(built)
  } else {
    unavailable.push({ appId: 'diet', reason: args.dietError ?? 'Diet could not be read.' })
  }

  const [train, ops, learn] = await Promise.allSettled([
    fetchTrainState(supabase),
    loadOps(supabase),
    loadLearnState(supabase),
  ])

  if (train.status === 'fulfilled') {
    const state = train.value
    const { profile, plan } = state
    if (profile && plan) {
      const built = timeline('train', dates, (date) =>
        trainSummary({ profile, plan, sessions: state.sessions, today: date }),
      )
      if (built) timelines.push(built)
    }
    // No profile yet is not a failure — Train simply has nothing to contribute,
    // and an app with nothing to contribute contributes no card.
  } else {
    unavailable.push({ appId: 'train', reason: String(train.reason).slice(0, 200) })
  }

  if (ops.status === 'fulfilled') {
    const built = timeline('ops', dates, (date) =>
      opsSummary({ tasks: ops.value.tasks, goals: ops.value.goals, now: middayOf(date) }),
    )
    if (built) timelines.push(built)
  } else {
    unavailable.push({ appId: 'ops', reason: String(ops.reason).slice(0, 200) })
  }

  if (learn.status === 'fulfilled') {
    const state = learn.value
    const built = timeline('learn', dates, (date) =>
      learnSummary({ startDate: state.startDate, completed: state.completed, today: date }),
    )
    if (built) timelines.push(built)
  } else {
    unavailable.push({ appId: 'learn', reason: String(learn.reason).slice(0, 200) })
  }

  return { timelines, unavailable }
}
