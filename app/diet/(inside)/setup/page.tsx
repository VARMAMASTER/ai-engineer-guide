import type { Metadata } from 'next'
import SetupClient from '../../_components/SetupClient'
import { loadDietSetupPage } from '../../_data/queries'

export const metadata: Metadata = {
  title: 'Diet setup | Unyfide',
}

/**
 * The inputs every other Diet screen reads.
 *
 * None of it is required to start logging. A blank profile means the analytics
 * say "not enough to say"; a blank target means the log shows counts rather
 * than a score. Both are honest states, and an account that has never opened
 * this page still works.
 */
export default async function DietSetupPage() {
  const { user, profile, foods } = await loadDietSetupPage('/diet/setup')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="eyebrow">Diet</p>
        <h1>Setup</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Your targets, your eating window, and the library of things you actually eat. Leave
          anything blank and the app says what it cannot work out, rather than guessing.
        </p>
      </header>

      <SetupClient userId={user.id} profile={profile} foods={foods} />
    </div>
  )
}
