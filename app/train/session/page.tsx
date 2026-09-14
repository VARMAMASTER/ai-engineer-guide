import type { Metadata } from 'next'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import { requireUser } from '@/lib/auth/user'
import { todayIso } from '@/lib/date'
import { loadTrainState } from '../state'
import SessionBoard from './SessionBoard'

export const metadata: Metadata = {
  title: "Today's session | Train | Unyfide",
}

/**
 * The surface that matters: what is due, what to lift, and somewhere to put
 * each set as you finish it.
 *
 * Server-rendered down to the logged sets, so the page is READ before any
 * JavaScript arrives — a gym is the worst network in anyone's week, and a
 * spinner between sets is the thing that gets a tracker deleted.
 */
export default async function TrainSessionPage() {
  const user = await requireUser('/train/session')
  const { state, error } = await loadTrainState()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Train</p>
        <h1>Today&rsquo;s session</h1>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {state.plan ? (
        <SessionBoard
          userId={user.id}
          plan={state.plan}
          profile={state.profile}
          initialSessions={state.sessions}
          initialSetIds={state.setIds}
          dayLabels={state.dayLabels}
          serverToday={todayIso()}
        />
      ) : (
        <div className="panel p-4">
          <EmptyState
            title="No plan yet."
            description="A session is a day of a plan. Answer four questions and there will be one to do."
            action={
              <Link href="/train/plan" className="chip" data-testid="train-no-plan-cta">
                Build a plan
              </Link>
            }
          />
        </div>
      )}
    </div>
  )
}
