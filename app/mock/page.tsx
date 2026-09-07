import type { Metadata } from 'next'
import Link from 'next/link'
import { MockHistory } from '@/components/MockRunner'

export const metadata: Metadata = {
  title: 'Mock | AI Engineer Practice Guide',
}

/**
 * Timed mock mode (spec 6.8).
 *
 * Everything else in this guide is untimed, and that is a gap rather than a
 * kindness: solving a problem with unlimited time is a different skill from
 * solving it in 25 minutes while narrating your reasoning to a stranger. The
 * three drills below rehearse the constraint itself.
 *
 * The three cards are server markup, so this page is a usable index of the
 * mode with JavaScript switched off. Only the history below them needs a
 * browser, because only a browser can read localStorage.
 */

const DRILLS = [
  {
    href: '/mock/coding',
    name: 'Coding',
    box: '25 minutes',
    what:
      'One random problem from a pattern you choose. The signal, the approach and the solution stay out of the DOM until the clock stops, and the communication script runs alongside so the talking gets rehearsed too.',
  },
  {
    href: '/mock/design',
    name: 'System design',
    box: '45 or 60 minutes',
    what:
      'One random question, with the question’s own phase budget ticking beside the session clock. You see which phase you should be in and how long is left in it, because design rounds are lost by spending twenty minutes on requirements.',
  },
  {
    href: '/mock/behavioural',
    name: 'Behavioural',
    box: '2 minutes',
    what:
      'One random question and two minutes to answer it out loud. The probes a real interviewer follows up with — which is where the round is actually decided — appear when you stop.',
  },
]

export default function MockPage() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1>Mock</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Interviews are timed and nothing else here is. Pick a drill, take the question you are
          given, and work it under the clock. Time running out is information, not a punishment:
          nothing is submitted, cleared or locked when the box empties, and the pauses you took are
          recorded so a 25-minute session with three breaks is never filed as a clean 25 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {DRILLS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            data-drill={d.name}
            className="panel card flex min-w-0 flex-col gap-2 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2>{d.name}</h2>
              <span className="readout shrink-0 text-[var(--accent)]">{d.box}</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{d.what}</p>
          </Link>
        ))}
      </div>

      <MockHistory />
    </div>
  )
}
