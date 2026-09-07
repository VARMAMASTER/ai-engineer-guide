import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviseDeck, { DeckPicker } from '@/components/ReviseDeck'
import ReviseCard from '@/components/ReviseCard'
import CheatSheets from '@/components/CheatSheets'
import { decks, deckSlug, deckSummaries, findDeck } from '@/app/revise/decks'
import type { Deck } from '@/app/revise/decks'
import { content } from '@/lib/content/index'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'
import { migrate } from '@/lib/progress/migrations'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

/** A small hand-built deck, so the interaction tests do not depend on content. */
function fixture(): Deck {
  return {
    slug: 'fixture',
    kind: 'ai-ml',
    title: 'Fixture deck',
    subtitle: 'Three cards',
    cards: [
      { id: 'card-a', front: 'Front A', sections: [{ label: 'Answer', text: 'Back A' }] },
      { id: 'card-b', front: 'Front B', sections: [{ label: 'Answer', text: 'Back B' }] },
      { id: 'card-c', front: 'Front C', sections: [{ label: 'Answer', text: 'Back C' }] },
    ],
  }
}

describe('deck registry', () => {
  it('builds one deck per AI/ML topic, DSA pattern, system design pattern and LLD pattern', () => {
    const expected =
      content.topics.length +
      content.dsaPatterns.length +
      content.sdPatterns.length +
      content.lldPatterns.length
    expect(decks).toHaveLength(expected)
    expect(new Set(decks.map((d) => d.slug)).size).toBe(expected)
  })

  it('slugs a deck as its source id minus the prefix', () => {
    expect(deckSlug('topic-transformers')).toBe('transformers')
    expect(deckSlug('dsap-two-pointers')).toBe('two-pointers')
    expect(deckSlug('sdp-caching')).toBe('caching')
    expect(deckSlug('mlp-rag-systems')).toBe('rag-systems')
    expect(deckSlug('lldp-solid')).toBe('solid')
  })

  it('serves the deck the e2e sweep walks', () => {
    const deck = findDeck('transformers')
    expect(deck).toBeDefined()
    expect(deck!.cards).toHaveLength(
      content.topicQuestions.filter((q) => q.topicId === 'topic-transformers').length,
    )
  })

  it('puts the question on the front and the answer plus key point on the back', () => {
    const deck = findDeck('transformers')!
    const question = content.topicQuestions.find((q) => q.topicId === 'topic-transformers')!
    const card = deck.cards.find((c) => c.id === question.id)!
    expect(card.front).toBe(question.text)
    expect(card.sections.map((s) => s.label)).toEqual(['Answer', 'Key point'])
    expect(card.sections[0].text).toBe(question.answer)
    expect(card.sections[1].text).toBe(question.keyPoint)
  })

  it('leads a DSA deck with the pattern signals and template, then its problems', () => {
    const pattern = content.dsaPatterns.find((p) => p.id === 'dsap-arrays-hashing')!
    const deck = findDeck('arrays-hashing')!
    expect(deck.cards[0].id).toBe(pattern.id)
    expect(deck.cards[0].sections.map((s) => s.label)).toEqual(['Signals', 'Template'])
    expect(deck.cards[0].sections[1].code).toBe(pattern.template)

    const problems = content.dsaProblems.filter((p) => p.patternId === pattern.id)
    expect(deck.cards).toHaveLength(1 + problems.length)
  })

  it('reveals a system design pattern as its trade-offs and an LLD pattern as solves plus whenWrong', () => {
    const sd = content.sdPatterns.find((p) => p.id === 'sdp-caching')!
    expect(findDeck('caching')!.cards[0].sections).toEqual([
      { label: 'Trade-offs', items: sd.tradeoffs },
    ])

    const lld = content.lldPatterns.find((p) => p.id === 'lldp-solid')!
    expect(findDeck('solid')!.cards[0].sections).toEqual([
      { label: 'Solves', text: lld.solves },
      { label: 'When it is the wrong call', text: lld.whenWrong },
    ])
  })

  it('reads optional DSA study fields defensively, and never builds a blank back', () => {
    // `approach`, `solution`, `complexity`, `signal` and `followUps` are optional
    // in the schema and land problem by problem. A missing one must drop its own
    // section, not the card, and must not throw.
    for (const deck of decks) {
      for (const card of deck.cards) {
        expect(card.sections.length).toBeGreaterThan(0)
        for (const section of card.sections) {
          const body = section.text ?? section.code ?? section.items
          expect(body, `${card.id} / ${section.label} has an empty body`).toBeTruthy()
        }
      }
    }
  })

  it('carries a study section for every DSA problem that has one authored', () => {
    const withApproach = content.dsaProblems.filter((p) => p.approach)
    for (const problem of withApproach) {
      const deck = findDeck(deckSlug(problem.patternId))!
      const card = deck.cards.find((c) => c.id === problem.id)!
      expect(card.sections.some((s) => s.label === 'Approach')).toBe(true)
    }
  })

  it('summarises every deck for the picker', () => {
    expect(deckSummaries).toHaveLength(decks.length)
    for (const s of deckSummaries) {
      expect(s.cardIds).toHaveLength(findDeck(s.slug)!.cards.length)
    }
  })
})

