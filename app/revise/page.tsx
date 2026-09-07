import Link from 'next/link'
import { DeckPicker } from '@/components/ReviseDeck'
import { deckSummaries } from './decks'

export const metadata = { title: 'Revise | AI Engineer Practice Guide' }

/**
 * The deck picker (spec 6.7b).
 *
 * The `h1` and every deck link are server-rendered, so the page is a usable
 * index of the whole bank with JavaScript switched off. Only the two counts
 * need the browser, because only the browser can read localStorage.
 */
export default function RevisePage() {
  const cards = deckSummaries.reduce((n, d) => n + d.cardIds.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1>Revise</h1>
        <p className="text-sm text-[var(--text-muted)]">
          The night before. Answers, not exercises — {deckSummaries.length} decks and {cards} cards,
          flipped one at a time. Space reveals, arrow keys move, swipe on a phone. Nothing here is
          ticked off: marking a card only decides whether it comes back on the second pass.
        </p>
        <Link
          href="/revise/sheets"
          className="readout w-fit text-[var(--accent)] underline underline-offset-4"
        >
          Cheat sheets — the numbers and formulas you blank on
        </Link>
      </div>

      <DeckPicker decks={deckSummaries} />
    </div>
  )
}
