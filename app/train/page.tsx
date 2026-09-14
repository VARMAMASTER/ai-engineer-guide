import type { Metadata } from 'next'
import AppPlaceholder from '@/components/AppPlaceholder'

export const metadata: Metadata = {
  title: 'Train | AI Engineer Practice Guide',
}

export default function TrainPage() {
  return (
    <AppPlaceholder
      title="Train"
      summary="The training side of the same 180 days: sessions, sets and what they add up to."
      planned={[
        'A week template of sessions, sitting beside the study plan rather than competing with it.',
        'Per-session logging of sets, reps and load, stored locally like everything else.',
        'Volume and consistency read back over the program, not over a calendar month.',
      ]}
    />
  )
}
