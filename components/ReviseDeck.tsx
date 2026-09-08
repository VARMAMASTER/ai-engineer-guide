'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import ReviseCard from './ReviseCard'
import type { Deck, DeckKind, DeckSummary } from '@/app/revise/decks'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'

/**
 * Revision mode's two client surfaces (spec 6.7b).
 *
 * `ReviseDeck` is the runner: one card at a time, space to reveal, arrows to
 * move, swipe on touch, and two confidence controls after the reveal. There is
 * deliberately no checkbox and no meter here — the position readout is a
 * position, not a score. A second pass filters the deck down to the cards you
 * marked "again".
 *
 * `DeckPicker` is `/revise` itself: every deck with how many cards it holds,
 * how many you have never rated, and how many are waiting on a second pass.
 *
 * Both read `revision` from the progress store and never touch `completed`.
 */

const SWIPE_PX = 48
const SWIPE_SLOP_PX = 80

/**
 * The group headings, duplicated here rather than imported from
 * `app/revise/decks`. That module pulls in the entire content bank; importing a
 * value from it would drag all of it into the client bundle, where two labels
 * and an ordering are the only parts a browser needs.
 */
const KIND_LABEL: Record<DeckKind, string> = {
  'ai-ml': 'AI / ML',
  dsa: 'DSA patterns',
  'system-design': 'System design',
  lld: 'Low-level design',
}

const KIND_ORDER: DeckKind[] = ['ai-ml', 'dsa', 'system-design', 'lld']

/* ========================================================================= */

export default function ReviseDeck({ deck }: { deck: Deck }) {
  const hydrated = useHydrated()
  const revision = useProgress((s) => s.revision)
  const rate = useProgress((s) => s.rate)
  const clearRevision = useProgress((s) => s.clearRevision)

  // `againIds` is snapshotted when the second pass starts. Filtering live would
  // pull the card out from under you the moment you rated it.
  const [againIds, setAgainIds] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const cards = useMemo(
    () => (againIds ? deck.cards.filter((c) => againIds.includes(c.id)) : deck.cards),
    [deck.cards, againIds],
  )

  const total = cards.length
  const finished = index >= total
  const card = finished ? undefined : cards[index]

  const againCount = hydrated
    ? deck.cards.filter((c) => revision[c.id] === 'again').length
    : 0
  const unseenCount = hydrated
    ? deck.cards.filter((c) => !revision[c.id]).length
    : deck.cards.length

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), total))
      setRevealed(false)
    },
    [total],
  )

  const startPass = useCallback((ids: string[] | null) => {
    setAgainIds(ids)
    setIndex(0)
    setRevealed(false)
  }, [])

  const mark = useCallback(
    (rating: 'again' | 'good') => {
      if (!card) return
      rate(card.id, rating)
      go(1)
    },
    [card, go, rate],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        // A focused button or link owns the space bar. Stealing it here would
        // make every control on the page do two things at once.
        if (tag === 'BUTTON' || tag === 'A') return
        e.preventDefault()
        setRevealed((r) => !r)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [go])

  if (total === 0) {
    return (
      <p className="panel p-4 text-sm text-[var(--text-muted)]">This deck has no cards yet.</p>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="revise-deck">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2" role="group" aria-label="Which cards to show">
          <PassButton active={!againIds} onClick={() => startPass(null)}>
            {'All ' + deck.cards.length}
          </PassButton>
          <PassButton
            active={Boolean(againIds)}
            disabled={againCount === 0 && !againIds}
            onClick={() => startPass(deck.cards.filter((c) => revision[c.id] === 'again').map((c) => c.id))}
          >
            {'Again ' + againCount}
          </PassButton>
        </div>
        <span className="readout text-[var(--text-muted)]" data-testid="revise-position">
          {finished ? total + ' / ' + total : index + 1 + ' / ' + total}
        </span>
      </div>

      <div
        aria-hidden="true"
        className="h-0.5 w-full overflow-hidden rounded-full bg-[var(--track)]"
      >
        <div
          className="h-full bg-[var(--accent)]"
          style={{ width: Math.round(((finished ? total : index) / total) * 100) + '%' }}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {finished ? 'End of deck' : 'Card ' + (index + 1) + ' of ' + total}
      </p>

      {finished ? (
        <div className="panel flex flex-col gap-4 p-4 md:p-6" data-testid="revise-finished">
          <h2>End of the deck</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {total + ' cards flipped. ' + againCount + ' marked again, ' + unseenCount + ' never rated.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {againCount > 0 ? (
              <ActionButton
                emphasis
                onClick={() =>
                  startPass(deck.cards.filter((c) => revision[c.id] === 'again').map((c) => c.id))
                }
              >
                {'Second pass (' + againCount + ')'}
              </ActionButton>
            ) : null}
            <ActionButton onClick={() => startPass(null)}>Start over</ActionButton>
            <ActionButton onClick={() => clearRevision(deck.cards.map((c) => c.id))}>
              Forget my marks
            </ActionButton>
          </div>
          <Link
            href="/revise"
            className="readout inline-flex min-h-11 items-center text-[var(--accent)] underline underline-offset-4"
          >
            Back to the decks
          </Link>
        </div>
      ) : (
        <div
          onTouchStart={(e) => {
            const t = e.changedTouches[0]
            touch.current = { x: t.clientX, y: t.clientY }
          }}
          onTouchEnd={(e) => {
            const start = touch.current
            touch.current = null
            if (!start) return
            const t = e.changedTouches[0]
            const dx = t.clientX - start.x
            const dy = t.clientY - start.y
            if (Math.abs(dx) < SWIPE_PX || Math.abs(dy) > SWIPE_SLOP_PX) return
            go(dx < 0 ? 1 : -1)
          }}
        >
          <ReviseCard
            card={card!}
            revealed={revealed}
            onToggle={() => setRevealed((r) => !r)}
            answerId="revise-answer"
          />
        </div>
      )}

      {!finished && revealed ? (
        // Two thumbs-width targets at the bottom of the flow: the whole mode is
        // built for one hand on a phone, so the only controls you need mid-deck
        // sit where a thumb already is.
        <div className="grid grid-cols-2 gap-2" data-testid="revise-confidence">
          <ConfidenceButton tone="again" onClick={() => mark('again')}>
            Again
          </ConfidenceButton>
          <ConfidenceButton tone="good" onClick={() => mark('good')}>
            Good
          </ConfidenceButton>
        </div>
      ) : null}

      {!finished ? (
        <div className="flex items-center justify-between gap-2">
          <ActionButton onClick={() => go(-1)} disabled={index === 0}>
            Previous
          </ActionButton>
          <span className="readout hidden text-[var(--text-faint)] md:inline">
            space reveals · arrows move
          </span>
          <ActionButton onClick={() => go(1)}>Next</ActionButton>
        </div>
      ) : null}
    </div>
  )
}

