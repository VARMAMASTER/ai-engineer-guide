import type { Metadata } from 'next'
import OpsShell from '../OpsShell'
import RemindersSection from './RemindersSection'

export const metadata: Metadata = {
  title: 'Ops — Reminders | Unyfide',
}

export default function OpsRemindersPage() {
  return (
    <OpsShell current="/ops/reminders">
      <RemindersSection />
    </OpsShell>
  )
}
