/**
 * When the agent is allowed to speak at all.
 *
 * "Stay silent below a stated minimum of data" is a requirement, not a nicety:
 * a confident brief built on three days of logs is worse than no brief, and
 * this is health-adjacent advice on an app with open signup. The minimum is
 * stated here, in one place, as numbers a test can pin.
 *
 * There are two separate gates and they fail for different reasons:
 *
 *  - **Not enough days.** One week of one app is a card, not a brief.
 *  - **Not enough apps.** The agent's entire claim is the sentence no single
 *    app could say. With one app contributing, there is no cross-domain
 *    sentence to write and the honest output is the app's own card.
 */
import type { AppTimeline } from './types'
import { activeDays } from './timeline'

/** Days on which at least one app recorded something, across the window. */
export const MIN_ACTIVE_DAYS = 5

/** Apps that must each have real history before a cross-app brief is honest. */
export const MIN_ACTIVE_APPS = 2

/** Days each app must have been used before it counts towards the gate. */
export const MIN_DAYS_PER_APP = 3

export interface Readiness {
  ready: boolean
  /** Plain English, shown to the reader. Never a stack trace, never a hedge. */
  reason: string | null
  activeDays: number
  activeApps: number
}

export function assessReadiness(timelines: AppTimeline[]): Readiness {
  const contributing = timelines.filter((t) => activeDays(t) >= MIN_DAYS_PER_APP)

  const days = new Set<string>()
  for (const timeline of timelines) {
    for (const day of timeline.days) {
      if (day.status !== 'idle') days.add(day.date)
    }
  }

  const activeApps = contributing.length
  const activeDayCount = days.size

  if (activeApps < MIN_ACTIVE_APPS) {
    return {
      ready: false,
      activeDays: activeDayCount,
      activeApps,
      reason:
        `A brief is the sentence no single app could say, so it needs at least ` +
        `${MIN_ACTIVE_APPS} apps with ${MIN_DAYS_PER_APP} days of history each. ` +
        `${activeApps === 0 ? 'None' : `Only ${activeApps}`} ${activeApps === 1 ? 'has' : 'have'} that so far.`,
    }
  }

  if (activeDayCount < MIN_ACTIVE_DAYS) {
    return {
      ready: false,
      activeDays: activeDayCount,
      activeApps,
      reason:
        `There are ${activeDayCount} days with anything recorded on them, and a brief needs ` +
        `${MIN_ACTIVE_DAYS}. Anything said before that is a guess wearing a confident voice.`,
    }
  }

  return { ready: true, reason: null, activeDays: activeDayCount, activeApps }
}
