import type { Metadata } from 'next'
import { todayIso } from '@/lib/date'
import WeightClient from '../../_components/WeightClient'
import { loadWeightPage } from '../../_data/queries'

export const metadata: Metadata = {
  title: 'Weight and trend | Unyfide',
}

/**
 * Weight, with the trend through it.
 *
 * This page reads its own narrower query rather than the whole Diet snapshot:
 * it needs every reading (the EWMA is over the entire history), the row id each
 * one can be deleted by, and the height for BMI — and none of the food log at
 * all.
 */
export default async function DietWeightPage() {
  const { user, rows, heightCm, error } = await loadWeightPage('/diet/weight')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="eyebrow">Diet</p>
        <h1>Weight</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Daily weight swings a kilo or two on water alone. Both the readings and the smoothed
          trend are here, and it is the trend every other number in Diet is computed from.
        </p>
      </header>

      <WeightClient
        userId={user.id}
        serverToday={todayIso()}
        initialRows={rows}
        heightCm={heightCm}
        loadError={error}
      />
    </div>
  )
}
