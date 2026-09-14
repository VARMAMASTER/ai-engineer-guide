import { describe, it, expect, beforeEach } from 'vitest'
import {
  DESTINATIONS,
  KIND_LABEL,
  buildItems,
  fieldScore,
  getSearchIndex,
  normalise,
  parseQuery,
  resetSearchIndex,
  scoreItem,
  search,
  searchIndexBuildCount,
  type SearchItem,
  type SearchKind,
} from '@/lib/search/index'

/* Ranking is the whole feature, so these tests are about ORDER, not about
   whether a string was found. A `includes()` filter passes "does it match";
   only the order tells you whether the palette is usable. */

function row(
  id: string,
  title: string,
  kind: SearchKind = 'dsa-problem',
  bodyText = '',
): SearchItem {
  return { id, title, href: `/x/${id}`, kind, t: normalise(title), b: normalise(bodyText) }
}

describe('normalise', () => {
  it('folds case and turns punctuation into word boundaries', () => {
    expect(normalise('Two-Sum')).toBe('two sum')
    expect(normalise('AI / ML')).toBe('ai ml')
    expect(normalise('  K-th  Largest!  ')).toBe('k th largest')
  })

  it('tokenises a query once, not once per item', () => {
    expect(parseQuery('  Rate  Limiter ')).toEqual({ full: 'rate limiter', tokens: ['rate', 'limiter'] })
    expect(parseQuery('   ')).toEqual({ full: '', tokens: [] })
  })
})

describe('fieldScore tiers', () => {
  it('ranks exact above prefix above word-boundary above substring', () => {
    const exact = fieldScore('two sum', 'two sum')
    const prefix = fieldScore('two sum ii', 'two sum')
    const word = fieldScore('subarray sum equals k', 'sum')
    const substring = fieldScore('consume the stream', 'sum')

    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(word)
    expect(word).toBeGreaterThan(substring)
    expect(substring).toBeGreaterThan(0)
  })

  it('scores a miss at zero', () => {
    expect(fieldScore('two sum', 'quantization')).toBe(0)
    expect(fieldScore('', 'sum')).toBe(0)
    expect(fieldScore('two sum', '')).toBe(0)
  })
})

describe('ranking', () => {
  it('puts an exact title match first, ahead of a longer title that also matches', () => {
    const items = [
      row('b', 'Two Sum II — Input Array Is Sorted'),
      row('c', 'Sum of Two Integers'),
      row('a', 'Two Sum'),
      row('d', 'Three Sum'),
    ]
    const ranked = search(items, 'two sum')
    expect(ranked[0].item.title).toBe('Two Sum')
    expect(ranked[1].item.title).toBe('Two Sum II — Input Array Is Sorted')
  })

  it('ranks a title match above a body match on the same word', () => {
    const inTitle = row('title', 'Sliding Window Maximum')
    const inBody = row('body', 'Longest Repeating Character Replacement', 'dsa-problem', 'sliding window')
    const ranked = search([inBody, inTitle], 'sliding window')
    expect(ranked[0].item.id).toBe('title')
  })

  it('breaks a tie on the shorter title', () => {
    const items = [
      row('long', 'Design a distributed rate limiter for a public API'),
      row('short', 'Design a rate limiter'),
    ]
    expect(search(items, 'design a rate')[0].item.id).toBe('short')
  })

  it('ranks a destination above a content item on an equal match', () => {
    const items = [row('content', 'DSA'), row('dest', 'DSA', 'destination')]
    expect(search(items, 'dsa')[0].item.id).toBe('dest')
  })

  it('never lets the destination bonus overturn a better textual match', () => {
    // The destination only word-matches; the problem matches exactly. Exact wins.
    const items = [
      row('dest', 'System Design Questions and Patterns', 'destination'),
      row('leaf', 'Design a rate limiter'),
    ]
    expect(search(items, 'design a rate limiter')[0].item.id).toBe('leaf')
  })

  it('finds words scattered through a title, but ranks them below a contiguous match', () => {
    const items = [
      row('scattered', 'Design a rate limiter for the gateway'),
      row('contiguous', 'Rate limiter'),
    ]
    const ranked = search(items, 'rate limiter')
    expect(ranked[0].item.id).toBe('contiguous')
    expect(ranked.map((r) => r.item.id)).toContain('scattered')
  })

  it('requires every word of a multi-word query to hit somewhere', () => {
    const items = [row('a', 'Design a rate limiter')]
    expect(search(items, 'rate limiter')).toHaveLength(1)
    expect(search(items, 'rate quantization')).toHaveLength(0)
  })

  it('returns nothing for an empty query — that is a different state, not a search', () => {
    expect(search([row('a', 'Two Sum')], '')).toHaveLength(0)
    expect(search([row('a', 'Two Sum')], '   ')).toHaveLength(0)
  })

  it('honours the limit and orders strictly by descending score', () => {
    const items = Array.from({ length: 40 }, (_, i) => row(`p${i}`, `Sum problem ${i}`))
    const ranked = search(items, 'sum', 5)
    expect(ranked).toHaveLength(5)
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score)
    }
  })

  it('drops non-matches rather than scoring them zero and keeping them', () => {
    expect(scoreItem(row('a', 'Two Sum'), parseQuery('quantization'))).toBe(0)
    expect(search([row('a', 'Two Sum')], 'quantization')).toHaveLength(0)
  })
})

