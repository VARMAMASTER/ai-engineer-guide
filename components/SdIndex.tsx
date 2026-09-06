'use client'

import Link from 'next/link'
import { content } from '@/lib/content/index'
import { slugOf } from '@/lib/content/ids'
import type { SdPattern } from '@/lib/content/schema'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'

function PatternCard({ pattern }: { pattern: SdPattern }) {
  const hydrated = useHydrated()
  const completed = useProgress((s) => s.completed)
  const questions = content.sdQuestions.filter((q) => q.patternId === pattern.id)
  const done = hydrated ? questions.filter((q) => completed[q.id]).length : 0
  const total = questions.length

  return (
    <li>
      <Link
        href={`/system-design/${slugOf(pattern.id)}`}
        className="card panel flex min-w-0 flex-col gap-3 rounded-[var(--radius)] p-4"
      >
        <span className="min-w-0 truncate text-sm font-medium">{pattern.name}</span>
        <span className="readout text-[var(--text-muted)]">
          {done}
          <span className="text-[var(--text-faint)]">/{total} questions</span>
        </span>
      </Link>
    </li>
  )
}

function PatternGroup({ title, patterns }: { title: string; patterns: SdPattern[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {patterns.map((p) => (
          <PatternCard key={p.id} pattern={p} />
        ))}
      </ul>
    </section>
  )
}

export default function SdIndex() {
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
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          System Design
        </h1>
      </div>
      <PatternGroup title="General" patterns={general} />
      <PatternGroup title="ML & LLM" patterns={ml} />
    </div>
  )
}
