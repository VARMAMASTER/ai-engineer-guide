'use client'

import Link from 'next/link'
import Meter from './Meter'
import { content } from '@/lib/content/index'
import type { LldPattern, LldQuestion } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'

/**
 * Slug for an LLD id: `lldp-solid` and `lldq-parking-lot` both become the tail.
 *
 * This deliberately does not live in `lib/content/ids.ts`. Both banks share a
 * single `/lld/[slug]` segment, so the prefix is not part of the URL and the
 * two ids are guaranteed distinct by content validation — `slugOf` would work
 * identically once the prefixes are registered there, and this stays correct
 * either way.
 */
export function lldSlug(id: string): string {
  return id.replace(/^lld[pq]-/, '')
}

/** Problems whose `patterns` list names this pattern. */
function problemsFor(pattern: LldPattern): LldQuestion[] {
  return content.lldQuestions.filter((q) => q.patterns.includes(pattern.id))
}

interface PatternCardProps {
  pattern: LldPattern
  completed: Record<string, string>
  hydrated: boolean
}

function PatternCard({ pattern, completed, hydrated }: PatternCardProps) {
  const problems = problemsFor(pattern)
  const done = hydrated ? problems.filter((q) => Boolean(completed[q.id])).length : 0

  return (
    <li>
      <Link href={`/lld/${lldSlug(pattern.id)}`} className="panel card flex min-w-0 flex-col gap-3 p-4">
        <h3 className="min-w-0 text-base font-semibold">{pattern.name}</h3>
        <p className="line-clamp-2 min-w-0 text-sm text-[var(--text-muted)]">{pattern.solves}</p>
        <Meter label="Problems" done={done} target={problems.length} />
      </Link>
    </li>
  )
}

interface ProblemCardProps {
  question: LldQuestion
  completed: Record<string, string>
  hydrated: boolean
}

function ProblemCard({ question, completed, hydrated }: ProblemCardProps) {
  const done = hydrated && Boolean(completed[question.id])

  return (
    <li>
      <Link
        href={`/lld/${lldSlug(question.id)}`}
        className="panel card flex min-w-0 flex-col gap-2 p-4"
        data-completed={done ? 'true' : 'false'}
      >
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <h3 className="min-w-0 text-base font-semibold">{question.name}</h3>
          <span
            className="readout shrink-0"
            style={{ color: done ? 'var(--positive)' : 'var(--text-faint)' }}
          >
            {done ? 'done' : `${question.minutes}m`}
          </span>
        </div>
        <p className="line-clamp-2 min-w-0 text-sm text-[var(--text-muted)]">{question.statement}</p>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {question.companies.map((c) => (
            <span
              key={c}
              className="readout rounded-full bg-[var(--track)] px-2 py-0.5 text-[var(--text-muted)] capitalize"
            >
              {c}
            </span>
          ))}
        </div>
      </Link>
    </li>
  )
}

/**
 * The low-level design landing page: eight pattern cards, then the twenty-five
 * machine coding problems.
 *
 * The store is read once at the top rather than inside each of the 33 cards —
 * the same shape `SdIndex` settled on, for the same reason.
 */
export default function LldIndex() {
  const hydrated = useHydrated()
  const completed = useProgress((s) => s.completed)

  const patterns = [...content.lldPatterns].sort((a, b) => a.order - b.order)
  const problems = content.lldQuestions
  const solved = hydrated ? problems.filter((q) => Boolean(completed[q.id])).length : 0

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow">Low-level design</p>
        <h1 className="mt-1">Low-Level Design</h1>
        <p className="mt-2 max-w-[60ch] text-sm text-[var(--text-muted)]">
          A machine coding round is lost in the first five minutes, not the last five. Read the
          statement, ask the clarifying questions, name the entities — then write code.
        </p>
      </div>

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          Patterns
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {patterns.map((p) => (
            <PatternCard key={p.id} pattern={p} completed={completed} hydrated={hydrated} />
          ))}
        </ul>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Machine coding problems
          </h2>
          <div className="max-w-sm">
            <Meter label="Solved" done={solved} target={problems.length} />
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {problems.map((q) => (
            <ProblemCard key={q.id} question={q} completed={completed} hydrated={hydrated} />
          ))}
        </ul>
      </section>
    </div>
  )
}
