'use client'

import { useId, useState } from 'react'
import { content } from '@/lib/content/index'
import BehaviouralPrinciples from './BehaviouralPrinciples'
import BehaviouralQuestions from './BehaviouralQuestions'
import BehaviouralStories, { StoryCoverage } from './BehaviouralStories'

type Tab = 'principles' | 'questions' | 'stories'

const TABS: { id: Tab; label: string; blurb: string }[] = [
  {
    id: 'principles',
    label: 'Principles',
    blurb: 'What each company scores, and the sentence that fails it.',
  },
  {
    id: 'questions',
    label: 'Questions',
    blurb: 'The prompt, its traps, and the follow-ups that decide the round.',
  },
  {
    id: 'stories',
    label: 'Stories',
    blurb: 'Fifteen reusable STAR slots. Write them once, use them everywhere.',
  },
]

/**
 * The behavioural section.
 *
 * Three banks, three moments. Principles are what you read weeks out, when you
 * still think "ownership" is a word rather than a rubric. Questions are the
 * rehearsal. Stories are the raw material both of the others are asking you
 * for, and they are the only part of this page you write yourself. They are
 * tabs rather than three stacked sections because 29 principles plus 50
 * questions plus 15 drafting pads on one scroll is a page nobody reaches the
 * bottom of.
 *
 * Coverage sits above the tabs, outside them, because it is the one thing here
 * that is true about *you* rather than about the companies — and because the
 * gap it names is the reason to open any of the three tabs at all.
 */
export default function BehaviouralIndex() {
  const [tab, setTab] = useState<Tab>('principles')
  const base = useId()

  const counts: Record<Tab, number> = {
    principles: content.behaviouralPrinciples.length,
    questions: content.behaviouralQuestions.length,
    stories: content.storySlots.length,
  }

  const active = TABS.find((t) => t.id === tab)!

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="min-w-0">
        <p className="eyebrow">Behavioural</p>
        <h1 className="mt-1">Behavioural</h1>
        <p className="mt-2 max-w-[68ch] text-sm text-[var(--text-muted)]">
          Over half of an Amazon loop and a full round at Google and Meta. It is scored from
          written notes by people who never met you, so the story has to carry a number, a
          decision that cost something, and the word &ldquo;I&rdquo;.
        </p>
      </header>

      <StoryCoverage onOpenStories={() => setTab('stories')} />

      <div className="flex min-w-0 flex-col gap-4">
        <div
          role="tablist"
          aria-label="Behavioural banks"
          data-testid="behavioural-tabs"
          className="flex min-w-0 flex-wrap gap-2"
        >
          {TABS.map((t) => {
            const selected = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${base}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${base}-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                data-active={selected ? 'true' : 'false'}
                className="flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border px-4 text-sm font-medium transition-colors data-[active=false]:border-[var(--panel-border)] data-[active=false]:text-[var(--text-muted)] data-[active=false]:hover:border-[var(--accent-line)] data-[active=false]:hover:text-[var(--text)] data-[active=true]:border-[var(--accent-line)] data-[active=true]:bg-[var(--accent-soft)] data-[active=true]:text-[var(--accent)]"
              >
                {t.label}
                <span className="readout text-[var(--text-faint)]">{counts[t.id]}</span>
              </button>
            )
          })}
        </div>

        <p className="max-w-[68ch] text-sm text-[var(--text-muted)]">{active.blurb}</p>

        <div
          role="tabpanel"
          id={`${base}-panel-${tab}`}
          aria-labelledby={`${base}-tab-${tab}`}
          className="min-w-0"
        >
          {tab === 'principles' ? <BehaviouralPrinciples /> : null}
          {tab === 'questions' ? <BehaviouralQuestions /> : null}
          {tab === 'stories' ? <BehaviouralStories /> : null}
        </div>
      </div>
    </div>
  )
}
