/**
 * Navigation, in two levels.
 *
 * Level one is APPS. Five of them, permanently: Today, Learn, Diet, Train, Ops.
 * They are the bottom tab bar on a phone and the top of the rail on a desktop,
 * and the set does not change — a tab bar whose contents move under your thumb
 * is not a tab bar. Level two is SECTIONS, which live inside one app and are
 * shown as a horizontal strip at the top of it.
 *
 * The grouping is PRESENTATIONAL ONLY. Every section keeps the URL it has
 * always had: `/dsa` is `/dsa`, not `/learn/dsa`. Nothing under `app/` moved,
 * so bookmarks, the service worker's cached pages and the whole e2e suite keep
 * working. `appFor()` is what makes the Learn tab light up on `/dsa` without a
 * `/learn` prefix existing anywhere.
 */

export interface NavItem {
  href: string
  label: string
  /** Compact label for tight cells. Ten characters or fewer. */
  short: string
}

export interface NavApp {
  /** Icon key and test handle. Not a route. */
  id: string
  /** Where the tab lands. For an app with sections, its first section. */
  href: string
  label: string
  /** Tab-bar label: five cells have to fit 390px. */
  short: string
  /** The sections inside this app, in strip order. May be empty. */
  sections: NavItem[]
}

/**
 * The study sections, in the order they were in the old flat rail — with
 * Courses added after Roadmap, where reading material belongs: it is the
 * long-form half of Learn, not a fifth app, and it shares Learn's progress.
 * Today is not one of them — it is its own app — and neither is Settings,
 * which hangs off the top bar rather than belonging to any app.
 */
export const LEARN_SECTIONS: NavItem[] = [
  { href: '/roadmap', label: 'Roadmap', short: 'Roadmap' },
  { href: '/courses', label: 'Courses', short: 'Courses' },
  { href: '/dsa', label: 'DSA', short: 'DSA' },
  { href: '/system-design', label: 'System Design', short: 'Design' },
  { href: '/lld', label: 'Low-Level Design', short: 'LLD' },
  { href: '/ai-ml', label: 'AI / ML', short: 'AI/ML' },
  { href: '/projects', label: 'Projects', short: 'Build' },
  { href: '/reading', label: 'Reading', short: 'Reading' },
  { href: '/feed', label: 'AI Feed', short: 'Feed' },
  { href: '/cs-fundamentals', label: 'CS Fundamentals', short: 'CS' },
  { href: '/hardware', label: 'GPU / Hardware', short: 'Hardware' },
  { href: '/behavioural', label: 'Behavioural', short: 'Stories' },
  { href: '/companies', label: 'Companies', short: 'Loops' },
  { href: '/mock', label: 'Mock', short: 'Mock' },
  { href: '/revise', label: 'Revise', short: 'Revise' },
]

/** Off the top bar, deliberately: it belongs to the whole system, not one app. */
export const SETTINGS_ITEM: NavItem = {
  href: '/settings',
  label: 'Settings',
  short: 'Settings',
}

export const NAV_APPS: NavApp[] = [
  { id: 'today', href: '/today', label: 'Today', short: 'Today', sections: [] },
  { id: 'learn', href: '/roadmap', label: 'Learn', short: 'Learn', sections: LEARN_SECTIONS },
  { id: 'diet', href: '/diet', label: 'Diet', short: 'Diet', sections: [] },
  { id: 'train', href: '/train', label: 'Train', short: 'Train', sections: [] },
  { id: 'ops', href: '/ops', label: 'Ops', short: 'Ops', sections: [] },
]

/**
 * Every URL the nav can reach, deduped and in nav order.
 *
 * Derived, never written out: the route sweep checks each of these has a page,
 * so a tab that leads nowhere fails the build rather than shipping a 404.
 */
export const NAV_DESTINATIONS: string[] = Array.from(
  new Set([
    ...NAV_APPS.flatMap((app) => [app.href, ...app.sections.map((s) => s.href)]),
    SETTINGS_ITEM.href,
  ]),
)

/** True when `href` is the section that owns `pathname` (including its children). */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** True when `pathname` is anywhere inside `app` — its landing page or any section. */
export function isAppActive(pathname: string, app: NavApp): boolean {
  if (isActive(pathname, app.href)) return true
  return app.sections.some((section) => isActive(pathname, section.href))
}

/** The app that owns `pathname`, or undefined for a route outside the tab bar. */
export function appFor(pathname: string): NavApp | undefined {
  return NAV_APPS.find((app) => isAppActive(pathname, app))
}

/** The section within `app` that owns `pathname`, if any. */
export function sectionFor(pathname: string, app: NavApp): NavItem | undefined {
  return app.sections.find((section) => isActive(pathname, section.href))
}

/** One step of a trail: enough to link to it, nothing that names the leaf. */
export interface Crumb {
  href: string
  label: string
}

/**
 * The ancestors of `pathname`, outermost first — never the page itself.
 *
 * `/dsa/arrays-hashing` is the Learn app and the DSA section: `[Learn, DSA]`.
 * `/dsa` is the DSA section's own landing page, so DSA is the leaf, not an
 * ancestor of itself: just `[Learn]`. An app's own landing page (`/today`,
 * `/roadmap`) has nothing above it, so it gets `[]`, and so does any route
 * `appFor` cannot place — Settings, `/kit`, `/offline`, a 404.
 *
 * This is deliberately the full ancestor chain, not a "should this render"
 * verdict — `trailFor('/dsa')` is `[Learn]` even though a page at `/dsa`
 * itself has nowhere to put it (the section strip already says where it is).
 * That decision belongs to whoever renders the trail, using `NAV_DESTINATIONS`
 * to tell a section/app root from a page one level deeper than the nav model
 * knows about — see `components/Breadcrumb.tsx`.
 */
export function trailFor(pathname: string): Crumb[] {
  const app = appFor(pathname)
  if (!app || pathname === app.href) return []

  const trail: Crumb[] = [{ href: app.href, label: app.label }]
  const section = sectionFor(pathname, app)
  if (section && pathname !== section.href) {
    trail.push({ href: section.href, label: section.label })
  }
  return trail
}
