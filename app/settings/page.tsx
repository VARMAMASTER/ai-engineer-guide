import type { Metadata } from 'next'
import Settings from '@/components/Settings'

export const metadata: Metadata = {
  title: 'Settings | AI Engineer Practice Guide',
}

export default function SettingsPage() {
  return <Settings />
}
