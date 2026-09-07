import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LldIndex, { lldSlug } from '@/components/LldIndex'
import { LldPatternDetail, LldProblemDetail } from '@/components/LldDetail'
import LldSlugPage, { generateStaticParams, generateMetadata } from '@/app/lld/[slug]/page'
import { lldPatterns, lldQuestions } from '@/content/lld'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

/**
 * Mermaid is mocked for the same reason `mermaid.test.tsx` mocks it: the real
 * library needs `SVGElement.getBBox`, which jsdom does not implement. The
 * contract this file cares about is that the diagram is not on the page until
 * the reader asks for it, which is observable without rendering an SVG.
 */
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    parse: vi.fn(async () => true),
    render: vi.fn(async (id: string) => ({ svg: `<svg data-id="${id}" />` })),
  },
}))

const PARKING_LOT = lldQuestions.find((q) => q.id === 'lldq-parking-lot')!
const SOLID = lldPatterns.find((p) => p.id === 'lldp-solid')!

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('lldSlug', () => {
  it('strips both bank prefixes and leaves the tail alone', () => {
    expect(lldSlug('lldp-solid')).toBe('solid')
    expect(lldSlug('lldq-parking-lot')).toBe('parking-lot')
    expect(lldSlug('lldq-snake-and-ladder')).toBe('snake-and-ladder')
  })
})

describe('LLD index', () => {
  it('shows a Patterns group and a Machine coding group, one link per item', () => {
    render(<LldIndex />)
    expect(screen.getByRole('heading', { name: 'Patterns' })).toBeDefined()
    expect(screen.getByRole('heading', { name: /machine coding problems/i })).toBeDefined()
    expect(screen.getAllByRole('link')).toHaveLength(lldPatterns.length + lldQuestions.length)
    expect(lldPatterns).toHaveLength(8)
    expect(lldQuestions).toHaveLength(25)
  })

  it('links each card at the prefix-stripped slug', () => {
    render(<LldIndex />)
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/lld/solid')
    expect(hrefs).toContain('/lld/parking-lot')
    expect(hrefs.every((h) => h !== null && !h.includes('lldp-') && !h.includes('lldq-'))).toBe(true)
  })

  it('counts solved problems into the Solved meter', () => {
    useProgress.setState({ completed: { 'lldq-parking-lot': '2026-09-06' } })
    render(<LldIndex />)
    const meter = screen.getByRole('progressbar', { name: 'Solved' })
    expect(meter.getAttribute('aria-valuenow')).toBe('1')
    expect(meter.getAttribute('aria-valuemax')).toBe(String(lldQuestions.length))
  })

  it('gives every pattern card a meter over the problems that exercise it', () => {
    render(<LldIndex />)
    const bars = screen.getAllByRole('progressbar', { name: 'Problems' })
    expect(bars).toHaveLength(lldPatterns.length)
    // No pattern is orphaned: each is referenced by at least one problem.
    expect(bars.every((b) => Number(b.getAttribute('aria-valuemax')) > 0)).toBe(true)
  })
})

