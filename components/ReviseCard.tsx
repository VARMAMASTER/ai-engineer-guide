import Link from 'next/link'
import type { CardSection, ReviseCard as Card } from '@/app/revise/decks'

/**
 * One flashcard: prompt on the front, the answer behind a reveal.
 *
 * The answer uses the `hidden` attribute rather than a CSS class, so an
 * unrevealed answer is out of the accessibility tree entirely — a screen
 * reader walking the page hears the prompt and the reveal control, not the
 * answer it is meant to be hiding. The control carries `aria-expanded` and
 * points at the panel it owns, which is the same contract a disclosure has.
 *
 * Purely presentational: it owns no state, no keyboard handling and no
 * confidence. `ReviseDeck` drives it.
 */

function SectionBody({ section }: { section: CardSection }) {
  if (section.code !== undefined) {
    return (
      <pre className="code-block whitespace-pre">
        <code>{section.code}</code>
      </pre>
    )
  }
  if (section.items) {
    return (
      <ul className="flex list-none flex-col gap-2 pl-0">
        {section.items.map((item) => (
          <li key={item} className="flex min-w-0 gap-2 text-sm">
            <span aria-hidden="true" className="mt-[0.45em] size-1 shrink-0 rounded-full bg-[var(--accent)]" />
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
    )
  }
  return <p className="text-sm break-words">{section.text}</p>
}

export default function ReviseCard({
  card,
  revealed,
  onToggle,
  answerId = 'revise-answer',
}: {
  card: Card
  revealed: boolean
  onToggle: () => void
  answerId?: string
}) {
  return (
    <article className="panel flex min-w-0 flex-col gap-4 p-4 md:p-6" data-testid="revise-card">
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="break-words">{card.front}</h2>
        {card.frontMeta ? (
          <p className="text-sm break-words text-[var(--text-muted)]">{card.frontMeta}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={revealed}
        aria-controls={answerId}
        data-testid="revise-reveal"
        className="flex min-h-11 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--accent-soft)] px-3 py-2.5 text-sm font-medium text-[var(--accent)]"
      >
        {revealed ? 'Hide answer' : 'Reveal answer'}
      </button>

      <div
        id={answerId}
        hidden={!revealed}
        data-testid="revise-answer"
        className="flex min-w-0 flex-col gap-4"
      >
        {card.sections.map((section) => (
          <div key={section.label} className="surface-solid flex min-w-0 flex-col gap-2 p-3">
            <p className="eyebrow">{section.label}</p>
            <SectionBody section={section} />
          </div>
        ))}

        {card.href ? (
          card.href.startsWith('http') ? (
            <a
              href={card.href}
              target="_blank"
              rel="noreferrer"
              className="readout text-[var(--accent)] underline underline-offset-4"
            >
              {card.hrefLabel ?? 'Open'}
            </a>
          ) : (
            <Link
              href={card.href}
              className="readout text-[var(--accent)] underline underline-offset-4"
            >
              {card.hrefLabel ?? 'Open'}
            </Link>
          )
        ) : null}
      </div>
    </article>
  )
}