/* --- small buttons -------------------------------------------------------- */

function PassButton({
  active, disabled, onClick, children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={
        'readout inline-flex min-h-11 items-center rounded-full px-3 py-1.5 ' +
        (active
          ? 'nav-pill'
          : 'border border-[var(--panel-border)] text-[var(--text-muted)] disabled:opacity-45')
      }
    >
      {children}
    </button>
  )
}

function ActionButton({
  onClick, disabled, emphasis, children,
}: {
  onClick: () => void
  disabled?: boolean
  emphasis?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'min-h-11 rounded-[var(--radius-sm)] px-4 text-sm font-medium disabled:opacity-40 ' +
        (emphasis
          ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
          : 'border border-[var(--panel-border)] text-[var(--text)]')
      }
    >
      {children}
    </button>
  )
}

function ConfidenceButton({
  tone, onClick, children,
}: {
  tone: 'again' | 'good'
  onClick: () => void
  children: ReactNode
}) {
  const color = tone === 'again' ? 'var(--warning)' : 'var(--positive)'
  return (
    <button
      type="button"
      onClick={onClick}
      data-rating={tone}
      style={{ color, borderColor: color }}
      className="min-h-14 rounded-[var(--radius)] border text-base font-semibold"
    >
      {children}
    </button>
  )
}

/* ========================================================================= */

export function DeckPicker({ decks }: { decks: DeckSummary[] }) {
  const hydrated = useHydrated()
  const revision = useProgress((s) => s.revision)

  const groups = KIND_ORDER.map((kind: DeckKind) => ({
    kind,
    decks: decks.filter((d) => d.kind === kind),
  })).filter((g) => g.decks.length > 0)

  return (
    <div className="flex flex-col gap-8" data-testid="deck-picker">
      {groups.map((group) => (
        <section key={group.kind} className="flex flex-col gap-3">
          <h2>{KIND_LABEL[group.kind]}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {group.decks.map((deck) => {
              const unseen = hydrated
                ? deck.cardIds.filter((id) => !revision[id]).length
                : deck.cardIds.length
              const again = hydrated
                ? deck.cardIds.filter((id) => revision[id] === 'again').length
                : 0

              return (
                <Link
                  key={deck.slug}
                  href={'/revise/' + deck.slug}
                  data-deck={deck.slug}
                  className="panel card flex min-w-0 flex-col gap-2 p-4"
                >
                  <h3 className="break-words">{deck.title}</h3>
                  <p className="line-clamp-2 text-sm text-[var(--text-muted)]">{deck.subtitle}</p>
                  <p className="readout flex flex-wrap gap-x-3 gap-y-1 text-[var(--text-faint)]">
                    <span>{deck.cardIds.length + ' cards'}</span>
                    <span>{unseen + ' unseen'}</span>
                    {again > 0 ? (
                      <span style={{ color: 'var(--warning)' }}>{again + ' again'}</span>
                    ) : null}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
