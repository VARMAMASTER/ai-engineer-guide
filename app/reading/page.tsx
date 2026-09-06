import type { Metadata } from 'next'
import ReadingTabs from '@/components/ReadingTabs'

export const metadata: Metadata = {
  title: 'Reading | AI Engineer Practice Guide',
}

export default function ReadingPage() {
  return <ReadingTabs />
}
