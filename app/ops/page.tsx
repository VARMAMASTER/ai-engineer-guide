import type { Metadata } from 'next'
import AppPlaceholder from '@/components/AppPlaceholder'

export const metadata: Metadata = {
  title: 'Ops | AI Engineer Practice Guide',
}

export default function OpsPage() {
  return (
    <AppPlaceholder
      title="Ops"
      summary="Everything the other four apps assume someone is keeping track of."
      planned={[
        'The running list of things that have to happen but belong to no single app.',
        'Recurring admin, surfaced on the day it is due rather than remembered.',
        'One cross-app readout: what got done this week, across study, diet and training.',
      ]}
    />
  )
}
