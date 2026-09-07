/**
 * The eight sections of the guide, in rail order.
 *
 * `primary` marks the five that get a permanent slot in the mobile tab bar.
 * The other three live behind the More sheet. `short` is the tab-bar label and
 * is kept to ten characters or fewer so six cells fit a 390px viewport.
 */
export interface NavItem {
  href: string
  label: string
  short: string
  primary: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/today', label: 'Today', short: 'Today', primary: true },
  { href: '/roadmap', label: 'Roadmap', short: 'Roadmap', primary: true },
  { href: '/dsa', label: 'DSA', short: 'DSA', primary: true },
  { href: '/system-design', label: 'System Design', short: 'Design', primary: true },
  { href: '/projects', label: 'Projects', short: 'Build', primary: true },
  { href: '/lld', label: 'Low-Level Design', short: 'LLD', primary: false },
  { href: '/ai-ml', label: 'AI / ML', short: 'AI/ML', primary: false },
  { href: '/reading', label: 'Reading', short: 'Reading', primary: false },
  { href: '/feed', label: 'AI Feed', short: 'Feed', primary: false },
  { href: '/cs-fundamentals', label: 'CS Fundamentals', short: 'CS', primary: false },
  { href: '/hardware', label: 'GPU / Hardware', short: 'Hardware', primary: false },
  { href: '/behavioural', label: 'Behavioural', short: 'Stories', primary: false },
  { href: '/companies', label: 'Companies', short: 'Loops', primary: false },
  { href: '/mock', label: 'Mock', short: 'Mock', primary: false },
  { href: '/revise', label: 'Revise', short: 'Revise', primary: false },
  { href: '/settings', label: 'Settings', short: 'Settings', primary: false },
]

export const PRIMARY_NAV_ITEMS = NAV_ITEMS.filter((i) => i.primary)
export const SECONDARY_NAV_ITEMS = NAV_ITEMS.filter((i) => !i.primary)

/** True when `href` is the section that owns `pathname` (including its children). */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
