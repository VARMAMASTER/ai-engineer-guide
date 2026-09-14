import type { Metadata } from 'next'
import OpsShell from '../OpsShell'
import GoalsSection from './GoalsSection'

export const metadata: Metadata = {
  title: 'Ops — Goals | Unyfide',
}

export default function OpsGoalsPage() {
  return (
    <OpsShell current="/ops/goals">
      <GoalsSection />
    </OpsShell>
  )
}
