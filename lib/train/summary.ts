import { addDays, diffDays, mostRecentMonday } from '../date'
import type { AppSummary, SummaryProvider } from '../summary'
import { currentStreakWeeks, weeklyAdherence } from './analytics'
import type { Plan, Session, TrainingProfile } from './types'

export interface TrainSummaryInput {
  profile: TrainingProfile
  plan: Plan
  sessions: Session[]
  /** Local calendar date this summary is for, `YYYY-MM-DD`. */
  today: string
}

/** How large a gap since the last session before the card asks for attention. */
const ATTENTION_GAP_DAYS = 10

function bestMatchingDayLabel(plan: Plan, session: Session | undefined): string | undefined {
  if (!session || plan.days.length === 0) return undefined
  const loggedIds = new Set(session.sets.map((s) => s.exerciseId))
  if (loggedIds.size === 0) return undefined
  let bestLabel: string | undefined
  let bestOverlap = 0
  for (const day of plan.days) {
    const overlap = day.exerciseIds.filter((id) => loggedIds.has(id)).length
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestLabel = day.label
    }
  }
  return bestLabel
}

/** The plan day due next: one after whichever day the last session best matches. */
function nextDayLabel(plan: Plan, lastSession: Session | undefined): string {
  if (plan.days.length === 0) return 'a workout'
  const matched = bestMatchingDayLabel(plan, lastSession)
  if (!matched) return plan.days[0].label
  const index = plan.days.findIndex((d) => d.label === matched)
  return plan.days[(index + 1) % plan.days.length].label
}

/**
 * Train's Today card. Per `lib/summary.ts`, this is a plugin seam: Train
 * knows nothing about Today or the agent, it just publishes a flat
 * read-only summary of its own state.
 */
export const trainSummary: SummaryProvider<TrainSummaryInput> = (input) => {
  const { plan, sessions, today } = input

  if (sessions.length === 0) {
    const first = plan.days[0]?.label ?? 'your first workout'
    const summary: AppSummary = {
      appId: 'train',
      title: 'Train',
      href: '/train',
      status: 'idle',
      headline: `No sessions logged yet — ${first} is waiting whenever you are.`,
      metrics: [{ label: 'This week', value: '0', of: `${plan.daysPerWeek}`, fraction: 0 }],
      date: today,
    }
    return summary
  }

  const lastSession = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0]
  const daysSinceLast = diffDays(lastSession.date, today)

  const weekStart = mostRecentMonday(today)
  const adherence = weeklyAdherence(sessions, weekStart, plan.daysPerWeek)
  // Streak counts only fully-elapsed weeks, so a week still in progress
  // never gets counted as a miss before it has had the chance to be met.
  const streak = currentStreakWeeks(sessions, plan.daysPerWeek, addDays(weekStart, -7))

  const next = nextDayLabel(plan, lastSession)

  let headline: string
  if (daysSinceLast <= 0) {
    headline = `${next} up next — nice work getting a session in today.`
  } else if (daysSinceLast >= ATTENTION_GAP_DAYS) {
    headline = `It's been ${daysSinceLast} days since your last session — ${next} is ready whenever you are.`
  } else {
    headline = `${next} due today, ${daysSinceLast} day${daysSinceLast === 1 ? '' : 's'} since the last session.`
  }

  let status: AppSummary['status'] = 'ok'
  if (daysSinceLast >= ATTENTION_GAP_DAYS) status = 'attention'
  else if (!adherence.met && daysSinceLast >= 3) status = 'behind'

  const summary: AppSummary = {
    appId: 'train',
    title: 'Train',
    href: '/train',
    status,
    headline,
    metrics: [
      { label: 'This week', value: `${adherence.sessionCount}`, of: `${plan.daysPerWeek}`, fraction: adherence.sessionCount / plan.daysPerWeek },
      { label: 'Streak', value: `${streak}w` },
      { label: 'Last session', value: `${daysSinceLast}d ago` },
    ],
    date: today,
  }
  return summary
}
