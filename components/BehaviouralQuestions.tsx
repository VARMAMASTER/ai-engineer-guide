'use client'

import { useId, useMemo, useState } from 'react'
import { content } from '@/lib/content/index'
import type { BehaviouralPrinciple, BehaviouralQuestion } from '@/lib/content/schema'
import Checkbox from './Checkbox'
import Meter from './Meter'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import {
  Bullets,
  COMPANY_LABEL,
  COMPANY_ORDER,
  FilterChips,
  Pill,
  type PrincipleCompany,
} from './BehaviouralShared'

type CompanyFilter = PrincipleCompany | 'all'

const PRINCIPLES = new Map<string, BehaviouralPrinciple>(
  content.behaviouralPrinciples.map((p) => [p.id, p]),
)

function principlesOf(q: BehaviouralQuestion): BehaviouralPrinciple[] {
  return q.principleIds
    .map((id) => PRINCIPLES.get(id))
    .filter((p): p is BehaviouralPrinciple => p !== undefined)
}

/**
 * One question.
 *
 * `probes` are behind a reveal and `traps` are not, and the split is the whole
 * design of this card. Traps are things to avoid while you answer, so reading
 * them first is the point. Probes are the interviewer's follow-ups — the part
 * of the round that actually decides it — and reading those before you have
 * given your first answer turns a rehearsal into a recital: you would write
 * the answer backwards from the follow-up, which is the one thing the real
 * round never lets you do.
 */
function QuestionCard({ question }: { question: BehaviouralQuestion }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const principles = principlesOf(question)

  return (
    <li className="panel flex min-w-0 flex-col gap-3 rounded-[var(--radius)] p-4">
      <div className="flex min-w-0 flex-col gap-2">
        <h4 className="min-w-0 max-w-[62ch] font-[family-name:var(--font-display)] text-base font-semibold leading-snug tracking-tight md:text-lg">
          {question.prompt}
        </h4>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="readout text-[var(--text-faint)]">{question.minutes}m</span>
          {principles.map((p) => (
            <Pill key={p.id}>
              {COMPANY_LABEL[p.company]} &middot; {p.name}
            </Pill>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="eyebrow" style={{ color: 'var(--warning)' }}>
          Traps
        </span>
        <Bullets items={question.traps} />
      </div>

      <div className="flex min-w-0 flex-col gap-2 border-t border-[var(--panel-border)] pt-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 w-full min-w-0 items-center gap-2 text-left text-[var(--accent)]"
        >
          <span
            aria-hidden="true"
            className="shrink-0 transition-transform"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            &rsaquo;
          </span>
          <span className="readout">
            {open ? 'Hide the follow-ups' : `Reveal the follow-ups (${question.probes.length})`}
          </span>
        </button>

        {open ? (
          <div id={panelId} className="flex min-w-0 flex-col gap-1.5 pb-1">
            <span className="eyebrow">
              Asked after your first answer &mdash; this is where the round is decided
            </span>
            <Bullets items={question.probes} />
          </div>
        ) : null}
      </div>

      <Checkbox
        itemId={question.id}
        label="Answered this out loud, with a story, inside the time"
      />
    </li>
  )
}

/**
 * The questions tab: 50 prompts, filtered by company and then by principle.
 *
 * The principle filter is scoped to the company chip above it, because a
 * flat 29-entry dropdown mixing Amazon LPs with Meta attributes is unusable
 * and, worse, invites you to prepare a Meta answer for an Amazon loop.
 */
export default function BehaviouralQuestions() {
  const hydrated = useHydrated()
  const completed = useProgress((s) => s.completed)
  const [company, setCompany] = useState<CompanyFilter>('all')
  const [principleId, setPrincipleId] = useState<string>('all')
  const selectId = useId()

  const countFor = (c: PrincipleCompany) =>
    content.behaviouralQuestions.filter((q) => principlesOf(q).some((p) => p.company === c)).length

  const companyOptions = [
    { value: 'all' as const, label: 'All', count: content.behaviouralQuestions.length },
    ...COMPANY_ORDER.map((c) => ({ value: c, label: COMPANY_LABEL[c], count: countFor(c) })),
  ]

  const principleOptions = useMemo(
    () =>
      content.behaviouralPrinciples
        .filter((p) => company === 'all' || p.company === company)
        .sort((a, b) => a.order - b.order),
    [company],
  )

  const questions = useMemo(() => {
    return content.behaviouralQuestions.filter((q) => {
      const ps = principlesOf(q)
      if (company !== 'all' && !ps.some((p) => p.company === company)) return false
      if (principleId !== 'all' && !q.principleIds.includes(principleId)) return false
      return true
    })
  }, [company, principleId])

  const done = hydrated ? questions.filter((q) => Boolean(completed[q.id])).length : 0

  function chooseCompany(next: CompanyFilter) {
    setCompany(next)
    // The selected principle may not belong to the new company. Dropping back
    // to "all" is the only outcome that cannot silently show zero questions.
    setPrincipleId('all')
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-4">
        <FilterChips
          label="Company"
          options={companyOptions}
          value={company}
          onChange={chooseCompany}
        />

        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="eyebrow" htmlFor={selectId}>
            Principle
          </label>
          <select
            id={selectId}
            value={principleId}
            onChange={(e) => setPrincipleId(e.target.value)}
            className="surface-solid min-h-11 w-full max-w-sm px-3 text-sm text-[var(--text)]"
          >
            <option value="all">Every principle</option>
            {principleOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {COMPANY_LABEL[p.company]} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="max-w-sm">
          <Meter label="Answered out loud" done={done} target={questions.length} />
        </div>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          No question in the bank is tagged with that principle yet.
        </p>
      ) : (
        <ul className="flex min-w-0 flex-col gap-4">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </ul>
      )}
    </div>
  )
}
