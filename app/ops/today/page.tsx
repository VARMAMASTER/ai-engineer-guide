import type { Metadata } from 'next'
import OpsShell from '../OpsShell'
import TodayNext from './TodayNext'

export const metadata: Metadata = {
  title: 'Ops — Today / Next | Unyfide',
}

export default function OpsTodayPage() {
  return (
    <OpsShell current="/ops/today">
      <TodayNext />
    </OpsShell>
  )
}
