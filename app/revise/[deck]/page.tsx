import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReviseDeck from '@/components/ReviseDeck'
import { decks, findDeck } from '../decks'

export async function generateStaticParams() {
  return decks.map((d) => ({ deck: d.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ deck: string }> }) {
  const { deck: slug } = await params
  const deck = findDeck(slug)
  return { title: deck ? `${deck.title} — Revise | AI Engineer Practice Guide` : 'Revise' }
}

/**
 * One deck (spec 6.7b). The heading and the deck's subtitle are server markup;
 * the runner below them is the only client code on the route.
 */
export default async function ReviseDeckPage({ params }: { params: Promise<{ deck: string }> }) {
  const { deck: slug } = await params
  const deck = findDeck(slug)
  if (!deck) notFound()

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-1">
        <Link href="/revise" className="eyebrow w-fit hover:text-[var(--accent)]">
          Revise
        </Link>
        <h1 className="break-words">{deck.title}</h1>
        <p className="text-sm break-words text-[var(--text-muted)]">{deck.subtitle}</p>
      </div>

      <ReviseDeck deck={deck} />
    </div>
  )
}
