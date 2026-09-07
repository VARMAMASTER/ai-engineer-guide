'use client'

import Link from 'next/link'
import { content } from '@/lib/content/index'
import Meter from './Meter'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'

/**
 * Route segment for a hardware topic: the id minus its `hwt-` prefix, so
 * `hwt-memory-hierarchy` serves at `/hardware/memory-hierarchy`.
 *
 * Not `slugOf` from `lib/content/ids` — that helper only strips the prefixes it
 * knows, and `hwt` is not one of them, so it would hand back the id unchanged
 * and every card would link to `/hardware/hwt-memory-hierarchy`. Same local
 * rule the `/lld` and `/companies` sections use.
 */
export function hwSlug(id: string): string {
  return id.replace(/^hwt-/, '')
}

/**
 * The GPU/hardware landing page: seven topic cards in study order, each linking
 * to its question set. Completion counts read from the progress store, so this
 * is a client component — server markup always renders zero-done until
 * hydrated, which is why the heading below is plain static text.
 */
export default function HardwareIndex() {
  const hydrated = useHydrated()
  const completed = useProgress((s) => s.completed)
  const topics = [...content.hwTopics].sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>GPU / Hardware</h1>
        <p className="text-sm text-[var(--text-muted)]">
          The layer underneath LLM serving design. Every answer here should land a real number.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {topics.map((topic) => {
          const questions = content.hwQuestions.filter((q) => q.topicId === topic.id)
          const done = hydrated ? questions.filter((q) => completed[q.id]).length : 0

          return (
            <Link
              key={topic.id}
              href={`/hardware/${hwSlug(topic.id)}`}
              className="panel card flex min-w-0 flex-col gap-3 p-4"
            >
              <h2>{topic.name}</h2>
              <p className="text-sm text-[var(--text-muted)]">{topic.summary}</p>
              <Meter label="Questions" done={done} target={questions.length} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
