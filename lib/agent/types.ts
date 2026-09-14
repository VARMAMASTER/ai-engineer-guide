/**
 * The advisory agent's vocabulary.
 *
 * Two rules from spec 5.4 shape every type here, and they are worth restating
 * because the types only make sense in their light:
 *
 *  1. **Advisory only.** Nothing in this module can change anything. A
 *     `Proposal` is a sentence with two buttons; accepting one records that you
 *     read it, and writes to no app's tables. The 180-day study plan is never
 *     touched at all, by anything, ever.
 *  2. **Rules compute, the model writes.** An `Observation` is produced by a
 *     pure function over `AppSummary` timelines — arithmetic, free, right every
 *     time. The `synthesis` is the only thing a model produces, and it may
 *     restate the observations' figures and no others.
 *
 * `figures` on an `Observation` is the mechanism for that second rule rather
 * than a nicety: it is the exact set of number-strings the rules produced, and
 * `lib/agent/verify.ts` rejects a synthesis that states any figure outside it.
 */
import type { AppSummary } from '@/lib/summary'

/**
 * How much an observation is asking of the reader.
 *
 * Not a score and not a priority: `act` means a deterministic rule fired with
 * enough evidence to suggest doing something, `watch` means a pattern is
 * forming, `info` means it is context the synthesis may want.
 */
export type ObservationSeverity = 'info' | 'watch' | 'act'

export interface Observation {
  /** Stable rule id, so the same fact keeps the same identity day to day. */
  id: string
  /** Which apps this fact draws on. Two or more is what makes it cross-domain. */
  apps: string[]
  severity: ObservationSeverity
  /** The fact as a finished sentence. Deterministic — no model wrote this. */
  text: string
  /**
   * Every figure the fact states, exactly as written in `text`.
   *
   * The synthesis may use these and nothing else. A model that emits a number
   * outside this set has invented it, which for a health-adjacent brief is a
   * bug rather than a stylistic lapse.
   */
  figures: string[]
}

/**
 * Something the agent suggests. It is never applied, by anything.
 *
 * `accepted` means "I have read this and I intend to do it" — the doing is the
 * user's, in whichever app owns the change. That is the whole point: an agent
 * that rescheduled the week when two study days were missed would be an excuse
 * machine with good manners.
 */
export type ProposalState = 'pending' | 'accepted' | 'dismissed'

export interface Proposal {
  /** Stable across regenerations of the same day, so a dismissal sticks. */
  id: string
  title: string
  body: string
  apps: string[]
  severity: ObservationSeverity
  state: ProposalState
}

/**
 * Why a brief is or is not speaking.
 *
 * `not-enough-data` is a first-class outcome, not an error. A confident brief
 * built on three days of logs is worse than no brief, and spec 5.1.2 requires
 * silence below a stated minimum rather than a hedged guess.
 */
export type BriefStatus = 'ready' | 'not-enough-data' | 'observations-only'

/** Why the model did not write the cross-domain sentence, when it did not. */
export type SynthesisFailure =
  | 'no-credit'
  | 'budget-exhausted'
  | 'rate-limited'
  | 'unavailable'
  | 'unverifiable'
  | 'not-requested'

export interface Brief {
  /** The local date the brief describes, `YYYY-MM-DD`. */
  date: string
  status: BriefStatus
  /** The deterministic half. Present even when the model is not. */
  observations: Observation[]
  /** The cross-domain sentence a rule cannot phrase, or null. */
  synthesis: string | null
  /** The gateway model id that wrote `synthesis`, for the record. */
  model: string | null
  /** Set when `synthesis` is null, naming which state we are in. */
  synthesisFailure: SynthesisFailure | null
  /** Plain English for the reader when the brief is quiet. */
  reason: string | null
  proposals: Proposal[]
  /** Which apps contributed a timeline, and how many days each. */
  coverage: { appId: string; title: string; days: number; activeDays: number }[]
}

/**
 * One app's summaries over a window of days, oldest first.
 *
 * This is the agent's ONLY view of an app. It is not a richer type smuggled in
 * past the seam: it is the same `AppSummary` every app already publishes, asked
 * for once per day. A duration — "flat for twelve days", "nothing logged on six
 * of the last fourteen" — is not expressible in one day's summary, and asking
 * each app for its own summary on each past date gets there without widening
 * the type and without either app knowing the other exists.
 */
export interface AppTimeline {
  appId: string
  title: string
  href: string
  /** Ascending by date. May have gaps if an app could not be read. */
  days: AppSummary[]
}
