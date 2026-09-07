'use client'

import { useId, useState } from 'react'
import { content } from '@/lib/content/index'
import type { BehaviouralPrinciple, StorySlot } from '@/lib/content/schema'
import Meter from './Meter'
import ContentProse from './ContentProse'
import {
  EMPTY_DRAFT,
  STAR_FIELDS,
  filledFields,
  isDrafted,
  useStories,
  useStoriesHydrated,
  type StarField,
  type StoryDraft,
} from '@/lib/progress/stories'
import { COMPANY_LABEL, COMPANY_ORDER, Pill } from './BehaviouralShared'

const PRINCIPLES = new Map<string, BehaviouralPrinciple>(
  content.behaviouralPrinciples.map((p) => [p.id, p]),
)

const FIELD_LABEL: Record<StarField, string> = {
  situation: 'Situation',
  task: 'Task',
  action: 'Action',
  result: 'Result',
}

function principlesOf(story: StorySlot): BehaviouralPrinciple[] {
  return story.covers
    .map((id) => PRINCIPLES.get(id))
    .filter((p): p is BehaviouralPrinciple => p !== undefined)
}

/**
 * Which stories are started, and therefore which principles are covered.
 *
 * Coverage counts a story from the first sentence typed into it rather than
 * from a finished four-field draft. A half-written story is still a story you
 * have chosen and can talk about; requiring all four fields would leave the
 * gap list reading 29 for the whole first week, which is exactly the point at
 * which a coverage view stops being read.
 */
function useCoverage() {
  const hydrated = useStoriesHydrated()
  const drafts = useStories((s) => s.drafts)

  const drafted = hydrated ? content.storySlots.filter((s) => isDrafted(drafts[s.id])) : []
  const covered = new Set(drafted.flatMap((s) => s.covers))

  return { drafted, covered }
}

/**
 * The gap view.
 *
 * A full Amazon loop asks eight to ten behavioural questions in a single day,
 * and every interviewer writes up the story they heard. Two stories stretched
 * across ten answers does not read as depth, it reads as a thin work history —
 * so the number that matters is not how many stories you have written, it is
 * how many principles you could not answer at all. That list is rendered in
 * full rather than summarised, because "17 principles uncovered" is a fact you
 * can look away from and "Frugality, Dive Deep, Are Right A Lot" is not.
 */
