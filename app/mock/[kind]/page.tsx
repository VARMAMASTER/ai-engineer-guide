import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import MockRunner from '@/components/MockRunner'
import type { MockKind } from '@/lib/progress/mock'

/**
 * One drill (spec 6.8).
 *
 * The heading and the standing rules are server markup — the page says what
 * the drill is and how it behaves before a line of script runs. The runner
 * below is the only client code on the route, because a clock, a random draw
 * and a reveal all need a browser.
 *
 * `MockKind` arrives as a type-only import, which is erased. The runtime list
 * of kinds is declared here rather than pulled from `lib/progress/mock`,
 * because that module is `'use client'` and every value it exports becomes a
 * client reference the moment a server component reads it. `tests/unit/mock`
 * asserts this list and the store's own agree, so the two cannot drift.
 */

interface Copy {
  h1: string
  title: string
  lede: string
}

const COPY: Record<MockKind, Copy> = {
  coding: {
    h1: 'Coding drill',
    title: 'Coding drill | Mock | AI Engineer Practice Guide',
    lede:
      'One random problem from a pattern you pick, twenty-five minutes on the clock, and the communication script running beside it. The signal, the approach, the complexity and the solution are not on this page while the clock runs — they are added to the DOM when you end the drill.',
  },
  design: {
    h1: 'System design drill',
    title: 'System design drill | Mock | AI Engineer Practice Guide',
    lede:
      'One random question at its own length, with the question’s phase budget ticking beside the session clock. Candidates lose design rounds by spending twenty minutes on requirements and four on the architecture, so the number that matters here is the one on the phase, not the one on the round.',
  },
  behavioural: {
    h1: 'Behavioural drill',
    title: 'Behavioural drill | Mock | AI Engineer Practice Guide',
    lede:
      'One random question and two minutes to answer it out loud, standing up, without notes. The probes that follow — the follow-ups where the round is actually decided — and the traps specific to the question appear once you stop.',
  },
}

const KINDS: MockKind[] = ['coding', 'design', 'behavioural']

function asKind(value: string): MockKind | null {
  return (KINDS as string[]).includes(value) ? (value as MockKind) : null
}

export function generateStaticParams() {
  return KINDS.map((kind) => ({ kind }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>
}): Promise<Metadata> {
  const { kind } = await params
  const resolved = asKind(kind)
  return resolved ? { title: COPY[resolved].title } : {}
}

export default async function MockKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  const resolved = asKind(kind)
  if (!resolved) notFound()
  const copy = COPY[resolved]

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-2">
        <Link href="/mock" className="eyebrow w-fit hover:text-[var(--accent)]">
          Mock
        </Link>
        <h1>{copy.h1}</h1>
        <p className="text-sm text-[var(--text-muted)]">{copy.lede}</p>
        <p className="text-sm text-[var(--text-muted)]">
          The clock is a wall clock: switch tabs, close the laptop or reload the page and it comes
          back with the true elapsed time. Pausing is allowed and is counted against the session.
          Nothing is submitted or destroyed when the box runs out.
        </p>
      </div>

      <MockRunner kind={resolved} />
    </div>
  )
}
