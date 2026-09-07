'use client'

import { useId, useState } from 'react'
import type { HwQuestion } from '@/lib/content/schema'
import Checkbox from './Checkbox'

interface Props {
  questions: HwQuestion[]
}

/**
 * The question list for one GPU/hardware topic. Same reveal discipline as the
 * AI/ML bank: `text` sits in a Checkbox row, and `answer` plus `keyPoint` sit
 * behind a per-question toggle that defaults to hidden, because the page's
 * framing ("check it only when you can answer it cold") only holds if the
 * answer is not already on screen.
 *
 * What is different here is `numbers`. A hardware answer is only credible if it
 * lands a figure — "H100 SXM5: 3.35 TB/s HBM3" — so those figures get their own
 * labelled monospace block at the TOP of the revealed panel, above the prose.
 * Someone revising the night before is scanning for the number, not reading a
 * paragraph to find it. It is inside the reveal rather than always-on because
 * for many of these questions the figure *is* the answer.
 *
 * The block is omitted entirely when `numbers` is absent — an empty labelled
 * box would read as missing content rather than as content that does not apply.
 *
 * "Reveal all" is a plain `useState`, not progress-store state: it must forget
 * itself on every reload, unlike the checkbox. The reveal toggle and the
 * checkbox are two separate controls (a button and a label+input), never nested
 * inside each other, so clicking one can never trigger the other.
 */
export default function HardwareTopic({ questions }: Props) {
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

              <div className="flex justify-end px-2 pb-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleOne(q.id)}
                  className="readout flex min-h-11 items-center gap-1 px-1 text-[var(--accent)]"
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
                  {q.numbers && q.numbers.length > 0 ? (
                    <div
                      data-testid="hw-numbers"
                      className="surface-solid flex min-w-0 flex-col gap-1.5 p-2.5"
                    >
                      <span className="eyebrow">Numbers to cite</span>
                      {/* Cited figures, so monospace and tabular — the same
                          treatment the Meter readouts get. `anywhere` wrapping,
                          not `overflow-x`, so a long figure folds onto a second
                          line at 390px instead of pushing the page sideways. */}
                      <ul className="flex min-w-0 list-none flex-col gap-1.5 pl-0">
                        {q.numbers.map((n) => (
                          <li
                            key={n}
                            className="flex min-w-0 gap-2 font-mono text-xs leading-relaxed tabular-nums text-[var(--text)]"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-[0.5em] size-1 shrink-0 rounded-full bg-[var(--accent)]"
                            />
                            <span className="min-w-0 [overflow-wrap:anywhere]">{n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

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
