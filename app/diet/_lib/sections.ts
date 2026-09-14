/**
 * Diet's four sections, in strip order.
 *
 * In its own module rather than next to the strip that renders them, because
 * the landing page (a server component) and `DietSections` (a client one) both
 * need the list: importing it from the client module would drag the strip, and
 * `Tabs` with it, into the bundle of a page that renders neither.
 *
 * Not in `lib/nav.ts`. That file is shared with the two apps being built
 * alongside this one, and Diet declaring its sections there would be three
 * agents editing one array — see `app/diet/_components/DietSections.tsx` for
 * how the strip is rendered instead.
 */
export interface DietSection {
  href: string
  label: string
}

export const DIET_SECTIONS: DietSection[] = [
  { href: '/diet/log', label: 'Log' },
  { href: '/diet/weight', label: 'Weight' },
  { href: '/diet/trends', label: 'Trends' },
  { href: '/diet/setup', label: 'Setup' },
]