describe('LLD problem page', () => {
  it('leads with the statement and the clarifying questions', () => {
    render(<LldProblemDetail question={PARKING_LOT} />)
    expect(screen.getByText(PARKING_LOT.statement)).toBeDefined()
    for (const ask of PARKING_LOT.clarify) expect(screen.getByText(ask)).toBeDefined()
  })

  it('hides entities, the diagram and the solution until they are revealed', () => {
    render(<LldProblemDetail question={PARKING_LOT} />)
    expect(screen.queryByText(PARKING_LOT.entities[0])).toBeNull()
    expect(screen.queryByTestId('mermaid')).toBeNull()
    expect(screen.queryByLabelText(/reference solution, Python/i)).toBeNull()

    for (const name of [/entities/i, /class diagram/i, /reference solution/i]) {
      expect(screen.getByRole('button', { name }).getAttribute('aria-expanded')).toBe('false')
    }
  })

  it('reveals the Python solution only after its own button is clicked', async () => {
    render(<LldProblemDetail question={PARKING_LOT} />)
    const button = screen.getByRole('button', { name: /reference solution/i })
    await userEvent.click(button)

    expect(button.getAttribute('aria-expanded')).toBe('true')
    const code = screen.getByLabelText(/reference solution, Python/i)
    expect(code.className).toContain('code-block')
    expect(code.textContent).toContain('class ParkingLot')
    // The other two reveals are independent — one hint does not hand over the rest.
    expect(screen.queryByText(PARKING_LOT.entities[0])).toBeNull()
  })

  it('mounts the class diagram only on reveal', async () => {
    render(<LldProblemDetail question={PARKING_LOT} />)
    await userEvent.click(screen.getByRole('button', { name: /class diagram/i }))
    const figure = await screen.findByTestId('mermaid')
    expect(figure.className).toContain('overflow-x-auto')
    expect(figure.className).toContain('surface-solid')
  })

  it('shows extensions and links every pattern it exercises', () => {
    render(<LldProblemDetail question={PARKING_LOT} />)
    for (const ext of PARKING_LOT.extensions) expect(screen.getByText(ext)).toBeDefined()
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    for (const id of PARKING_LOT.patterns) expect(hrefs).toContain(`/lld/${lldSlug(id)}`)
  })

  it('records completion against the question id', async () => {
    render(<LldProblemDetail question={PARKING_LOT} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(useProgress.getState().completed['lldq-parking-lot']).toBeTruthy()
  })
})

describe('LLD pattern page', () => {
  it('gives when-it-is-wrong its own prominent block, not a footnote', () => {
    render(<LldPatternDetail pattern={SOLID} />)
    const block = screen.getByTestId('when-wrong')
    expect(block.textContent).toContain(SOLID.whenWrong)
    expect(screen.getByRole('heading', { name: /when this is the wrong choice/i })).toBeDefined()
  })

  it('renders the Python example in a solid scrolling code block', () => {
    render(<LldPatternDetail pattern={SOLID} />)
    const code = screen.getByLabelText(/example, Python/i)
    expect(code.className).toContain('code-block')
    expect(code.textContent).toContain(SOLID.example.slice(0, 40))
  })

  it('lists pitfalls and links the problems that exercise it', () => {
    render(<LldPatternDetail pattern={SOLID} />)
    for (const p of SOLID.pitfalls) expect(screen.getByText(p)).toBeDefined()
    const exercised = lldQuestions.filter((q) => q.patterns.includes(SOLID.id))
    expect(exercised.length).toBeGreaterThan(0)
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    for (const q of exercised) expect(hrefs).toContain(`/lld/${lldSlug(q.id)}`)
  })

  it('draws the structure diagram only for the patterns that carry one', () => {
    const { unmount } = render(<LldPatternDetail pattern={SOLID} />)
    expect(SOLID.diagram).toBeUndefined()
    expect(screen.queryByTestId('mermaid')).toBeNull()
    unmount()

    const withDiagram = lldPatterns.find((p) => p.diagram !== undefined)!
    render(<LldPatternDetail pattern={withDiagram} />)
    expect(screen.getByTestId('mermaid')).toBeDefined()
  })
})

describe('/lld/[slug] routing', () => {
  it('covers all 33 items in generateStaticParams', () => {
    const params = generateStaticParams()
    expect(params).toHaveLength(33)
    expect(params).toContainEqual({ slug: 'solid' })
    expect(params).toContainEqual({ slug: 'parking-lot' })
    expect(new Set(params.map((p) => p.slug)).size).toBe(33)
  })

  it('generates exactly the slugs the index links to', () => {
    // The page cannot import `lldSlug` (it lives in a `'use client'` module and
    // the server cannot call it), so the two copies of the rule are pinned to
    // each other here instead.
    const generated = generateStaticParams().map((p) => p.slug).sort()
    const linked = [...lldPatterns, ...lldQuestions].map((i) => lldSlug(i.id)).sort()
    expect(generated).toEqual(linked)
  })

  it('serves a pattern and a problem from the one segment', async () => {
    render(await LldSlugPage({ params: Promise.resolve({ slug: 'solid' }) }))
    expect(screen.getByRole('heading', { level: 1, name: SOLID.name })).toBeDefined()
    expect(screen.getByText('LLD pattern')).toBeDefined()

    screen.getByRole('heading', { level: 1 }).remove()
    render(await LldSlugPage({ params: Promise.resolve({ slug: 'parking-lot' }) }))
    expect(screen.getByRole('heading', { level: 1, name: PARKING_LOT.name })).toBeDefined()
    expect(screen.getByText('Machine coding')).toBeDefined()
  })

  it('titles each page after its item', async () => {
    const pattern = await generateMetadata({ params: Promise.resolve({ slug: 'solid' }) })
    expect(pattern.title).toBe('SOLID Principles | LLD | AI Engineer Practice Guide')
    const problem = await generateMetadata({ params: Promise.resolve({ slug: 'parking-lot' }) })
    expect(problem.title).toBe('Parking Lot | LLD | AI Engineer Practice Guide')
  })

  it('404s an unknown slug rather than rendering an empty page', async () => {
    await expect(
      LldSlugPage({ params: Promise.resolve({ slug: 'no-such-thing' }) }),
    ).rejects.toThrow()
    // A prefixed slug is not a valid URL for either bank.
    await expect(
      LldSlugPage({ params: Promise.resolve({ slug: 'lldp-solid' }) }),
    ).rejects.toThrow()
  })
})
