'use client'

import Link from 'next/link'
import Meter from './Meter'
import { content } from '@/lib/content/index'
import { slugOf } from '@/lib/content/ids'
import type { SdPattern } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'

interface CardProps {
  pattern: SdPattern
  completed: Record<string, string>
  hydrated: boolean
}

function PatternCard({ pattern, completed, hydrated }: CardProps) {
  const questions = content.sdQuestions.filter((q) => q.patternId === pattern.id)
  const done = hydrated ? questions.filter((q) => completed[q.id]).length : 0

  return (
    <li>
      <Link
        href={`/system-design/${slugOf(pattern.id)}`}
        className="panel card flex min-w-0 flex-col gap-3 p-4"
      >
        <h2 className="min-w-0 truncate">{pattern.name}</h2>
        <Meter label="Questions" done={done} target={questions.length} />
      </Link>
    </li>
  )
}

interface GroupProps {
  title: string
  patterns: SdPattern[]
  completed: Record<string, string>
  hydrated: boolean
}

function PatternGroup({ title, patterns, completed, hydrated }: GroupProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {patterns.map((p) => (
          <PatternCard key={p.id} pattern={p} completed={completed} hydrated={hydrated} />
        ))}
      </ul>
    </section>
  )
}

/**
 * The system design landing page: twenty pattern cards in two groups.
 *
 * The progress store is read once here rather than per card — twenty cards
 * meant twenty store subscriptions for one shared slice of state.
 */
export default function SdIndex() {
  const hydrated = useHydrated()
  const completed = useProgress((s) => s.completed)

  const general = content.sdPatterns
    .filter((p) => p.group === 'general')
    .sort((a, b) => a.order - b.order)
  const ml = content.sdPatterns
    .filter((p) => p.group === 'ml')
    .sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow">System design</p>
        <h1 className="mt-1">System Design</h1>
      </div>
      <PatternGroup title="General" patterns={general} completed={completed} hydrated={hydrated} />
      <PatternGroup title="ML & LLM" patterns={ml} completed={completed} hydrated={hydrated} />
    </div>
  )
}
