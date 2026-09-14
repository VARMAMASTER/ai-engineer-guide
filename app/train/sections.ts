/**
 * The sections inside the Train app.
 *
 * They are NOT in `lib/nav.ts`. The nav model's section list drives the phone
 * strip and the desktop rail for an app, and Train's sections are all behind a
 * session (`/train` itself is the public landing — see `lib/auth/routes.ts`).
 * Putting them in the global model would put three links that bounce to
 * sign-in into the chrome of a signed-out visitor's screen, and would add three
 * gated URLs to `NAV_DESTINATIONS`, which the route sweep walks signed out.
 *
 * So the strip lives inside the app, rendered by `app/train/layout.tsx` on the
 * section pages only. Same `Tabs` primitive, same roving tabindex, same
 * `aria-current` — just scoped to the app that owns it.
 */
export interface TrainSection {
  href: string
  label: string
  /** One line for the landing page's shortcut card. */
  blurb: string
}

export const TRAIN_SECTIONS: TrainSection[] = [
  {
    href: '/train/session',
    label: 'Session',
    blurb: 'What is due today, what to lift, and somewhere to put each set as you finish it.',
  },
  {
    href: '/train/plan',
    label: 'Plan',
    blurb: 'Build or rebuild the week from your goal, your days, your equipment and your injuries.',
  },
  {
    href: '/train/history',
    label: 'Progress',
    blurb: 'Weekly sets per muscle group, tonnage, streak against the plan, and personal bests.',
  },
]
