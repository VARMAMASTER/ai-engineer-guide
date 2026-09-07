import type { Metadata } from 'next'
import LldIndex from '@/components/LldIndex'

export const metadata: Metadata = {
  title: 'Low-Level Design | AI Engineer Practice Guide',
}

export default function LldPage() {
  return <LldIndex />
}
