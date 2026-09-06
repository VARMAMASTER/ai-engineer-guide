'use client'

import Link from 'next/link'
import Meter from './Meter'
import { content } from '@/lib/content/index'
import { slugOf } from '@/lib/content/ids'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'

const MILESTONES_PER_PROJECT = 4

/**
 * The projects landing page grid: six project cards in month order, each with
 * its milestone meter. The store is read once here, not per card.
 */
export default function ProjectIndex() {
  const hydrated = useHydrated()
  const completed = useProgress((s) => s.completed)
  const projects = [...content.projects].sort((a, b) => a.month - b.month)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {projects.map((p) => {
        const milestones = content.milestones.filter((m) => m.projectId === p.id)
        const done = hydrated ? milestones.filter((m) => completed[m.id]).length : 0

        return (
          <Link
            key={p.id}
            href={`/projects/${slugOf(p.id)}`}
            className="panel card flex min-w-0 flex-col gap-3 p-4"
          >
            <span className="eyebrow">Month {p.month}</span>
            <h2>{p.name}</h2>
            <p className="line-clamp-3 text-sm text-[var(--text-muted)]">{p.goal}</p>
            <Meter label="Milestones" done={done} target={MILESTONES_PER_PROJECT} />
          </Link>
        )
      })}
    </div>
  )
}