describe('ReviseCard', () => {
  it('keeps the answer out of the accessibility tree until it is revealed', async () => {
    const card = fixture().cards[0]
    const { rerender } = render(
      <ReviseCard card={card} revealed={false} onToggle={() => {}} />,
    )
    const toggle = screen.getByRole('button', { name: /reveal answer/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByTestId('revise-answer').hasAttribute('hidden')).toBe(true)

    rerender(<ReviseCard card={card} revealed onToggle={() => {}} />)
    expect(screen.getByTestId('revise-answer').hasAttribute('hidden')).toBe(false)
    expect(screen.getByText('Back A')).toBeDefined()
    expect(screen.getByRole('button', { name: /hide answer/i }).getAttribute('aria-expanded')).toBe('true')
  })
})

describe('ReviseDeck', () => {
  it('shows position in the deck and moves with the next control', async () => {
    render(<ReviseDeck deck={fixture()} />)
    expect(screen.getByTestId('revise-position').textContent).toBe('1 / 3')
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Front A')

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByTestId('revise-position').textContent).toBe('2 / 3')
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Front B')
  })

  it('reveals on space and moves on the arrow keys', async () => {
    render(<ReviseDeck deck={fixture()} />)
    // Focus the document body, the way a page looks before anything is tabbed to.
    document.body.focus()

    await userEvent.keyboard(' ')
    expect(screen.getByTestId('revise-answer').hasAttribute('hidden')).toBe(false)

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByTestId('revise-position').textContent).toBe('2 / 3')
    expect(screen.getByTestId('revise-answer').hasAttribute('hidden')).toBe(true)

    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByTestId('revise-position').textContent).toBe('1 / 3')
  })

  it('leaves the space bar to a focused button rather than stealing it', async () => {
    render(<ReviseDeck deck={fixture()} />)
    const next = screen.getByRole('button', { name: 'Next' })
    next.focus()
    await userEvent.keyboard(' ')

    // The focused control keeps the space bar; the card behind it does not flip.
    expect(screen.getByTestId('revise-answer').hasAttribute('hidden')).toBe(true)
  })

  it('offers the confidence controls only after the reveal', async () => {
    render(<ReviseDeck deck={fixture()} />)
    expect(screen.queryByTestId('revise-confidence')).toBeNull()

    await userEvent.click(screen.getByTestId('revise-reveal'))
    const controls = within(screen.getByTestId('revise-confidence'))
    expect(controls.getByRole('button', { name: 'Again' })).toBeDefined()
    expect(controls.getByRole('button', { name: 'Good' })).toBeDefined()
  })

  it('writes a rating to `revision` and advances, without touching `completed`', async () => {
    render(<ReviseDeck deck={fixture()} />)
    await userEvent.click(screen.getByTestId('revise-reveal'))
    await userEvent.click(screen.getByRole('button', { name: 'Again' }))

    const state = useProgress.getState()
    expect(state.revision['card-a']).toBe('again')
    expect(state.completed['card-a']).toBeUndefined()
    expect(state.completed).toEqual({})
    expect(screen.getByTestId('revise-position').textContent).toBe('2 / 3')
  })

  it('filters a second pass down to the cards marked again', async () => {
    render(<ReviseDeck deck={fixture()} />)

    // A: again, B: good, C: again.
    for (const rating of ['Again', 'Good', 'Again']) {
      await userEvent.click(screen.getByTestId('revise-reveal'))
      await userEvent.click(screen.getByRole('button', { name: rating }))
    }

    expect(screen.getByTestId('revise-finished')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: /second pass \(2\)/i }))

    expect(screen.getByTestId('revise-position').textContent).toBe('1 / 2')
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Front A')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Front C')
  })

  it('has no checkbox and no progressbar anywhere in the runner', async () => {
    render(<ReviseDeck deck={fixture()} />)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0)
  })

  it('forgets the deck’s marks on request, and only this deck’s', async () => {
    useProgress.setState({ revision: { 'card-a': 'again', 'other-card': 'good' } })
    render(<ReviseDeck deck={fixture()} />)
    for (let i = 0; i < 3; i += 1) await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await userEvent.click(screen.getByRole('button', { name: /forget my marks/i }))
    expect(useProgress.getState().revision).toEqual({ 'other-card': 'good' })
  })
})

