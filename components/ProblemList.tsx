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
 * The problem rows for one pattern page. Below 768px each problem stacks: the
 * checkbox row (whose label is the problem name, so every checkbox on the page
 * has its own accessible name) on the first line, difficulty/tags/LeetCode link
 * on the second. At 768px and up it collapses into a single row. The outer
 * container carries `overflow-x-auto` so a long name never forces the page
 * itself to scroll horizontally.
 */
export default function ProblemList({ problems }: { problems: DsaProblem[] }) {
  return (
    <div className="overflow-x-auto">
      <ul className="flex min-w-0 flex-col gap-1.5">
        {problems.map((problem) => (
          <li
            key={problem.id}
            className="panel grid min-w-0 grid-cols-1 gap-1 px-3 py-1.5 md:grid-cols-[1fr_auto] md:items-center md:gap-4"
          >
            <Checkbox itemId={problem.id} label={problem.name} />

            <div className="flex min-w-0 flex-wrap items-center gap-1.5 md:justify-end">
              <span
                className="readout shrink-0 font-medium capitalize"
                style={{ color: DIFFICULTY_COLOR[problem.difficulty] }}
              >
                {problem.difficulty}
              </span>
              {problem.companies.map((company) => (
                <span key={company} className="tag tag-outline">
                  {COMPANY_LABEL[company] ?? company}
                </span>
              ))}
              {problem.core ? <span className="tag tag-accent">Core</span> : null}
              <span className="readout shrink-0 text-[var(--text-muted)]">
                <a
                  href={problem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-2 hover:text-[var(--accent)] hover:underline"
                >
                  LC {problem.leetcodeNumber}
                </a>
                <span className="text-[var(--text-faint)]"> · {problem.minutes}m</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