export function StoryCoverage({ onOpenStories }: { onOpenStories?: () => void }) {
  const { drafted, covered } = useCoverage()

  const gaps = COMPANY_ORDER.map((company) => {
    const all = content.behaviouralPrinciples
      .filter((p) => p.company === company)
      .sort((a, b) => a.order - b.order)
    return { company, all, missing: all.filter((p) => !covered.has(p.id)) }
  }).filter((g) => g.all.length > 0)

  const totalMissing = gaps.reduce((n, g) => n + g.missing.length, 0)

  return (
    <section className="panel flex min-w-0 flex-col gap-4 rounded-[var(--radius)] p-5">
      <div className="min-w-0">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>
          Story coverage
        </p>
        <h2 className="mt-1">Which principles can you actually answer?</h2>
        <p className="mt-2 max-w-[70ch] text-sm text-[var(--text-muted)]">
          A full Amazon loop asks eight to ten behavioural questions in one day, and every
          interviewer writes up the story they heard. Two stories stretched across ten answers does
          not read as depth &mdash; it reads as a thin work history. Draft a story and the
          principles it covers drop off this list.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        <Meter label="Stories drafted" done={drafted.length} target={content.storySlots.length} />
        {gaps.map((g) => (
          <Meter
            key={g.company}
            label={`${COMPANY_LABEL[g.company]} principles with a story`}
            done={g.all.length - g.missing.length}
            target={g.all.length}
          />
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-3 border-t border-[var(--panel-border)] pt-3">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
          <span
            className="eyebrow"
            style={totalMissing > 0 ? { color: 'var(--warning)' } : undefined}
          >
            No story yet
          </span>
          <span
            className="readout shrink-0"
            style={{ color: totalMissing > 0 ? 'var(--warning)' : 'var(--positive)' }}
            data-testid="uncovered-count"
          >
            {totalMissing} of {content.behaviouralPrinciples.length}
          </span>
        </div>

        {totalMissing === 0 ? (
          <p className="max-w-[70ch] text-sm" style={{ color: 'var(--positive)' }}>
            Every principle in the bank has at least one drafted story behind it. Now go back and
            check that no single story is carrying more than three of them.
          </p>
        ) : (
          <ul className="flex min-w-0 flex-col gap-3">
            {gaps
              .filter((g) => g.missing.length > 0)
              .map((g) => (
                <li key={g.company} className="flex min-w-0 flex-col gap-1.5">
                  <span className="readout text-[var(--text-muted)]">
                    {COMPANY_LABEL[g.company]}{' '}
                    <span className="text-[var(--text-faint)]">
                      {g.missing.length}/{g.all.length}
                    </span>
                  </span>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {g.missing.map((p) => (
                      <Pill key={p.id}>{p.name}</Pill>
                    ))}
                  </div>
                </li>
              ))}
          </ul>
        )}

        {onOpenStories ? (
          <div>
            <button
              type="button"
              onClick={onOpenStories}
              className="readout flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3.5 text-[var(--accent)]"
            >
              Draft a story
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

/** One STAR field: the guiding question, then the box you answer it in. */
function StarBox({
  storyId,
  field,
  prompt,
  value,
  disabled,
}: {
  storyId: string
  field: StarField
  prompt: string
  value: string
  disabled: boolean
}) {
  const setField = useStories((s) => s.setField)
  const id = useId()

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="eyebrow">
        {FIELD_LABEL[field]}
      </label>
      <p className="max-w-[74ch] text-sm text-[var(--text-muted)]">{prompt}</p>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => setField(storyId, field, e.target.value)}
        aria-label={`${FIELD_LABEL[field]} — ${prompt}`}
        rows={4}
        data-field={field}
        className="surface-solid min-h-[5.5rem] w-full max-w-[74ch] resize-y p-3 text-sm leading-relaxed text-[var(--text)] placeholder:text-[var(--text-faint)]"
        placeholder="Your words, nobody else's."
      />
    </div>
  )
}

/**
 * One story slot.
 *
 * The prompts are the content; the prose is the user's. Nothing here suggests
 * an achievement, because a behavioural round is lost the moment you are asked
 * for a detail of a story you did not live.
 *
 * The draft saves on every keystroke. There is no Save button, and that is
 * deliberate: a drafting pad you can lose by navigating away is worse than no
 * drafting pad, and a Save button is one more thing to forget to press.
 */
function StoryCard({ story }: { story: StorySlot }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const hydrated = useStoriesHydrated()
  const stored = useStories((s) => s.drafts[story.id])
  const clearStory = useStories((s) => s.clearStory)

  const draft: StoryDraft = hydrated && stored ? { ...EMPTY_DRAFT, ...stored } : EMPTY_DRAFT
  const filled = hydrated ? filledFields(stored) : 0
  const principles = principlesOf(story)

  return (
    <li
      className="panel flex min-w-0 flex-col gap-3 rounded-[var(--radius)] p-4"
      data-story-id={story.id}
      data-drafted={filled > 0 ? 'true' : 'false'}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <h4 className="min-w-0 font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
          {story.title}
        </h4>
        <p className="min-w-0 text-sm text-[var(--text-muted)]">
          <ContentProse text={story.source} />
        </p>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {principles.map((p) => (
            <Pill key={p.id} tone={filled > 0 ? 'accent' : 'muted'}>
              {COMPANY_LABEL[p.company]} &middot; {p.name}
            </Pill>
          ))}
        </div>
      </div>

      <Meter label="STAR fields written" done={filled} target={STAR_FIELDS.length} />

      <div className="flex min-w-0 flex-col gap-3 border-t border-[var(--panel-border)] pt-2">
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
            {open ? 'Close the draft' : filled > 0 ? 'Continue this draft' : 'Draft this story'}
          </span>
        </button>

        {open ? (
          <div id={panelId} className="flex min-w-0 flex-col gap-4">
            {STAR_FIELDS.map((field) => (
              <StarBox
                key={field}
                storyId={story.id}
                field={field}
                prompt={story.prompts[field]}
                value={draft[field]}
                disabled={!hydrated}
              />
            ))}

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="readout text-[var(--text-faint)]">Saved as you type</span>
              {filled > 0 ? (
                <button
                  type="button"
                  onClick={() => clearStory(story.id)}
                  className="readout flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--panel-border)] px-3 text-[var(--text-muted)] transition-colors hover:border-[var(--warning)] hover:text-[var(--text)]"
                >
                  Clear this draft
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </li>
  )
}

/** The stories tab: fifteen reusable slots, each a drafting pad rather than an answer. */
export default function BehaviouralStories() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="max-w-[70ch] text-sm text-[var(--text-muted)]">
        Fifteen slots, keyed to the six build projects and to your startup work. Each one is a set
        of questions, not an answer &mdash; write the story in your own words and it is yours in
        every loop, at every company, for the rest of your career.
      </p>
      <ul className="grid min-w-0 grid-cols-1 gap-4">
        {content.storySlots.map((s) => (
          <StoryCard key={s.id} story={s} />
        ))}
      </ul>
    </div>
  )
}
