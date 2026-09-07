import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import CompanyIndex, {
  companySlug,
  formatMinutes,
  loopMinutes,
  loopRoundCount,
} from '@/components/CompanyIndex'
import CompanyDetail from '@/components/CompanyDetail'
import ContentProse from '@/components/ContentProse'
import CompaniesPage from '@/app/companies/page'
import CompanyPage, {
  generateStaticParams,
  generateMetadata,
} from '@/app/companies/[slug]/page'
import { companyGuides } from '@/content/companies'
import { content, byId } from '@/lib/content/index'

const AMAZON = companyGuides.find((g) => g.id === 'co-amazon')!
const ANTHROPIC = companyGuides.find((g) => g.id === 'co-anthropic')!

describe('registration', () => {
  it('puts all six guides on `content` and in `byId`', () => {
    expect(content.companyGuides).toHaveLength(6)
    for (const g of companyGuides) expect(byId.get(g.id)).toBeDefined()
  })

  it('gives every guide a distinct order, 1 through 6', () => {
    const orders = companyGuides.map((g) => g.order).sort((a, b) => a - b)
    expect(orders).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('loop arithmetic', () => {
  it('counts repeated rounds once each and their minutes every time', () => {
    expect(loopRoundCount(AMAZON)).toBe(AMAZON.rounds.reduce((n, r) => n + r.count, 0))
    expect(loopMinutes(AMAZON)).toBe(
      AMAZON.rounds.reduce((n, r) => n + r.count * r.minutes, 0),
    )
  })

  it('formats a total as hours and minutes', () => {
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(450)).toBe('7h 30m')
  })
})

describe('the companies index', () => {
  it('renders one h1 and one card per guide, in `order`', () => {
    render(CompaniesPage())
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(6)
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/companies/amazon',
      '/companies/microsoft',
      '/companies/google',
      '/companies/meta',
      '/companies/openai',
      '/companies/anthropic',
    ])
  })

  it('prints the realism rank on every card', () => {
    render(<CompanyIndex />)
    for (const g of companyGuides) {
      const card = screen.getByRole('link', { name: new RegExp(`^${g.name}`) })
      expect(within(card).getByText(`#${g.order}`)).toBeDefined()
    }
  })

  it('teases the market note on the card, so the ranking is justified before you click', () => {
    render(<CompanyIndex />)
    const card = screen.getByRole('link', { name: /^Anthropic/ })
    expect(within(card).getByText(ANTHROPIC.marketNote)).toBeDefined()
  })
})

describe('the companies route', () => {
  it('prerenders all six slugs', () => {
    expect(generateStaticParams()).toEqual([
      { slug: 'amazon' },
      { slug: 'microsoft' },
      { slug: 'google' },
      { slug: 'meta' },
      { slug: 'openai' },
      { slug: 'anthropic' },
    ])
  })

  it('agrees with the slug helper the index links with', () => {
    expect(generateStaticParams().map((p) => p.slug)).toEqual(companyGuides.map((g) => companySlug(g.id)))
    expect(companySlug('co-amazon')).toBe('amazon')
    expect(companySlug('co-openai')).toBe('openai')
  })

  it('awaits its params and renders the named guide', async () => {
    render(await CompanyPage({ params: Promise.resolve({ slug: 'amazon' }) }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Amazon')
  })

  it('titles each detail page after its company', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: 'meta' }) })
    expect(meta.title).toBe('Meta | Companies | AI Engineer Practice Guide')
  })

  it('calls notFound() for a slug that is not a guide', async () => {
    await expect(
      CompanyPage({ params: Promise.resolve({ slug: 'netflix' }) }),
    ).rejects.toThrow()
  })
})

describe('a company detail page', () => {
  it('renders the level, every round, the failure modes and the market note', () => {
    render(<CompanyDetail guide={AMAZON} />)

    expect(screen.getByText(AMAZON.level)).toBeDefined()

    const rows = screen.getAllByRole('row')
    // One header row plus one row per distinct round.
    expect(rows).toHaveLength(AMAZON.rounds.length + 1)
    for (const r of AMAZON.rounds) {
      expect(screen.getByRole('rowheader', { name: r.name })).toBeDefined()
      expect(screen.getByText(r.what)).toBeDefined()
    }

    for (const f of AMAZON.failsOn) expect(screen.getByText(f)).toBeDefined()
    expect(within(screen.getByTestId('market-note')).getByText(AMAZON.marketNote)).toBeDefined()
  })

  it('gives the market note its own panel rather than burying it in a list', () => {
    render(<CompanyDetail guide={ANTHROPIC} />)
    const note = screen.getByTestId('market-note')
    expect(note.textContent).toContain('no meaningful engineering presence in India')
  })

  it('sums the loop into the header', () => {
    render(<CompanyDetail guide={AMAZON} />)
    expect(screen.getByText(`${loopRoundCount(AMAZON)} interviews`)).toBeDefined()
    expect(screen.getByText(`${formatMinutes(loopMinutes(AMAZON))} in the room`)).toBeDefined()
  })
})

describe('drill lines', () => {
  it('links a pattern id to its page and prints the pattern name', () => {
    render(<ContentProse text="Timed reps on dsap-graphs and dsap-dp-1d under a clock." />)
    const graphs = screen.getByRole('link', { name: 'Graphs' })
    expect(graphs.getAttribute('href')).toBe('/dsa/graphs')
    expect(graphs.getAttribute('title')).toBe('dsap-graphs')
    expect(screen.getByRole('link', { name: '1-D Dynamic Programming' }).getAttribute('href')).toBe(
      '/dsa/dp-1d',
    )
  })

  it('routes each bank at the segment that actually renders it', () => {
    render(
      <ContentProse text="sdp-caching, mlp-rag-systems, topic-inference and lldq-rate-limiter." />,
    )
    const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href')
    expect(href('Caching')).toBe('/system-design/caching')
    expect(href('RAG Systems')).toBe('/system-design/rag-systems')
    expect(href('LLM Inference & Serving')).toBe('/ai-ml/inference')
    expect(href('Rate Limiter')).toBe('/lld/rate-limiter')
  })

  it('leaves prose that is not an id alone, including a wildcard', () => {
    render(<ContentProse text="reserve mlp-* topics for an ML-titled req" />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByText('reserve mlp-* topics for an ML-titled req')).toBeDefined()
  })

  it('leaves an id that resolves to nothing exactly as written', () => {
    render(<ContentProse text="drill dsap-does-not-exist twice" />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByText('drill dsap-does-not-exist twice')).toBeDefined()
  })

  it('every id named in every guide resolves to a real page', () => {
    const ID = /\b(dsap|lldp|lldq|sdp|mlp|topic)-[a-z0-9]+(?:-[a-z0-9]+)*/g
    const seen: string[] = []
    for (const g of companyGuides) {
      for (const line of g.drill) {
        for (const m of line.matchAll(ID)) seen.push(m[0])
      }
    }
    expect(seen.length).toBeGreaterThan(20)
    for (const id of seen) expect(byId.get(id), `${id} should resolve`).toBeDefined()
  })
})
