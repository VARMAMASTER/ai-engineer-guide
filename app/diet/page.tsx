import type { Metadata } from 'next'
import Card from '@/components/ui/Card'
import SignedOutNote from './_components/SignedOutNote'
import { DIET_SECTIONS } from './_lib/sections'

export const metadata: Metadata = {
  title: 'Diet | Unyfide',
  description:
    'Log what you eat in a tap, weigh yourself without reading water weight as failure, and see what your body actually spends.',
}

/**
 * The Diet workspace.
 *
 * Public, and a plain server component with no client hooks, so the `h1` is in
 * the raw HTML — `tests/e2e/routes.spec.ts` asserts that for every route with
 * JavaScript switched off. Everything INSIDE Diet needs a session
 * (`lib/auth/routes.ts`), and this page holds no data of anybody's, so there is
 * nothing here to gate.
 *
 * Shortcut cards rather than an empty list or a bare form, per spec 4.1: a
 * landing page whose job is to get you to the thing you came for in one tap.
 */

const SHORTCUTS: { href: string; label: string; blurb: string }[] = [
  {
    href: '/diet/log',
    label: 'Log',
    blurb:
      'Today’s meals, and one tap to log something you eat all the time. Every entry keeps its own clock time.',
  },
  {
    href: '/diet/plan',
    label: 'Plan',
    blurb:
      'Your repeating week, with what it actually delivers — and whether it reaches your protein floor, which most plans quietly do not.',
  },
  {
    href: '/diet/weight',
    label: 'Weight',
    blurb:
      'Your readings and the trend through them, together. The trend is what every other number here is built from.',
  },
  {
    href: '/diet/trends',
    label: 'Trends',
    blurb:
      'Calories and protein against target, what you actually spend, and last month’s forecast graded against what happened.',
  },
  {
    href: '/diet/setup',
    label: 'Setup',
    blurb: 'Your targets, your eating window, and the food library that makes logging a tap.',
  },
  {
    href: '/food',
    label: 'Search any food',
    blurb:
      'The full nutrition database behind Diet’s food library — public, no account needed. See a dish’s recipe and why its numbers are what they are.',
  },
]

const RULES: { title: string; body: string }[] = [
  {
    title: 'A day you did not log is invisible, not zero',
    body:
      'Counting a missed day as nothing eaten drags every average down, makes a deficit look bigger than it is, and forecasts weight loss that will not arrive. Unlogged days are left out of the maths and shown as gaps.',
  },
  {
    title: 'A meal outside your window is marked, never blocked',
    body:
      'The mark is a fact, not a judgement, and a late meal that stays inside your calorie target is not a failure. Window adherence and calorie adherence are two separate numbers here, for that reason.',
  },
  {
    title: 'A range when the data is thin, and it says so',
    body:
      'Under two weeks of logging you get the population formula and are told it is the formula. Under 70% of days logged you get a range and a warning rather than a confident number that happens to be wrong.',
  },
]

export default function DietPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="eyebrow">Diet</p>
        <h1>Diet</h1>
        <p className="max-w-2xl text-sm text-[var(--text-muted)]">
          Food logging dies at friction, not features — and people eat twenty or thirty things on
          repeat. So this is built around your own library and re-logging what you already ate;
          searching a packaged-food database is the fallback, not the path.
        </p>
        <SignedOutNote />
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="diet-shortcuts">
        <h2 id="diet-shortcuts" className="eyebrow">
          Go to
        </h2>
        {/* Five of these six lead behind a session, where prefetch chases the
            proxy's redirect to sign-in; the sixth (the food database) is
            public and never redirects. Both still get suppressed, because the
            failure mode is broader than the redirect case alone: ANY in-flight
            prefetch that has not settled by the time a visitor (or the route
            sweep) navigates away shows up as an aborted request, gated or not.
            None of these six benefit from an eager fetch a reader will not act
            on for several seconds regardless — they are reading the blurb
            first, not racing a prefetch. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SHORTCUTS.map((shortcut) => (
            <Card
              key={shortcut.href}
              href={shortcut.href}
              prefetch={false}
              className="flex flex-col gap-1.5 p-4"
            >
              <span className="font-medium text-[var(--text)]">{shortcut.label}</span>
              <span className="text-sm text-[var(--text-muted)]">{shortcut.blurb}</span>
            </Card>
          ))}
        </div>
        {/* Derived from the same list the section strip renders, so a section
            can never exist in one and not the other. */}
        <p className="sr-only">
          Diet has {DIET_SECTIONS.length} sections: {DIET_SECTIONS.map((s) => s.label).join(', ')}.
        </p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="diet-rules">
        <h2 id="diet-rules" className="eyebrow">
          What this will not do
        </h2>
        <div className="panel flex flex-col gap-4 p-4">
          {RULES.map((rule) => (
            <div key={rule.title} className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[var(--text)]">{rule.title}</p>
              <p className="text-sm text-[var(--text-muted)]">{rule.body}</p>
            </div>
          ))}
          <p className="text-sm text-[var(--text-muted)]">
            It also draws no conclusions about cause. With one person and a few weeks of data,
            “you lose weight on days you eat before 14:00” is noise, and a health app that reports
            noise as insight does real harm.
          </p>
        </div>
      </section>
    </div>
  )
}
