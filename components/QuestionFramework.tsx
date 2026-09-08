'use client'

import { useId, useState } from 'react'
import { content } from '@/lib/content/index'
import type { SdBudget, SdQuestion } from '@/lib/content/schema'
import Checkbox from './Checkbox'
import Mermaid from './Mermaid'

const GENERAL_STEP_HEADINGS = {
  define: 'Define the problem',
  data: 'Data model',
  architecture: 'Core components',
  evaluate: 'Scale and consistency',
  deploy: 'Deploy and operate',
  wrapup: 'Wrap up',
} as const

const ML_STEP_HEADINGS = {
  define: 'Define the problem',
  data: 'Data pipeline',
  architecture: 'Model architecture',
  evaluate: 'Train and evaluate',
  deploy: 'Deploy and monitor',
  wrapup: 'Wrap up',
} as const

const STEP_KEYS = ['define', 'data', 'architecture', 'evaluate', 'deploy', 'wrapup'] as const

/**
 * The six phases of the round, in the order they are performed. Listed here
 * rather than derived from `Object.keys` so the strip cannot be reshuffled by a
 * change to the shape of the schema object.
 */
const BUDGET_PHASES: ReadonlyArray<{ key: keyof SdBudget; label: string }> = [
  { key: 'requirements', label: 'Requirements' },
  { key: 'estimates', label: 'Estimates' },
  { key: 'apiAndData', label: 'API and data' },
  { key: 'architecture', label: 'Architecture' },
  { key: 'deepDive', label: 'Deep dive' },
  { key: 'wrapUp', label: 'Wrap up' },
]

/**
 * Tints for the six budget segments: the accent mixed down into the track in
 * even steps. One hue rather than six means the strip reads as a single clock
 * face, and the step between neighbours is what separates the phases.
 */
const SEGMENT_MIX = [88, 74, 60, 47, 35, 24]

const TIER_LABEL: Record<string, string> = { '1': 'Tier 1', '2': 'Tier 2', ml: 'ML', ai: 'AI' }

function tierLabel(tier: SdQuestion['tier']): string {
  return TIER_LABEL[String(tier)] ?? String(tier)
}

interface Phase {
  key: keyof SdBudget
  label: string
  minutes: number
  /** Cumulative: the clock reading this phase should be finished by. */
  by: number
  mix: number
}

/**
 * Module scope, not the component body: the running total is a fold over the
 * budget, and doing it inline would be a reassignment during render.
 */
function phasesOf(budget: SdBudget): Phase[] {
  return BUDGET_PHASES.reduce<Phase[]>((acc, { key, label }, i) => {
    const previous = acc[acc.length - 1]?.by ?? 0
    acc.push({
      key,
      label,
      minutes: budget[key],
      by: previous + budget[key],
      mix: SEGMENT_MIX[i],
    })
    return acc
  }, [])
}

/**
 * The per-phase minute budget as a proportional strip plus a legend.
 *
 * The bar is `aria-hidden`: it carries nothing the legend below does not state
 * in words, and six unlabelled boxes are noise to a screen reader. The legend
 * gives each phase its own minutes AND the cumulative clock reading it should
 * be finished by, because pacing in a real round is checked against the wall
 * clock rather than against a stopwatch restarted per phase.
 */
