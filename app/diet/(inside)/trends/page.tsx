import type { Metadata } from 'next'
import { todayIso } from '@/lib/date'
import TrendsClient from '../../_components/TrendsClient'
import { loadDietSnapshot } from '../../_data/queries'

export const metadata: Metadata = {
  title: 'Diet trends | Unyfide',
}

/**
 * The analytics, all of which stay inside Diet (spec 4.2).
 *
 * Anything that relates food to training or to study is the agent's job and not
 * this page's — Diet does not read Train's tables and would fail the lint
 * boundary if it tried.
 */
export default async function DietTrendsPage() {
  const { user, snapshot, error } = await loadDietSnapshot('/diet/trends')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="eyebrow">Diet</p>
        <h1>Trends</h1>
        <p className="text-sm text-[var(--text-muted)]">
          What you ate, what you actually spend, and how the last forecast did against what the
          scale went on to say.
        </p>
      </header>

      <TrendsClient
        userId={user.id}
        serverToday={todayIso()}
        entries={snapshot.entries}
        weights={snapshot.weights}
        forecasts={snapshot.forecasts}
        profile={snapshot.profile}
        targets={snapshot.targets}
        window={snapshot.window}
        loadError={error}
      />
    </div>
  )
}
