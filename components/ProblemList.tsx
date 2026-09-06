'use client'

import Checkbox from './Checkbox'
import type { DsaProblem } from '@/lib/content/schema'

const DIFFICULTY_COLOR: Record<DsaProblem['difficulty'], string> = {
  easy: 'var(--positive)',
  medium: 'var(--warning)',
  hard: 'var(--danger)',
}

const COMPANY_LABEL: Record<string, string> = {
  google: 'Google',
  meta: 'Meta',
  amazon: 'Amazon',
}

/**
 * The problem rows for one pattern page. Below 768px each problem stacks as a
 * card: name and difficulty on the first line, tags/core badge/checkbox on
 * the second. At 768px and up it collapses into a single row. The outer
 * container carries `overflow-x-auto` so a long name never forces the page
 * itself to scroll horizontally.
 */
export default function ProblemList({ problems }: { problems: DsaProblem[] }) {
  return (
    <div className="overflow-x-auto">
      <ul className="flex min-w-0 flex-col gap-2">
        {problems.map((problem) => (
          <li
            key={problem.id}
            className="panel grid min-w-0 grid-cols-1 gap-2 p-3 md:grid-cols-[18rem_1fr_15rem] md:items-center md:gap-4"
          >
            <div className="flex min-w-0 items-baseline gap-2">
              <a
                href={problem.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate text-sm font-medium underline-offset-2 hover:underline"
              >
                {problem.name}
              </a>
              <span
                className="readout shrink-0 capitalize"
                style={{ color: DIFFICULTY_COLOR[problem.difficulty] }}
              >
                {problem.difficulty}
              </span>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
              {problem.companies.map((company) => (
                <span
                  key={company}
                  className="rounded-full border border-[var(--panel-border)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
                >
                  {COMPANY_LABEL[company] ?? company}
                </span>
              ))}
              {problem.core ? (
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
                  Core
                </span>
              ) : null}
            </div>

            <div className="min-w-0 md:justify-self-end">
              <Checkbox
                itemId={problem.id}
                label="Solved"
                meta={`LC ${problem.leetcodeNumber} · ${problem.minutes}m`}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
