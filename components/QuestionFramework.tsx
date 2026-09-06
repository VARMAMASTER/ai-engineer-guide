'use client'

import { useId, useState } from 'react'
import { content } from '@/lib/content/index'
import type { SdQuestion } from '@/lib/content/schema'
import Checkbox from './Checkbox'

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

const TIER_LABEL: Record<string, string> = { '1': 'Tier 1', '2': 'Tier 2', ml: 'ML', ai: 'AI' }

function tierLabel(tier: SdQuestion['tier']): string {
  return TIER_LABEL[String(tier)] ?? String(tier)
}

interface Props {
  question: SdQuestion
}

export default function QuestionFramework({ question }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const pattern = content.sdPatterns.find((p) => p.id === question.patternId)
  const headings = pattern?.group === 'ml' ? ML_STEP_HEADINGS : GENERAL_STEP_HEADINGS

  return (
    <li className="panel flex min-w-0 flex-col gap-0 rounded-[var(--radius)] p-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-left"
      >
        <span
          aria-hidden="true"
          className="shrink-0 text-[var(--text-muted)] transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &rsaquo;
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium">{question.title}</span>
        <span className="readout shrink-0 rounded-full bg-[var(--track)] px-2 py-0.5 text-[var(--text-muted)]">
          {tierLabel(question.tier)}
        </span>
        {question.companies.map((c) => (
          <span
            key={c}
            className="readout shrink-0 rounded-full bg-[var(--track)] px-2 py-0.5 text-[var(--text-muted)] capitalize"
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
        <div id={panelId} className="mt-2 flex flex-col gap-4 border-t border-[var(--panel-border)] pt-3">
          {STEP_KEYS.map((key) => (
            <div key={key} className="flex min-w-0 flex-col gap-1.5">
              <h3 className="text-sm font-medium">{headings[key]}</h3>
              <ul className="flex flex-col gap-1 pl-4 text-sm text-[var(--text-muted)]">
                {question.steps[key].map((prompt) => (
                  <li key={prompt} className="list-disc marker:text-[var(--text-faint)]">
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </li>
  )
}
