/**
 * The sections inside the Ops app.
 *
 * Level two of the navigation, per spec section 4: apps are the permanent tab
 * bar, sections are the strip inside one app. Ops's sections are declared HERE
 * rather than in `lib/nav.ts` because the nav model's section list drives the
 * public route sweep, and every one of these is behind a session
 * (`lib/auth/routes.ts` protects everything under `/ops` except the landing
 * page itself). A protected URL in a sweep that runs signed out does not test
 * the page — it tests the redirect to sign-in, twice.
 *
 * `/ops` itself is not in the list: it is the app's own landing page, the strip
 * is what you see once you are inside, and a section that points back at the
 * page above it reads as a fifth peer rather than a way out. The breadcrumb and
 * the tab bar are both already routes home.
 */
export interface OpsSection {
  href: string
  label: string
  /** The one-line answer to "what is this section for", shown under its heading. */
  intro: string
}

export const OPS_SECTIONS: OpsSection[] = [
  {
    href: '/ops/today',
    label: 'Today / Next',
    intro: 'Everything open, hardest-first, with the reason it sits where it does.',
  },
  {
    href: '/ops/tasks',
    label: 'Tasks',
    intro: 'The whole list, and where a task — recurring or not — gets written.',
  },
  {
    href: '/ops/goals',
    label: 'Goals',
    intro: 'Progress, the pace it needs, and whether the pace you are on gets there.',
  },
  {
    href: '/ops/reminders',
    label: 'Reminders',
    intro: 'When to be told, and the devices that get told. Each reminder is sent once.',
  },
]

export function opsSection(href: string): OpsSection {
  const found = OPS_SECTIONS.find((section) => section.href === href)
  if (!found) throw new Error(`Unknown Ops section: ${href}`)
  return found
}
