'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Meter from './Meter'
import { content } from '@/lib/content/index'
import { slugOf } from '@/lib/content/ids'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import type { DsaProblem } from '@/lib/content/schema'

type Filter = 'all' | 'core' | 'google' | 'meta' | 'amazon'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'core', label: 'Core (Blind 75)' },
  { id: 'google', label: 'Google' },
  { id: 'meta', label: 'Meta' },
  { id: 'amazon', label: 'Amazon' },
]

function matchesFilter(problem: DsaProblem, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'core') return problem.core
  return problem.companies.includes(filter)
}

/**
 * The DSA landing page: 18 pattern cards, a company/core filter, and a
 * summary line carrying the filtered total — the per-card counts alone can
 * never answer "how many core problems are there", so the total is spelled
 * out once, above the grid.
 */
export default function DsaIndex() {
  const [filter, setFilter] = useState<Filter>('all')
  const hydrated = useHydrated()
  const completed = useProgress((s) => s.completed)

  const patterns = useMemo(
    () => [...content.dsaPatterns].sort((a, b) => a.order - b.order),
    [],
  )

  const filteredTotal = useMemo(
    () => content.dsaProblems.filter((p) => matchesFilter(p, filter)).length,
    [filter],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>DSA Patterns</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          NeetCode 150, grouped into 18 patterns. Work through the core set first, then layer in
          the company-tagged problems.
        </p>
      </div>

      <p className="surface-solid p-4 text-sm text-[var(--text-muted)]">
        Company emphasis: Meta is about 40 percent arrays and strings, with heavy two pointers and
        sliding window and little DP. Google is about 35 percent graphs, with the most hards and
        frequent DP and topological sort. Amazon is about 30 percent trees, with BFS shortest
        path, intervals, and LRU cache, mostly mediums.
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter problems">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className="flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors"
            style={{
              borderColor: filter === f.id ? 'var(--accent-line)' : 'var(--panel-border)',
              backgroundColor: filter === f.id ? 'var(--accent-soft)' : 'transparent',
              color: filter === f.id ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="readout text-sm text-[var(--text)]">
        {filteredTotal} problems
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {patterns.map((pattern) => {
          const patternProblems = content.dsaProblems.filter((p) => p.patternId === pattern.id)
          const shown = patternProblems.filter((p) => matchesFilter(p, filter))
          const coreCount = patternProblems.filter((p) => p.core).length
          const done = hydrated
            ? shown.filter((p) => Boolean(completed[p.id])).length
            : 0

          return (
            <Link
              key={pattern.id}
              href={`/dsa/${slugOf(pattern.id)}`}
              className="panel card flex min-w-0 flex-col gap-3 p-4"
            >
              <h2>{pattern.name}</h2>
              <p className="text-sm text-[var(--text-muted)]">
                <span className="readout text-[var(--text)]">{shown.length}</span> problems ·{' '}
                <span className="readout text-[var(--text)]">{coreCount}</span> core
              </p>
              <Meter label="Completed" done={done} target={shown.length} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
