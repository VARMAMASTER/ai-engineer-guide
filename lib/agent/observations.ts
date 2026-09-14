/**
 * The rules. Arithmetic over `AppSummary` timelines, and not one token spent.
 *
 * Spec 5.4: "Deterministic rules compute the facts... Never spend a token where
 * a formula works." Everything in this file is a pure function you can test
 * exhaustively, and every figure the brief is ever allowed to state originates
 * here or in an app's own published summary. The model's job starts after this
 * file has finished and is limited to joining these sentences into one.
 *
 * Three constraints bind every rule below:
 *
 *  - **Never speak about an app that has no history.** A brand-new account has
 *    fourteen quiet days in Diet because it is new, not because it is slipping.
 *    Each rule requires the app to have been used at all before commenting.
 *  - **Observe, never diagnose.** Co-occurrence is reported as a count of days,
 *    phrased so that no causal reading is offered. "On five of those six days
 *    you also ticked nothing off the plan" is a fact; "skipping study makes you
 *    overeat" is noise dressed as medicine.
 *  - **Every figure appears in `figures`.** That is what lets `verify.ts` catch
 *    a model that invents a number.
 */
import type { AppSummary } from '@/lib/summary'
import { figuresIn } from './prompt'
import type { AppTimeline, Observation } from './types'
import {
  activeDays,
  coincidingDays,
  countDays,
  currentRun,
  directionalMetric,
  isActive,
  isOffTrack,
  isQuiet,
  latest,
  timelineFor,
} from './timeline'

/* ------------------------------------------------------------ thresholds -- */

/**
 * The thresholds, in one place and named, because every one of them is a
 * judgement about when a pattern stops being weather.
 */
export const THRESHOLDS = {
  /** An app must have been used on at least this many days before it is judged. */
  minActiveDaysToJudge: 3,
  /** Quiet days in the window before "you have stopped logging" is worth saying. */
  quietDaysWorthSaying: 3,
  /** Consecutive flat days before a stall is a stall rather than a fortnight. */
  flatRunWorthSaying: 10,
  /** Consecutive off-track days in one app before it is a run rather than a day. */
  offTrackRunWorthSaying: 3,
  /** Days two apps must be quiet together before the overlap is worth counting. */
  overlapWorthSaying: 3,
  /** Apps simultaneously off track on the most recent day before that is a fact. */
  simultaneousAppsWorthSaying: 2,
} as const

/* --------------------------------------------------------------- helpers -- */

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

/** A timeline worth drawing conclusions about at all. */
function judgeable(timeline: AppTimeline | undefined): timeline is AppTimeline {
  return timeline !== undefined && activeDays(timeline) >= THRESHOLDS.minActiveDaysToJudge
}

/* ----------------------------------------------------------------- rules -- */

/**
 * Diet: days in the window with nothing logged.
 *
 * An unlogged day is invisible, not zero — Diet's own rule — so this counts
 * absence of data and says exactly that, rather than implying a fast.
 */
function dietQuietDays(timelines: AppTimeline[]): Observation | null {
  const diet = timelineFor(timelines, 'diet')
  if (!judgeable(diet)) return null
  const quiet = countDays(diet, isQuiet)
  if (quiet < THRESHOLDS.quietDaysWorthSaying) return null
  const window = diet.days.length
  return {
    id: 'diet-quiet-days',
    apps: ['diet'],
    severity: quiet >= window / 2 ? 'act' : 'watch',
    text: `You logged no food at all on ${quiet} of the last ${window} days.`,
    figures: [String(quiet), String(window)],
  }
}

/** Diet: days the app itself flagged as needing attention. */
function dietAttentionDays(timelines: AppTimeline[]): Observation | null {
  const diet = timelineFor(timelines, 'diet')
  if (!judgeable(diet)) return null
  const flagged = countDays(diet, (d) => d.status === 'attention')
  if (flagged === 0) return null
  const window = diet.days.length
  return {
    id: 'diet-attention-days',
    apps: ['diet'],
    severity: flagged >= 5 ? 'act' : 'watch',
    text: `Diet flagged ${flagged} of the last ${window} days as over target.`,
    figures: [String(flagged), String(window)],
  }
}

/**
 * Diet: the weight trend has not moved.
 *
 * Read off the metric's typed `trend`, which Diet computes from its EWMA — so
 * this is the trend line stalling, not the scale wobbling on water, which is
 * the distinction that keeps people weighing themselves.
 */
function weightStall(timelines: AppTimeline[]): Observation | null {
  const diet = timelineFor(timelines, 'diet')
  if (!judgeable(diet)) return null
  const run = currentRun(diet, (d) => directionalMetric(d)?.trend === 'flat')
  if (run < THRESHOLDS.flatRunWorthSaying) return null
  const current = directionalMetric(latest(diet) as AppSummary)
  const reading = current ? ` It currently reads ${current.value}.` : ''
  return {
    id: 'diet-weight-flat',
    apps: ['diet'],
    severity: 'act',
    text: `Your weight trend has been flat for ${run} days running.${reading}`,
    // Diet's own formatted value carries a unit ("79.4 kg"), and `figures` is a
    // set of NUMBERS — the thing a model could invent. Quoting the unit here
    // would put "79.4 kg" in the allowed set and leave the bare 79.4 a model
    // writes looking invented, which would reject an honest sentence.
    figures: [String(run), ...(current ? figuresIn(current.value) : [])],
  }
}

