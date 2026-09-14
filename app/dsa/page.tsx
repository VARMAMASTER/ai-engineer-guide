import type { Metadata } from 'next'
import DsaIndex from '@/components/DsaIndex'

export const metadata: Metadata = {
  title: 'DSA | Unyfide',
}

export default function DsaPage() {
  return <DsaIndex />
}
