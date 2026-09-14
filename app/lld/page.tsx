import type { Metadata } from 'next'
import LldIndex from '@/components/LldIndex'

export const metadata: Metadata = {
  title: 'Low-Level Design | Unyfide',
}

export default function LldPage() {
  return <LldIndex />
}
