import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReadingTabs from '@/components/ReadingTabs'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
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
})
