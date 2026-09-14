import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/user'
import { loadTrainState } from '../state'
import PlanEditor from './PlanEditor'

export const metadata: Metadata = {
  title: 'Plan | Train | Unyfide',
}

/**
 * Set up or rebuild the training week.
 *
 * `requireUser()` as well as the proxy, the same belt-and-braces the account
 * page uses: the proxy's matcher is a regular expression, and a regular
 * expression is exactly the kind of thing that stops matching one day without
 * telling anyone.
 */
export default async function TrainPlanPage() {
  const user = await requireUser('/train/plan')
  const { state, error } = await loadTrainState()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Train</p>
        <h1>Plan</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Four answers make the week: what you are training for, how many days you have, what you
          can lift with, and what hurts.
        </p>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      <PlanEditor
        userId={user.id}
        initialProfile={state.profile}
        initialPlan={state.plan}
        hasSessions={state.sessions.length > 0}
      />
    </div>
  )
}