/** Train: a run of days the app has been asking for attention. */
function trainRun(timelines: AppTimeline[]): Observation | null {
  const train = timelineFor(timelines, 'train')
  if (!judgeable(train)) return null
  const run = currentRun(train, isOffTrack)
  if (run < THRESHOLDS.offTrackRunWorthSaying) return null
  const today = latest(train)
  return {
    id: 'train-off-track-run',
    apps: ['train'],
    severity: run >= 7 ? 'act' : 'watch',
    text: `Train has been off its plan for ${run} days in a row. Its own read: ${today?.headline ?? ''}`.trim(),
    figures: [String(run)],
  }
}

/** Ops: a run of days with something overdue. */
function opsRun(timelines: AppTimeline[]): Observation | null {
  const ops = timelineFor(timelines, 'ops')
  if (!judgeable(ops)) return null
  const run = currentRun(ops, (d) => d.status === 'attention')
  if (run < THRESHOLDS.offTrackRunWorthSaying) return null
  return {
    id: 'ops-overdue-run',
    apps: ['ops'],
    severity: run >= 7 ? 'act' : 'watch',
    text: `Something has been overdue in Ops every day for ${run} days.`,
    figures: [String(run)],
  }
}

/**
 * Learn: scheduled days on which nothing was ticked off.
 *
 * This observes; it never proposes a change to the plan. The plan being fixed
 * is the product, and an agent that offered to reschedule the week would be the
 * exact thing spec 5.4 refuses to build.
 */
function learnMissedDays(timelines: AppTimeline[]): Observation | null {
  const learn = timelineFor(timelines, 'learn')
  if (!judgeable(learn)) return null
  const missed = countDays(learn, isQuiet)
  if (missed < THRESHOLDS.quietDaysWorthSaying) return null
  const window = learn.days.length
  const done = window - missed
  return {
    id: 'learn-missed-days',
    apps: ['learn'],
    severity: missed >= window / 2 ? 'act' : 'watch',
    text: `You ticked something off the study plan on ${done} of the last ${window} days.`,
    figures: [String(done), String(window)],
  }
}

/**
 * The cross-domain count, and the only reason this agent exists.
 *
 * Two apps quiet on the SAME days is a fact about those days. It is stated as a
 * count and nothing more: no mechanism, no advice, no "because". With one
 * person and a fortnight, anything stronger is invented.
 */
function quietTogether(timelines: AppTimeline[]): Observation[] {
  const out: Observation[] = []
  const pairs: [string, string][] = [
    ['diet', 'learn'],
    ['train', 'learn'],
    ['diet', 'train'],
  ]
  for (const [aId, bId] of pairs) {
    const a = timelineFor(timelines, aId)
    const b = timelineFor(timelines, bId)
    if (!judgeable(a) || !judgeable(b)) continue
    const quietA = countDays(a, isQuiet)
    if (quietA < THRESHOLDS.quietDaysWorthSaying) continue
    const both = coincidingDays(a, b, isQuiet, isQuiet).length
    if (both < THRESHOLDS.overlapWorthSaying) continue
    out.push({
      id: `quiet-together-${aId}-${bId}`,
      apps: [aId, bId],
      severity: 'watch',
      text:
        `Of the ${quietA} days with nothing logged in ${a.title}, ${both} ` +
        `${plural(both, 'was', 'were')} also a day with nothing in ${b.title}.`,
      figures: [String(quietA), String(both)],
    })
  }
  return out
}

/** How many apps are off track right now — the shape of today, in one number. */
function offTrackToday(timelines: AppTimeline[]): Observation | null {
  const today = timelines
    .filter((t) => judgeable(t))
    .map((t) => ({ timeline: t, summary: latest(t) }))
    .filter((x): x is { timeline: AppTimeline; summary: AppSummary } => x.summary !== undefined)
  const off = today.filter((x) => isOffTrack(x.summary))
  if (off.length < THRESHOLDS.simultaneousAppsWorthSaying) return null
  const names = off.map((x) => x.timeline.title)
  return {
    id: 'off-track-today',
    apps: off.map((x) => x.timeline.appId),
    severity: 'watch',
    text: `${names.length} of your apps are off track today at once: ${names.join(', ')}.`,
    figures: [String(names.length)],
  }
}

/* ------------------------------------------------------------- the suite -- */

/**
 * Every rule, run in order. Order is presentation order: the cross-app facts
 * last, because they are the ones the synthesis is meant to pick up.
 */
export function observe(timelines: AppTimeline[]): Observation[] {
  const singles = [
    weightStall,
    dietQuietDays,
    dietAttentionDays,
    trainRun,
    opsRun,
    learnMissedDays,
    offTrackToday,
  ]
  const out: Observation[] = []
  for (const rule of singles) {
    const observation = rule(timelines)
    if (observation) out.push(observation)
  }
  out.push(...quietTogether(timelines))
  return out
}

/** Only the days an app actually recorded something, per app. */
export function coverageOf(timelines: AppTimeline[]) {
  return timelines.map((t) => ({
    appId: t.appId,
    title: t.title,
    days: t.days.length,
    activeDays: countDays(t, isActive),
  }))
}
