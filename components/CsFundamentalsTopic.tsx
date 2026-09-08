'use client'

import { useId, useState } from 'react'
import type { CsQuestion } from '@/lib/content/schema'
import Checkbox from './Checkbox'

interface Props {
  questions: CsQuestion[]
}

const COMPANY_LABEL: Record<string, string> = {
  google: 'Google',
  meta: 'Meta',
  amazon: 'Amazon',
}

/**
 * The question list for one CS fundamentals topic.
 *
 * Deliberately the same shape as `TopicQuestions` (AI/ML): `text` sits in a
 * Checkbox row, and `answer` plus `keyPoint` sit behind a per-question reveal
 * that defaults to hidden. The whole point of this section is self-testing, so
 * the answer must not be sitting on the page when you arrive.
 *
 * `keyPoint` gets its own boxed treatment rather than a second paragraph — it
 * is the detail that separates a strong answer from a memorised definition, and
 * it should read as a different kind of thing from the answer prose.
 *
 * "Reveal all" is a plain `useState`, not progress-store state: it must forget
 * itself on every reload, unlike the checkbox. The reveal toggle and the
 * checkbox are two separate controls (a button and a label+input), never nested
 * inside each other, so clicking one can never trigger the other.
 *
 * `companies` is empty for most questions and renders nothing then — a tag only
 * appears where the research actually places the question in a named loop.
 */
export default function CsFundamentalsTopic({ questions }: Props) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const panelBase = useId()
  const allRevealed = questions.length > 0 && questions.every((q) => revealed[q.id])

  function toggleOne(id: string) {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleAll() {
    setRevealed(allRevealed ? {} : Object.fromEntries(questions.map((q) => [q.id, true])))
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={toggleAll}
          className="readout flex min-h-11 shrink-0 items-center rounded-[var(--radius-sm)] border border-[var(--panel-border)] px-3 text-[var(--text-muted)] transition-colors hover:border-[var(--accent-line)] hover:text-[var(--text)]"
        >
          {allRevealed ? 'Hide all' : 'Reveal all'}
        </button>
      </div>

      <ul className="panel flex flex-col gap-0.5 p-2">
        {questions.map((q) => {
          const isOpen = Boolean(revealed[q.id])
          const panelId = `${panelBase}-${q.id}`

          return (
            <li
              key={q.id}
              className="flex min-w-0 flex-col gap-0 border-b border-[var(--panel-border)] pb-1 last:border-b-0 last:pb-0"
            >
              <Checkbox itemId={q.id} label={q.text} meta={`${q.minutes}m`} />

              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2 pb-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {q.companies.map((c) => (
                    <span
                      key={c}
                      className="tag capitalize"
                    >
                      {COMPANY_LABEL[c] ?? c}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleOne(q.id)}
                  className="readout ml-auto flex min-h-11 items-center gap-1 px-1 text-[var(--accent)]"
                >
                  <span
                    aria-hidden="true"
                    className="transition-transform"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    &rsaquo;
                  </span>
                  {isOpen ? 'Hide answer' : 'Reveal answer'}
                </button>
              </div>

              {isOpen ? (
                <div id={panelId} className="flex min-w-0 flex-col gap-2 px-2 pb-3 text-sm">
                  <p className="min-w-0 text-[var(--text)] [overflow-wrap:anywhere]">{q.answer}</p>
                  <div className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-sm)] border border-[var(--accent-line)] bg-[var(--accent-soft)] p-2.5">
                    <span className="eyebrow text-[var(--accent)]">Key point</span>
                    <p className="min-w-0 text-sm text-[var(--text)] [overflow-wrap:anywhere]">
                      {q.keyPoint}
                    </p>
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
