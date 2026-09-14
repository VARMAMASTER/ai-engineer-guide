/**
 * Reading an `AppTimeline` without knowing anything about the app.
 *
 * Every helper here works off `AppSummary`'s TYPED fields — `status`, `date`,
 * and `SummaryMetric.trend` — and never off a metric's label or its
 * pre-formatted `value`. That restraint is deliberate. `value` is documented as
 * display text ("1,840", "79.4 kg", "3d ago"); a rule that regex-parsed it
 * would be reaching through the seam by other means, and would break silently
 * the first time an app changed its rounding. Where the brief needs to state a
 * magnitude it quotes the app's own string verbatim instead of re-deriving it.
 *
 * The cost of that is real and is reported rather than hidden: the agent can
 * say "you logged nothing on six of the last fourteen days" (typed) but not
 * "you are 400 kcal over" (a number only Diet's own formatting knows).
 */
import type { AppStatus, AppSummary, SummaryMetric } from '@/lib/summary'
import type { AppTimeline } from './types'

/** The statuses that mean "this app is not where it should be today". */
const OFF_TRACK: ReadonlySet<AppStatus> = new Set<AppStatus>(['behind', 'attention'])

/** The status that means "nothing happened in this app on this day". */
export function isQuiet(summary: AppSummary): boolean {
  return summary.status === 'idle'
}

export function isOffTrack(summary: AppSummary): boolean {
  return OFF_TRACK.has(summary.status)
}

/** A day on which the app recorded something at all. */
export function isActive(summary: AppSummary): boolean {
  return summary.status !== 'idle'
}

/** The most recent day in the timeline, or undefined for an empty one. */
export function latest(timeline: AppTimeline): AppSummary | undefined {
  return timeline.days[timeline.days.length - 1]
}

export function countDays(timeline: AppTimeline, predicate: (s: AppSummary) => boolean): number {
  return timeline.days.filter(predicate).length
}

export function activeDays(timeline: AppTimeline): number {
  return countDays(timeline, isActive)
}

/**
 * How many days, counting back from the most recent, the predicate has held
 * without a break. Zero when the most recent day does not satisfy it.
 *
 * This is the shape of every "for the last N days" fact: a run that is still
 * running. A plain count would say "flat on 12 of 14 days" and hide that the
 * two exceptions were at the start.
 */
export function currentRun(timeline: AppTimeline, predicate: (s: AppSummary) => boolean): number {
  let run = 0
  for (let i = timeline.days.length - 1; i >= 0; i -= 1) {
    if (!predicate(timeline.days[i])) break
    run += 1
  }
  return run
}

/**
 * The metric an app uses to say which way something is moving.
 *
 * Found by its typed `trend` field rather than by its label, so this keeps
 * working whether Diet calls it "Trend", "Weight" or anything else — and finds
 * nothing at all, rather than the wrong thing, in an app that has no such
 * metric.
 */
export function directionalMetric(summary: AppSummary): SummaryMetric | undefined {
  return summary.metrics.find((m) => m.trend !== undefined && m.trend !== 'unknown')
}

/** The set of dates present in a timeline. */
export function datesOf(timeline: AppTimeline): Set<string> {
  return new Set(timeline.days.map((d) => d.date))
}

/** A timeline indexed by date, for lining two apps up day against day. */
export function byDate(timeline: AppTimeline): Map<string, AppSummary> {
  return new Map(timeline.days.map((d) => [d.date, d]))
}

/**
 * Days on which both apps have a summary and both predicates hold.
 *
 * Used only to COUNT co-occurrence. Nothing here, or anywhere downstream, may
 * turn a count into a cause — with one person and a fortnight of data that is
 * noise, and spec 5.1.2 is explicit that a health app reporting noise as
 * insight does real harm.
 */
export function coincidingDays(
  a: AppTimeline,
  b: AppTimeline,
  predicateA: (s: AppSummary) => boolean,
  predicateB: (s: AppSummary) => boolean,
): string[] {
  const other = byDate(b)
  const dates: string[] = []
  for (const day of a.days) {
    const match = other.get(day.date)
    if (match && predicateA(day) && predicateB(match)) dates.push(day.date)
  }
  return dates
}

/** Look a timeline up by app id, so rules can be written per app without index maths. */
export function timelineFor(timelines: AppTimeline[], appId: string): AppTimeline | undefined {
  return timelines.find((t) => t.appId === appId)
}

/** Everything a summary says, minus the date. Two equal shapes are the same day twice. */
function shapeOf(summary: AppSummary): string {
  const metrics = summary.metrics.map((m) => `${m.label}=${m.value}${m.of ?? ''}${m.trend ?? ''}`)
  return [summary.status, summary.headline, ...metrics].join('|')
}

/**
 * Whether an app's fortnight contains more than one day repeated fourteen times.
 *
 * This exists because of a genuine gap in `AppSummary`, found by running the
 * agent against a real three-day-old account rather than a fixture.
 *
 * `AppStatus` has an `idle` for "nothing happened here", and Diet, Train and
 * Learn all use it. Ops never emits it: an account with no tasks at all and an
 * account that is simply on top of everything both produce `ok` and the
 * headline "Nothing due today." So `status !== 'idle'` — the obvious reading of
 * "has this app been used" — counted fourteen active days for an app the user
 * had never opened, which let the readiness gate approve a brief built on one
 * app and three days of food. That is precisely the confident-voice-on-thin-
 * evidence failure the gate exists to prevent.
 *
 * Identity across the whole window is the strongest signal the seam actually
 * carries, so it is the one used. It is conservative by construction: it can
 * only make the agent quieter, never louder, and an app in genuine use varies
 * at least once in a fortnight.
 *
 * The real fix belongs in the seam, not here, and is in the report: either Ops
 * emits `idle` when it holds no tasks, or `AppSummary` grows an explicit
 * "this app holds nothing yet" flag that no app has to infer.
 */
export function hasVariation(timeline: AppTimeline): boolean {
  if (timeline.days.length < 2) return false
  const first = shapeOf(timeline.days[0])
  return timeline.days.some((day) => shapeOf(day) !== first)
}