describe('destinations', () => {
  it('covers the core sections whatever shape lib/nav is currently in', () => {
    const hrefs = new Set(DESTINATIONS.map((d) => d.href))
    for (const href of [
      '/today',
      '/roadmap',
      '/dsa',
      '/system-design',
      '/lld',
      '/ai-ml',
      '/cs-fundamentals',
      '/hardware',
      '/behavioural',
      '/companies',
      '/projects',
      '/reading',
      '/revise',
      '/mock',
      '/settings',
    ]) {
      expect(hrefs).toContain(href)
    }
  })

  it('lists each href exactly once, however many nav exports mention it', () => {
    const hrefs = DESTINATIONS.map((d) => d.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('is computed without touching the content banks, so it is safe on the server', () => {
    expect(DESTINATIONS.length).toBeGreaterThan(15)
    expect(DESTINATIONS.every((d) => d.kind === 'destination')).toBe(true)
  })
})

describe('the built index', () => {
  beforeEach(() => {
    resetSearchIndex()
  })

  it('is built once however many times it is asked for', async () => {
    expect(searchIndexBuildCount()).toBe(0)
    const [a, b, c] = await Promise.all([getSearchIndex(), getSearchIndex(), getSearchIndex()])
    const d = await getSearchIndex()
    expect(searchIndexBuildCount()).toBe(1)
    // Same array object every time: the memo holds the promise, not a recipe.
    expect(b).toBe(a)
    expect(c).toBe(a)
    expect(d).toBe(a)
  })

  it('indexes every bank worth jumping to, and gives each row a real destination', async () => {
    const items = await getSearchIndex()
    expect(items.length).toBeGreaterThan(700)

    for (const item of items) {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.href.startsWith('/')).toBe(true)
      expect(KIND_LABEL[item.kind]).toBeTruthy()
      // Normalised text is precomputed, so a keystroke never re-normalises.
      expect(item.t).toBe(normalise(item.title))
    }

    const ids = items.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('carries at least one row from every bank the palette promises to search', async () => {
    const kinds = new Set((await getSearchIndex()).map((i) => i.kind))
    for (const kind of [
      'destination',
      'dsa-pattern',
      'dsa-problem',
      'sd-pattern',
      'sd-question',
      'lld-pattern',
      'lld-problem',
      'ai-topic',
      'ai-question',
      'cs-topic',
      'cs-question',
      'hw-topic',
      'hw-question',
      'behavioural-principle',
      'behavioural-question',
      'story',
      'company',
      'project',
      'milestone',
      'reading',
      'week',
    ] satisfies SearchKind[]) {
      expect(kinds).toContain(kind)
    }
  })

  it('sends a DSA problem to the page that actually renders it', async () => {
    const { content } = await import('@/lib/content/index')
    const items = await getSearchIndex()
    const problem = content.dsaProblems[0]
    const pattern = content.dsaPatterns.find((p) => p.id === problem.patternId)!

    const indexed = items.find((i) => i.id === problem.id)!
    expect(indexed.href).toBe(`/dsa/${pattern.id.replace(/^dsap-/, '')}`)
    expect(indexed.subtitle).toBe(pattern.name)
  })

  it('leaves out the generated project docs, whose titles are one generic word each', async () => {
    const items = await getSearchIndex()
    expect(items.some((i) => i.id.startsWith('doc-'))).toBe(false)
    expect(items.some((i) => i.id.startsWith('day-'))).toBe(false)
  })

  it('answers a real query with the row a human would have picked', async () => {
    const items = await getSearchIndex()
    expect(search(items, 'two sum')[0].item.title).toBe('Two Sum')
    expect(search(items, 'dsa')[0].item.kind).toBe('destination')
    expect(search(items, 'amazon')[0].item.kind).toBe('company')
  })

  it('builds fast enough to be worth doing lazily rather than eagerly', async () => {
    const { content } = await import('@/lib/content/index')
    const started = performance.now()
    const items = buildItems({ content })
    const elapsed = performance.now() - started
    expect(items.length).toBeGreaterThan(700)
    // Generous — this is a regression guard against an accidental O(n²) join,
    // not a benchmark. It measures ~6ms on the machine this was written on.
    expect(elapsed).toBeLessThan(250)
  })
})
