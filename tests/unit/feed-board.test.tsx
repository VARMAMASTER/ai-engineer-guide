import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeedBoard from '@/components/FeedBoard'
import type { FeedItem } from '@/lib/feed/types'

/**
 * The Feed board's region filter, driven by a stubbed `/api/feed/*`.
 *
 * The fixture deliberately mixes the four shapes the board has to survive at
 * once: a global item with an image, an Indian item with an image, an Indian
 * item with NO image (MediaNama ships plenty of those), and the text-only
 * arXiv/HN side that has never had one.
 */

const newsItems: FeedItem[] = [
  {
    id: 'ars-1',
    title: 'A global story with a picture',
    url: 'https://arstechnica.com/a/',
    source: 'ars',
    region: 'global',
    date: '2026-09-13',
    published: '2026-09-13T10:00:00.000Z',
    image: 'https://cdn.arstechnica.net/a.jpg',
  },
  {
    id: 'ie-1',
    title: 'An Indian Express story with a picture',
    url: 'https://indianexpress.com/article/technology/artificial-intelligence/a/',
    source: 'indianexpress',
    region: 'india',
    date: '2026-09-13',
    published: '2026-09-13T09:00:00.000Z',
    image: 'https://images.indianexpress.com/a.jpg',
  },
  {
    id: 'mn-1',
    title: 'RBI Innovation Hub is building a payments risk platform',
    url: 'https://www.medianama.com/2026/09/223-rbi/',
    source: 'medianama',
    region: 'india',
    date: '2026-09-13',
    published: '2026-09-13T08:00:00.000Z',
  },
]

const arxivItems: FeedItem[] = [
  {
    id: 'arxiv-1',
    title: 'A paper with no image, as papers go',
    url: 'http://arxiv.org/abs/2609.00001v1',
    source: 'arxiv',
    region: 'global',
    date: '2026-09-12',
  },
]

function stubFeeds() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const items = url.includes('news') ? newsItems : url.includes('arxiv') ? arxivItems : []
      return new Response(JSON.stringify({ items, fetchedAt: '2026-09-13T12:00:00.000Z' }), {
        status: 200,
      })
    }),
  )
}

const regionGroup = () => screen.getByRole('group', { name: 'Region' })
const sourceGroup = () => screen.getByRole('group', { name: 'Source' })
const chip = (group: HTMLElement, name: RegExp) => within(group).getByRole('button', { name })

beforeEach(stubFeeds)
afterEach(() => vi.unstubAllGlobals())

describe('FeedBoard region filter', () => {
  it('defaults to all regions, with everything on the board', async () => {
    render(<FeedBoard />)
    expect(await screen.findByText('A global story with a picture')).toBeDefined()
    expect(chip(regionGroup(), /all regions/i).getAttribute('aria-pressed')).toBe('true')
    expect(chip(regionGroup(), /global/i).getAttribute('aria-pressed')).toBe('false')
    expect(chip(regionGroup(), /india/i).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText(/An Indian Express story/)).toBeDefined()
    expect(screen.getByText(/RBI Innovation Hub/)).toBeDefined()
    expect(screen.getByText(/A paper with no image/)).toBeDefined()
  })

  it('narrows to the Indian publishers, and drops the global ones', async () => {
    render(<FeedBoard />)
    await screen.findByText('A global story with a picture')

    await userEvent.click(chip(regionGroup(), /^india/i))

    expect(chip(regionGroup(), /^india/i).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/An Indian Express story/)).toBeDefined()
    expect(screen.getByText(/RBI Innovation Hub/)).toBeDefined()
    expect(screen.queryByText('A global story with a picture')).toBeNull()
    expect(screen.queryByText(/A paper with no image/)).toBeNull()
  })

  it('narrows to the global publishers, and drops the Indian ones', async () => {
    render(<FeedBoard />)
    await screen.findByText('A global story with a picture')

    await userEvent.click(chip(regionGroup(), /^global/i))

    expect(screen.getByText('A global story with a picture')).toBeDefined()
    expect(screen.getByText(/A paper with no image/)).toBeDefined()
    expect(screen.queryByText(/An Indian Express story/)).toBeNull()
    expect(screen.queryByText(/RBI Innovation Hub/)).toBeNull()
  })

  it('renders an Indian item with no image as a text card, not a broken frame', async () => {
    render(<FeedBoard />)
    await screen.findByText('A global story with a picture')

    const imageless = screen.getByText(/RBI Innovation Hub/).closest('a')
    expect(imageless).not.toBeNull()
    expect(imageless!.querySelector('img')).toBeNull()

    // The item that does have one still gets a real <img>, so the absence
    // above is the feed's doing and not the board refusing to render images.
    const withImage = screen.getByText(/An Indian Express story/).closest('a')
    expect(withImage!.querySelector('img')).not.toBeNull()
  })

  it('counts sources within the chosen region', async () => {
    render(<FeedBoard />)
    await screen.findByText('A global story with a picture')

    // Everything = 4 across both regions, 2 once India is picked.
    expect(chip(sourceGroup(), /everything/i).textContent).toContain('4')
    await userEvent.click(chip(regionGroup(), /^india/i))
    expect(chip(sourceGroup(), /everything/i).textContent).toContain('2')
    expect(chip(sourceGroup(), /ars technica/i).textContent).toContain('0')
    expect(chip(sourceGroup(), /medianama/i).textContent).toContain('1')
  })

  it('drops a source selection the new region cannot contain', async () => {
    render(<FeedBoard />)
    await screen.findByText('A global story with a picture')

    await userEvent.click(chip(sourceGroup(), /ars technica/i))
    expect(chip(sourceGroup(), /ars technica/i).getAttribute('aria-pressed')).toBe('true')

    await userEvent.click(chip(regionGroup(), /^india/i))

    // Ars is not an Indian publisher, so the board falls back to every Indian
    // source rather than showing a blank page with two chips lit.
    expect(chip(sourceGroup(), /ars technica/i).getAttribute('aria-pressed')).toBe('false')
    expect(chip(sourceGroup(), /everything/i).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/RBI Innovation Hub/)).toBeDefined()
  })

  it('keeps a source selection the new region does contain', async () => {
    render(<FeedBoard />)
    await screen.findByText('A global story with a picture')

    await userEvent.click(chip(sourceGroup(), /medianama/i))
    await userEvent.click(chip(regionGroup(), /^india/i))

    expect(chip(sourceGroup(), /medianama/i).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/RBI Innovation Hub/)).toBeDefined()
    expect(screen.queryByText(/An Indian Express story/)).toBeNull()
  })

  it('uses the shared Chip primitive: every filter is a pressable button', async () => {
    render(<FeedBoard />)
    await screen.findByText('A global story with a picture')

    for (const group of [regionGroup(), sourceGroup()]) {
      const buttons = within(group).getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      for (const b of buttons) {
        expect(b.tagName).toBe('BUTTON')
        expect(b.getAttribute('type')).toBe('button')
        expect(b.className).toContain('chip')
        expect(b.getAttribute('aria-pressed')).toMatch(/^(true|false)$/)
        // aria-pressed and data-active are set from the same value.
        expect(b.getAttribute('data-active')).toBe(b.getAttribute('aria-pressed'))
      }
    }
  })
})
