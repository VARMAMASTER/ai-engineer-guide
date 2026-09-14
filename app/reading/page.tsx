import type { Metadata } from 'next'
import ReadingTabs from '@/components/ReadingTabs'

export const metadata: Metadata = {
  title: 'Reading | Unyfide',
}

export default function ReadingPage() {
  return <ReadingTabs />
}