function BudgetStrip({ budget, total }: { budget: SdBudget; total: number }) {
  const phases = phasesOf(budget)

  return (
    <div className="surface-solid flex min-w-0 flex-col gap-2 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="eyebrow">Pace</p>
        <p className="readout text-[var(--text-muted)]">{total}m total</p>
      </div>

      <div aria-hidden="true" className="flex h-2 w-full min-w-0 gap-0.5">
        {phases.map((p) => (
          <span
            key={p.key}
            className="block h-full rounded-[2px]"
            style={{
              flexGrow: p.minutes,
              flexBasis: 0,
              backgroundColor: `color-mix(in srgb, var(--accent) ${p.mix}%, var(--track))`,
            }}
          />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {phases.map((p) => (
          <li key={p.key} className="readout flex min-w-0 items-baseline gap-1.5">
            <span className="text-[var(--text-muted)]">{p.label}</span>
            <span className="text-[var(--text)]">{p.minutes}m</span>
            <span className="text-[var(--text-faint)]">by {p.by}m</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface Props {
  question: SdQuestion
}

/**
 * One system design question: the six-step framework, and behind a deliberate
 * reveal, the reference answer.
 *
 * The split is the whole point of the component. The prompts, the minute budget
 * and the opening sentence are all things you want BEFORE you attempt the
 * question, so they appear as soon as it is expanded. The solution, the
 * estimates, the architecture diagram, the traps and the pushback answers stop
 * the bank being practice the moment they sit on screen next to the prompt, so
 * they go behind `Show reference answer`, which starts closed and is reset
 * whenever the question is collapsed — otherwise re-expanding a question you
 * revealed earlier would spring the answer open in front of you.
 */
export default function QuestionFramework({ question }: Props) {
  const [open, setOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const panelId = useId()
  const answerId = useId()
  const pattern = content.sdPatterns.find((p) => p.id === question.patternId)
  const headings = pattern?.group === 'ml' ? ML_STEP_HEADINGS : GENERAL_STEP_HEADINGS
  const { solution, delivery } = question

  function toggleOpen() {
    setOpen((wasOpen) => {
      if (wasOpen) setRevealed(false)
      return !wasOpen
    })
  }

  return (
    <li className="panel flex min-w-0 flex-col gap-0 rounded-[var(--radius)] p-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggleOpen}
        className="flex min-h-11 min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-left"
      >
        <span
          aria-hidden="true"
          className="shrink-0 text-[var(--text-muted)] transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &rsaquo;
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium">{question.title}</span>
        <span className="tag">
          {tierLabel(question.tier)}
        </span>
        {question.companies.map((c) => (
          <span
            key={c}
            className="tag capitalize"
          >
            {c}
          </span>
        ))}
        <span className="readout shrink-0 text-[var(--text-faint)]">{question.minutes}m</span>
      </button>

      <div className="mt-2 border-t border-[var(--panel-border)] pt-2">
        <Checkbox itemId={question.id} label={question.title} />
      </div>

      {open ? (
        <div
          id={panelId}
          className="mt-2 flex min-w-0 flex-col gap-4 border-t border-[var(--panel-border)] pt-3"
        >
          {/* Practice side: what is useful before you have attempted anything. */}
          <BudgetStrip budget={delivery.budget} total={question.minutes} />

          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="text-sm font-medium">Open with</h3>
            <p className="border-l-2 border-[var(--accent-line)] pl-3 text-sm break-words text-[var(--text-muted)] italic">
              {delivery.opening}
            </p>
          </div>

          {STEP_KEYS.map((key) => (
            <div key={key} className="flex min-w-0 flex-col gap-1.5">
              <h3 className="text-sm font-medium">{headings[key]}</h3>
              <ul className="flex flex-col gap-1 pl-4 text-sm text-[var(--text-muted)]">
                {question.steps[key].map((prompt) => (
                  <li key={prompt} className="list-disc break-words marker:text-[var(--text-faint)]">
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* The line between attempting the question and checking yourself. */}
          <div className="flex min-w-0 flex-col gap-3 border-t border-dashed border-[var(--panel-border)] pt-3">
            <button
              type="button"
              data-testid="sd-reveal"
              aria-expanded={revealed}
              aria-controls={answerId}
              onClick={() => setRevealed((v) => !v)}
              className="surface-solid flex min-h-11 min-w-0 items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--track)]"
            >
              <span aria-hidden="true">{revealed ? '−' : '+'}</span>
              {revealed ? 'Hide reference answer' : 'Show reference answer'}
            </button>

            {revealed ? (
              <div id={answerId} data-testid="sd-answer" className="flex min-w-0 flex-col gap-4">
                <p className="eyebrow">Reference answer</p>

                {STEP_KEYS.map((key) => (
                  <div key={key} className="flex min-w-0 flex-col gap-1.5">
                    <h3 className="text-sm font-medium">{headings[key]}</h3>
                    <p className="text-sm break-words text-[var(--text-muted)]">{solution[key]}</p>
                  </div>
                ))}

                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="text-sm font-medium">Numbers to say out loud</h3>
                  {/* Arithmetic, so monospace and its own solid block: figures
                      that do not line up are figures nobody checks. */}
                  <ul className="surface-solid flex min-w-0 flex-col gap-2 p-3 font-mono text-xs leading-relaxed tabular-nums">
                    {solution.numbers.map((n) => (
                      <li key={n} className="min-w-0 break-words text-[var(--text-muted)]">
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="text-sm font-medium">Reference architecture</h3>
                  {/* Mermaid brings its own solid surface and its own
                      `overflow-x-auto`, so it is never wrapped in a Panel. */}
                  <Mermaid
                    source={question.diagram}
                    caption={`Reference architecture for ${question.title}`}
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="text-sm font-medium">Traps</h3>
                  <ul className="flex flex-col gap-1 pl-4 text-sm text-[var(--text-muted)]">
                    {delivery.traps.map((t) => (
                      <li key={t} className="list-disc break-words marker:text-[var(--danger)]">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="text-sm font-medium">When pushed</h3>
                  <dl className="flex min-w-0 flex-col gap-2.5">
                    {delivery.whenPushed.map((p) => (
                      <div key={p.challenge} className="flex min-w-0 flex-col gap-1">
                        <dt className="text-sm font-medium break-words">{p.challenge}</dt>
                        <dd className="text-sm break-words text-[var(--text-muted)]">{p.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}
