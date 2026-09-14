import type { Metadata } from 'next'

/**
 * The gallery page itself is a client component — every exhibit has live state
 * — and a client component cannot export `metadata`. This layout exists only
 * to give the route a title of its own, the way every other route in the app
 * has one.
 */
export const metadata: Metadata = {
  title: 'Component kit | Unyfide',
  description: 'Every UI primitive the guide is built from, in the states that matter.',
}

export default function KitLayout({ children }: { children: React.ReactNode }) {
  return children
}
