/**
 * Proposals: sentences with two buttons, and nothing else.
 *
 * Accepting one writes a single row saying you accepted it. It does not change
 * a target, reschedule a session, complete a task or touch the 180-day plan —
 * which is not a limitation of the current version but the design. The owner's
 * words were "strictly I will follow"; an agent that rewrote the week when two
 * study days were missed would be an excuse machine with good manners.
 *
 * So the rule that governs this file is: a proposal may suggest something the
 * PERSON does, in the app that owns it. It may never suggest a change to the
 * study plan, and `lib/agent/verify.ts` treats that as a rejectable claim if a
 * model ever phrases one.
 *
 * Every proposal below is deterministic — same observations in, same proposals
 * out, no model involved. The 200 kcal in the stall proposal is arithmetic from
 * the spec, not a figure anybody guessed.
 */
import type { Observation, Proposal } from './types'

/** The cut suggested when the trend has genuinely stopped moving (spec 5.4). */
export const STALL_KCAL_CUT = 200

type Draft = Omit<Proposal, 'id' | 'state'>

/**
 * What each rule suggests, when it suggests anything.
 *
 * Rules absent from this map are observations only. `learn-missed-days` is
 * absent from the "change the plan" direction on purpose and appears here only
 * as a suggestion to schedule the study you already agreed to do.
 */
const DRAFTS: Record<string, (o: Observation) => Draft> = {
  'diet-weight-flat': (o) => ({
    title: `Consider taking ${STALL_KCAL_CUT} kcal off your daily target`,
    body:
      `The trend line, not the scale, has been flat for long enough that the current target and ` +
      `your actual expenditure have probably met. ${STALL_KCAL_CUT} kcal is the usual next step. ` +
      `Change it yourself in Diet → Setup if you agree; nothing here will change it for you.`,
    apps: o.apps,
    severity: o.severity,
  }),
  'diet-quiet-days': (o) => ({
    title: 'Log the days you would rather not log',
    body:
      'An unlogged day is invisible rather than zero, so the gaps drag every average and every ' +
      'forecast towards a number that was never true. A rough estimate beats nothing.',
    apps: o.apps,
    severity: o.severity,
  }),
  'learn-missed-days': (o) => ({
    title: 'Give the study block a time, in Ops',
    body:
      'The plan itself does not move — that is the point of it. What can move is when in the day ' +
      'it happens. A task with a due time is the cheapest thing that has ever fixed this.',
    apps: [...o.apps, 'ops'],
    severity: o.severity,
  }),
  'train-off-track-run': (o) => ({
    title: 'Put the next session in the calendar rather than in your intentions',
    body:
      'Train knows which day is next and will wait indefinitely. A dated task in Ops is what turns ' +
      'it into a thing that happens this week.',
    apps: [...o.apps, 'ops'],
    severity: o.severity,
  }),
  'ops-overdue-run': (o) => ({
    title: 'Take one overdue task and either do it or delete it',
    body:
      'A task that has been overdue for days is not a task, it is a decision you have not made. ' +
      'Deleting it is a legitimate outcome and costs nothing.',
    apps: o.apps,
    severity: o.severity,
  }),
}

/**
 * Proposals for a day's observations.
 *
 * Ids are `<date>:<rule>` so that regenerating today's brief reuses the same
 * rows — a proposal you dismissed at breakfast stays dismissed — while
 * tomorrow's is genuinely a new thing to decide about.
 */
export function proposeFrom(observations: Observation[], date: string): Proposal[] {
  const out: Proposal[] = []
  for (const observation of observations) {
    if (observation.severity !== 'act') continue
    const draft = DRAFTS[observation.id]
    if (!draft) continue
    out.push({ ...draft(observation), id: `${date}:${observation.id}`, state: 'pending' })
  }
  return out
}