describe('DeckPicker', () => {
  it('links every deck and counts its cards', () => {
    render(<DeckPicker decks={deckSummaries} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(deckSummaries.length)

    const summary = deckSummaries.find((d) => d.slug === 'transformers')!
    const transformers = document.querySelector('[data-deck="transformers"]')!
    expect(transformers.getAttribute('href')).toBe('/revise/transformers')
    expect(transformers.textContent).toContain(`${summary.cardIds.length} cards`)
  })

  it('counts unseen and again from the revision slice, never from completed', () => {
    const deck = deckSummaries.find((d) => d.slug === 'transformers')!
    useProgress.setState({
      revision: { [deck.cardIds[0]]: 'again', [deck.cardIds[1]]: 'good' },
      completed: Object.fromEntries(deck.cardIds.map((id) => [id, '2026-09-07'])),
    })
    render(<DeckPicker decks={deckSummaries} />)

    const card = document.querySelector('[data-deck="transformers"]')!
    expect(card.textContent).toContain(`${deck.cardIds.length - 2} unseen`)
    expect(card.textContent).toContain('1 again')
  })

  it('groups the decks under the four banks', () => {
    render(<DeckPicker decks={deckSummaries} />)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'AI / ML',
      'DSA patterns',
      'System design',
      'Low-level design',
    ])
  })
})

describe('revision is not completion', () => {
  it('keeps the two under separate keys with incompatible shapes', () => {
    useProgress.getState().rate('q-transformers-why-attention', 'good')
    useProgress.getState().toggle('q-transformers-why-attention')

    const blob = JSON.parse(useProgress.getState().exportBlob())
    expect(blob.revision['q-transformers-why-attention']).toBe('good')
    expect(blob.completed['q-transformers-why-attention']).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Untoggling completion leaves the confidence alone: they are different facts.
    useProgress.getState().toggle('q-transformers-why-attention')
    expect(useProgress.getState().completed).toEqual({})
    expect(useProgress.getState().revision).toEqual({ 'q-transformers-why-attention': 'good' })
  })

  it('migrates a v1 blob by adding an empty revision map, not by copying completed', () => {
    const v1 = {
      version: 1,
      startDate: '2026-09-07',
      completed: { 'dsa-1-two-sum': '2026-09-07' },
      hours: {},
      settings: { theme: 'dark' as const },
    }
    const out = migrate(v1)
    expect(out.version).toBe(2)
    expect(out.revision).toEqual({})
    expect(out.completed).toEqual({ 'dsa-1-two-sum': '2026-09-07' })
  })

  it('rejects a revision map that is not a rating', () => {
    expect(() => migrate({ ...emptyBlob(), revision: { 'card-a': 'maybe' } })).toThrow(/revision/i)
  })
})

describe('CheatSheets', () => {
  it('renders the six sheets the spec names', () => {
    render(<CheatSheets />)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Latency numbers',
      'Complexity by DSA pattern',
      'Model memory maths',
      'Classification and ranking metrics',
      'Transformer parameter counting',
      'Capacity estimation',
    ])
  })

  it('gives every DSA pattern a complexity row, derived from the content', () => {
    const { container } = render(<CheatSheets />)
    const table = container.querySelector('#complexity table')!
    const rows = table.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(content.dsaPatterns.length)
    for (const row of rows) {
      const cells = row.querySelectorAll('td')
      expect(cells[1].textContent).not.toBe('—')
      expect(cells[2].textContent).not.toBe('—')
      expect(cells[3].textContent!.length).toBeGreaterThan(20)
    }
    const names = [...rows].map((r) => r.querySelector('td')!.textContent)
    expect(names).toEqual(
      [...content.dsaPatterns].sort((a, b) => a.order - b.order).map((p) => p.name),
    )
  })

  it('carries the latency numbers people are asked for', () => {
    render(<CheatSheets />)
    expect(screen.getByText('Main memory reference')).toBeDefined()
    expect(screen.getByText('100 ns')).toBeDefined()
    expect(screen.getByText('Round trip in the same datacenter')).toBeDefined()
    expect(screen.getByText('500 us')).toBeDefined()
  })

  it('derives the capacity worked examples from the system design solutions', () => {
    render(<CheatSheets />)
    const first = content.sdQuestions[0]
    expect(screen.getAllByText(first.solution.numbers[0]).length).toBeGreaterThan(0)
  })

  it('ships a print block rather than a second layout', () => {
    const { container } = render(<CheatSheets />)
    const css = container.querySelector('style')!.innerHTML
    expect(css).toContain('@media print')
    expect(css).toContain('@page')
    expect(css).toContain('break-after: page')
  })
})
