import type { Metadata } from 'next'
import AppPlaceholder from '@/components/AppPlaceholder'

export const metadata: Metadata = {
  title: 'Diet | AI Engineer Practice Guide',
}

export default function DietPage() {
  return (
    <AppPlaceholder
      title="Diet"
      summary="What you eat, tracked with the same daily rhythm as the study plan."
      planned={[
        'A daily intake log that rolls up into the same streak the program already counts.',
        'Targets for calories and protein, shown as the meters used everywhere else.',
        'A short list of repeatable meals, so logging is a tap rather than a form.',
      ]}
    />
  )
}
