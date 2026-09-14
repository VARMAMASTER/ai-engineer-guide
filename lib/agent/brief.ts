/**
 * The whole agent, as one pure-ish function.
 *
 * Everything it needs arrives as arguments — the timelines, the date, and the
 * function that talks to a model — so the entire brief can be tested against
 * fixture summaries with no database, no network and no clock. That is the
 * property spec 4.2 asked for in as many words: "feed it fixture summaries from
 * four apps and assert the brief it writes."
 *
 * The order is the design:
 *
 *   1. Rules run first and always. They cost nothing and they are right.
 *   2. The readiness gate can stop everything. Silence is a valid brief.
 *   3. Only then, and only if there is something cross-domain to join, is a
 *      token spent.
 *   4. Whatever comes back is verified against the figures that went in, and
 *      dropped if it does not check out.
 *
 * A failure at step 3 or 4 never costs the reader step 1. The observations are
 * the brief; the synthesis is the sentence on top of it.
 */
import type { AppTimeline, Brief, Observation } from './types'
import { coverageOf, observe } from './observations'
import { assessReadiness } from './readiness'
import { buildPrompt } from './prompt'
import { proposeFrom } from './proposals'
import { verifySynthesis } from './verify'
import type { SynthesisOutcome } from './model'

/**
 * How many apps an observation set must touch before a model is worth paying.
 *
 * One app's facts do not need joining — they are already one app's card, and
 * Today shows those for free. The model is bought for the sentence that spans
 * two, so below that we do not buy it.
 */
export const MIN_APPS_FOR_SYNTHESIS = 2

export type Synthesiser = (args: { system: string; prompt: string }) => Promise<SynthesisOutcome>

function appsTouched(observations: Observation[]): number {
  const apps = new Set<string>()
  for (const observation of observations) for (const app of observation.apps) apps.add(app)
  return apps.size
}

export interface BuildBriefArgs {
  timelines: AppTimeline[]
  today: string
  /** Omit to produce the deterministic brief without spending anything. */
  synthesise?: Synthesiser
}

export async function buildBrief(args: BuildBriefArgs): Promise<Brief> {
  const { timelines, today, synthesise } = args

  const observations = observe(timelines)
  const coverage = coverageOf(timelines)
  const readiness = assessReadiness(timelines)

  if (!readiness.ready) {
    return {
      date: today,
      status: 'not-enough-data',
      // Deliberately empty. Showing three of the rules' findings under a
      // heading that says "not enough data" is the hedged half-brief this gate
      // exists to prevent.
      observations: [],
      synthesis: null,
      model: null,
      synthesisFailure: null,
      reason: readiness.reason,
      proposals: [],
      coverage,
    }
  }

  const proposals = proposeFrom(observations, today)

  if (observations.length === 0) {
    return {
      date: today,
      status: 'ready',
      observations,
      synthesis: null,
      model: null,
      synthesisFailure: 'not-requested',
      reason: 'Nothing crossed a threshold today. That is the good version of this screen.',
      proposals,
      coverage,
    }
  }

  if (!synthesise || appsTouched(observations) < MIN_APPS_FOR_SYNTHESIS) {
    return {
      date: today,
      status: 'observations-only',
      observations,
      synthesis: null,
      model: null,
      synthesisFailure: 'not-requested',
      reason: synthesise
        ? 'Only one app had anything to say today, so there is no cross-app sentence to write.'
        : null,
      proposals,
      coverage,
    }
  }

  const { system, prompt, allowedFigures } = buildPrompt({ today, observations, timelines })
  const outcome = await synthesise({ system, prompt })

  if (!outcome.ok) {
    return {
      date: today,
      status: 'observations-only',
      observations,
      synthesis: null,
      model: null,
      synthesisFailure: outcome.failure,
      reason: outcome.detail,
      proposals,
      coverage,
    }
  }

  const verified = verifySynthesis(outcome.text, allowedFigures)
  if (!verified.ok) {
    return {
      date: today,
      status: 'observations-only',
      observations,
      synthesis: null,
      model: outcome.model,
      synthesisFailure: 'unverifiable',
      reason: `The model's note was dropped: ${verified.detail}`,
      proposals,
      coverage,
    }
  }

  return {
    date: today,
    status: 'ready',
    observations,
    synthesis: verified.text,
    model: outcome.model,
    synthesisFailure: null,
    reason: null,
    proposals,
    coverage,
  }
}
