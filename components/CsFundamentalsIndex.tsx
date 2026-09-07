'use client'

import Link from 'next/link'
import { content } from '@/lib/content/index'
import { slugOf } from '@/lib/content/ids'
import Meter from './Meter'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'

/**
 * The CS fundamentals landing page: five topic cards in study order, each
 * linking to its question set.
 *
 * Same shape as the AI/ML index on purpose — this is a sibling section, not a
 * new pattern. Completion counts read from the progress store, so this is a
 * client component; server markup always renders zero-done until hydrated.
 */
export default function CsFundamentalsIndex() {
  const hydrated = useHydrated()
  const completed = useProgress((s) => s.completed)
  const topics = [...content.csTopics].sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>CS Fundamentals</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Amazon runs this as its own gated round; Meta screens the same ground on the Production
          Engineer track. Answer each question out loud before you reveal it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {topics.map((topic) => {
          const questions = content.csQuestions.filter((q) => q.topicId === topic.id)
          const done = hydrated ? questions.filter((q) => completed[q.id]).length : 0

          return (
            <Link
              key={topic.id}
              href={`/cs-fundamentals/${slugOf(topic.id)}`}
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
