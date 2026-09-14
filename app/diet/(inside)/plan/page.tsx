import type { Metadata } from 'next'
import { todayIso } from '@/lib/date'
import PlanClient from '../../_components/PlanClient'
import { loadDietSnapshot } from '../../_data/queries'

export const metadata: Metadata = {
  title: 'Weekly plan | Unyfide',
}

/**
 * The repeating week.
 *
 * A plain server component wrapping a client one, exactly like the other three
 * screens inside Diet: the `h1` is in the raw HTML before any JavaScript runs,
 * which `tests/e2e/routes.spec.ts` holds every route to, and everything that
 * has to feel like a tap is underneath.
 *
 * It reads the whole `loadDietSnapshot` rather than a narrow plan query,
 * because this screen needs four of the same arrays the rest of Diet does: the
 * plan, the food library it resolves against, the entries (to know which of
 * today's meals are already logged, and to measure expenditure) and the weight
 * trend the plan's predicted loss is graded against.
 */
export default async function DietPlanPage() {
  const { user, snapshot, error } = await loadDietSnapshot('/diet/plan')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="eyebrow">Diet</p>
        <h1>Weekly plan</h1>
        <p className="text-sm text-[var(--text-muted)]">
          One fixed week, logged in a tap instead of twelve entries a day. It also tells you what
          the plan actually delivers &mdash; including the part that misses, which is usually
          protein rather than calories.
        </p>
      </header>

      <PlanClient
        userId={user.id}
        serverToday={todayIso()}
        initialPlan={snapshot.plan}
        initialFoods={snapshot.foods}
        entries={snapshot.entries}
        weights={snapshot.weights}
        profile={snapshot.profile}
        targets={snapshot.targets}
        loadError={error}
      />
    </div>
  )
}
