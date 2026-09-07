import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReadingTabs from '@/components/ReadingTabs'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

/**
 * Mermaid itself is mocked exactly as in mermaid.test.tsx: the point here is
 * not mermaid's rendering (covered there) but that ReadingTabs never touches
 * the module until a reading with a diagram is actually expanded.
 */
const mermaid = vi.hoisted(() => {
  const initialize = vi.fn()
  const parse = vi.fn(async () => true)
  const render = vi.fn(async (id: string) => ({ svg: `<svg data-id="${id}"><g /></svg>` }))
  return { initialize, parse, render }
})
vi.mock('mermaid', () => ({ default: mermaid }))

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
  vi.clearAllMocks()
})
afterEach(() => vi.unstubAllGlobals())

describe('Reading', () => {
  it('opens on the curated tab grouped by week', () => {
    render(<ReadingTabs />)
    expect(screen.getByRole('tab', { name: /curated/i })).toHaveProperty('ariaSelected', 'true')
    // Word boundary matters here: plain /week 1/i also matches "Week 10".."Week 19"
    // as a substring, and every week 1-26 has at least one reading.
    expect(screen.getByText(/week 1\b/i)).toBeDefined()
    // "Retrieval-Augmented Generation" alone also matches the later LightRAG
    // reading's title, so anchor on the full, unique title of the 2020 paper.
    expect(screen.getByText(/Knowledge-Intensive NLP Tasks/i)).toBeDefined()
  })

  it('toggles a reading', async () => {
    render(<ReadingTabs />)
    const boxes = screen.getAllByRole('checkbox')
    await userEvent.click(boxes[0])
    expect(Object.keys(useProgress.getState().completed).length).toBe(1)
  })

  it('shows live items when both feeds respond', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      new Response(JSON.stringify({
        items: [{ id: '1', title: url.includes('arxiv') ? 'A paper' : 'A story', url: 'https://x.test', source: url.includes('arxiv') ? 'arxiv' : 'hn', date: '2026-09-05' }],
        fetchedAt: '2026-09-06T00:00:00Z',
      }), { status: 200 })))

    render(<ReadingTabs />)
    await userEvent.click(screen.getByRole('tab', { name: /live/i }))
    expect(await screen.findByText('A paper')).toBeDefined()
    expect(await screen.findByText('A story')).toBeDefined()
  })

  it('shows an empty state when a feed fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ items: [], error: 'unavailable', fetchedAt: '2026-09-06T00:00:00Z' }), { status: 200 })))

    render(<ReadingTabs />)
    await userEvent.click(screen.getByRole('tab', { name: /live/i }))
    expect(await screen.findAllByText(/feed unavailable/i)).toHaveLength(2)
  })

  describe('summary expansion', () => {
    it('is collapsed by default and reveals the six labelled fields on click', async () => {
      render(<ReadingTabs />)
      expect(screen.queryByText('Problem')).toBeNull()

      const toggle = screen.getAllByRole('button', { name: /what does it say/i })[0]
      await userEvent.click(toggle)

      expect(screen.getByText('Problem')).toBeDefined()
      expect(screen.getByText('How')).toBeDefined()
      expect(screen.getByText('Result')).toBeDefined()
      expect(screen.getByText('Limits')).toBeDefined()
      expect(screen.getByText(/the idea —/i)).toBeDefined()
      expect(screen.getByText(/so what — for your plan/i)).toBeDefined()

      // Collapses again on a second click.
      await userEvent.click(screen.getByRole('button', { name: /hide summary/i }))
      expect(screen.queryByText('Problem')).toBeNull()
    })

    it('does not tick the checkbox when a summary is expanded', async () => {
      render(<ReadingTabs />)
      const row = screen.getByText(/Knowledge-Intensive NLP Tasks/i).closest('li') as HTMLElement
      const toggle = within(row).getByRole('button', { name: /what does it say/i })

      await userEvent.click(toggle)

      const checkbox = within(row).getByRole('checkbox') as HTMLInputElement
      expect(checkbox.checked).toBe(false)
      expect(Object.keys(useProgress.getState().completed)).toHaveLength(0)
    })

    it('does not load mermaid until a reading with a diagram is expanded, then renders it', async () => {
      render(<ReadingTabs />)
      const row = screen.getByText(/Knowledge-Intensive NLP Tasks/i).closest('li') as HTMLElement

      expect(mermaid.initialize).not.toHaveBeenCalled()
      expect(screen.queryByTestId('mermaid')).toBeNull()

      await userEvent.click(within(row).getByRole('button', { name: /what does it say/i }))

      await waitFor(() => expect(mermaid.initialize).toHaveBeenCalled())
      const box = await screen.findByTestId('mermaid')
      await waitFor(() => expect(box.dataset.mermaidStatus).toBe('ready'))
    })

    it('shows no diagram box for a reading with no diagram field', async () => {
      render(<ReadingTabs />)
      // "Lost in the Middle" is a findings paper, not a mechanism one, so it
      // carries no `diagram` (content/readings.ts).
      const row = screen.getByText(/Lost in the Middle/i).closest('li') as HTMLElement
      await userEvent.click(within(row).getByRole('button', { name: /what does it say/i }))

      expect(within(row).getByText('Problem')).toBeDefined()
      expect(within(row).queryByTestId('mermaid')).toBeNull()
      expect(mermaid.initialize).not.toHaveBeenCalled()
    })
  })
})
