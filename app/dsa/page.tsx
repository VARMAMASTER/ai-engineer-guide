import type { Metadata } from 'next'
import DsaIndex from '@/components/DsaIndex'

export const metadata: Metadata = {
  title: 'DSA | AI Engineer Practice Guide',
}

export default function DsaPage() {
  return <DsaIndex />
}
