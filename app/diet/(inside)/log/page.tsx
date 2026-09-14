import type { Metadata } from 'next'
import { todayIso } from '@/lib/date'
import LogClient from '../../_components/LogClient'
import { loadDietSnapshot } from '../../_data/queries'

export const metadata: Metadata = {
  title: 'Food log | Unyfide',
}

/**
 * Today's food.
 *
 * The heading and the page frame are server-rendered so the `h1` is in the raw
 * HTML before any JavaScript runs — the bar `tests/e2e/routes.spec.ts` holds
 * every route to. The interactive half is a client component underneath,
 * because logging a meal has to be a tap and not a round trip.
 *
 * `todayIso()` here is the SERVER's calendar date, which for a user east or
 * west of the deployment is wrong for part of every day. It is passed as a
 * starting value only; `useLocalToday` corrects it to the browser's date on
 * mount, having first rendered exactly what the server did so there is no
 * hydration mismatch.
 */
export default async function DietLogPage() {
  const { user, snapshot, error } = await loadDietSnapshot('/diet/log')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="eyebrow">Diet</p>
        <h1>Food log</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Tap something you eat all the time, repeat yesterday, or type it in. Every entry keeps
          the meal&rsquo;s own clock time, which is what makes the eating window mean anything.
        </p>
      </header>

      <LogClient
        userId={user.id}
        serverToday={todayIso()}
        initialEntries={snapshot.entries}
        initialFoods={snapshot.foods}
        targets={snapshot.targets}
        window={snapshot.window}
        loadError={error}
      />
    </div>
  )
}
