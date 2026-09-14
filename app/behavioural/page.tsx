import type { Metadata } from 'next'
import BehaviouralIndex from '@/components/BehaviouralIndex'

export const metadata: Metadata = {
  title: 'Behavioural | Unyfide',
}

export default function BehaviouralPage() {
  return <BehaviouralIndex />
}
