'use client'

import { useState } from 'react'
import { content } from '@/lib/content/index'
import type { BehaviouralPrinciple } from '@/lib/content/schema'
import {
  Bullets,
  COMPANY_LABEL,
  COMPANY_ORDER,
  FilterChips,
  type PrincipleCompany,
} from './BehaviouralShared'

type Filter = PrincipleCompany | 'all'

export function sortedPrinciples(company?: PrincipleCompany): BehaviouralPrinciple[] {
  return content.behaviouralPrinciples
    .filter((p) => company === undefined || p.company === company)
    .sort((a, b) => a.order - b.order)
}

/**
 * One principle.
 *
 * `weakAnswer` is the loudest thing in the card on purpose. Every rubric in
 * the world can tell you a principle is about "ownership"; almost none of them
 * will play back the exact sentence you are about to say, and recognising your
 * own answer in that sentence is faster than reading four paragraphs about
 * what good looks like. So it gets the warning border, the larger type and the
 * quotation marks, and `lookingFor` — the fix — sits underneath it.
 *
 * The inner block is `.surface-solid`, not `.panel`: glass inside glass
 * doubles the blur cost and reads as mud.
 */
function PrincipleCard({ principle }: { principle: BehaviouralPrinciple }) {
  return (
    <li className="panel flex min-w-0 flex-col gap-3 rounded-[var(--radius)] p-4" id={principle.id}>
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <h4 className="min-w-0 font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
          {principle.name}
        </h4>
        <span className="readout shrink-0 text-[var(--text-faint)]">
          {COMPANY_LABEL[principle.company]}
        </span>
      </div>

      <p className="min-w-0 max-w-[72ch] text-sm text-[var(--text-muted)]">{principle.meaning}</p>

      <div
        className="surface-solid flex min-w-0 flex-col gap-1.5 p-3"
        style={{ borderColor: 'var(--warning)' }}
        data-testid="weak-answer"
      >
        <span className="eyebrow" style={{ color: 'var(--warning)' }}>
          A weak answer sounds like
        </span>
        <p className="min-w-0 max-w-[66ch] text-base leading-relaxed text-[var(--text)]">
          &ldquo;{principle.weakAnswer}&rdquo;
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="eyebrow">What they are scoring</span>
        <Bullets items={principle.lookingFor} />
      </div>
    </li>
  )
}

/**
 * The principles tab: 29 principles grouped by the company that scores them.
 *
 * Grouping is by company rather than one flat list because the groups are not
 * comparable — Amazon publishes sixteen and asks about them by name, Google
 * and Meta score two or three attributes that are never read out, and
 * `general` is what every other loop probes without a label.
 */
export default function BehaviouralPrinciples() {
  const [filter, setFilter] = useState<Filter>('all')

  const options = [
    { value: 'all' as const, label: 'All', count: content.behaviouralPrinciples.length },
    ...COMPANY_ORDER.map((c) => ({
      value: c,
      label: COMPANY_LABEL[c],
      count: sortedPrinciples(c).length,
    })),
  ]

  const groups = COMPANY_ORDER.filter((c) => filter === 'all' || c === filter)

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <FilterChips label="Company" options={options} value={filter} onChange={setFilter} />

      {groups.map((company) => {
        const principles = sortedPrinciples(company)
        return (
          <section key={company} className="flex min-w-0 flex-col gap-3">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              {COMPANY_LABEL[company]}
              <span className="readout ml-2 text-[var(--text-faint)]">{principles.length}</span>
            </h3>
            <ul className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              {principles.map((p) => (
                <PrincipleCard key={p.id} principle={p} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
