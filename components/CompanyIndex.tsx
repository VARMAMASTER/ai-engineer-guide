import Link from 'next/link'
import { content } from '@/lib/content/index'
import type { CompanyGuide } from '@/lib/content/schema'

/**
 * Slug for a company guide: `co-amazon` becomes `amazon`.
 *
 * Deliberately not in `lib/content/ids.ts`: `co-` is the only prefix the
 * `/companies` segment ever sees, so registering it there would let `slugOf`
 * strip it from ids on pages that have nothing to do with this section.
 *
 * Nothing under `/companies` carries client state — no store read, no reveal,
 * no filter — so neither this module nor `CompanyDetail` is a client
 * component. That is also what lets the route import this helper and *call*
 * it in `generateStaticParams`, which is impossible across a `'use client'`
 * boundary.
 */
export function companySlug(id: string): string {
  return id.replace(/^co-/, '')
}

/** Total interviewer time in the loop, counting repeated rounds. */
export function loopMinutes(guide: CompanyGuide): number {
  return guide.rounds.reduce((n, r) => n + r.count * r.minutes, 0)
}

export function loopRoundCount(guide: CompanyGuide): number {
  return guide.rounds.reduce((n, r) => n + r.count, 0)
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function GuideCard({ guide, rank }: { guide: CompanyGuide; rank: number }) {
  return (
    <li>
      <Link
        href={`/companies/${companySlug(guide.id)}`}
        className="panel card flex min-w-0 flex-col gap-3 p-4"
      >
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <h2 className="min-w-0">{guide.name}</h2>
          <span className="readout shrink-0 text-[var(--text-faint)]">#{rank}</span>
        </div>

        <p className="line-clamp-3 min-w-0 text-sm text-[var(--text-muted)]">{guide.level}</p>

        <div className="flex min-w-0 flex-col gap-1">
          <span className="eyebrow">Hiring where you are</span>
          <p className="line-clamp-2 min-w-0 text-sm text-[var(--text-muted)]">
            {guide.marketNote}
          </p>
        </div>

        <span className="readout text-[var(--text-faint)]">
          {loopRoundCount(guide)} interviews &middot; {formatMinutes(loopMinutes(guide))}
        </span>
      </Link>
    </li>
  )
}

/**
 * The companies landing page.
 *
 * Ordered by `order`, which is how realistic each loop is for this candidate
 * rather than how prestigious the company is — the three with a real India
 * engineering presence first, then the relocation-only ones. That ranking is
 * the page's whole editorial claim, so the rank number is printed on every
 * card instead of being left implicit in the reading order.
 */
export default function CompanyIndex() {
  const guides = [...content.companyGuides].sort((a, b) => a.order - b.order)

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="min-w-0">
        <p className="eyebrow">Companies</p>
        <h1 className="mt-1">Companies</h1>
        <p className="mt-2 max-w-[68ch] text-sm text-[var(--text-muted)]">
          What each loop actually is, how it is weighted, and where candidates lose it. Ordered by
          how realistic the company is for you today — India engineering presence first,
          relocation-only stretch targets last — not by how much you would like to work there.
        </p>
      </header>

      <ul className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        {guides.map((g) => (
          <GuideCard key={g.id} guide={g} rank={g.order} />
        ))}
      </ul>
    </div>
  )
}
