import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseArxiv } from '@/lib/feed/arxiv'
import { parseHn, hnUrls, mergeHnPayloads } from '@/lib/feed/hn'

const xml = readFileSync('tests/fixtures/arxiv.xml', 'utf8')
const hnJson = JSON.parse(readFileSync('tests/fixtures/hn.json', 'utf8'))

// Derived from the fixture's own data rather than the wall clock, so this
// test suite never ages out as real time passes: whatever `now` the fixture
// was captured under, its own newest `published` date is always within the
// 7-day window measured from itself.
const now = [...xml.matchAll(/<published>(\d{4}-\d{2}-\d{2})/g)]
  .map((m) => m[1])
  .reduce((a, b) => (a > b ? a : b))

describe('parseArxiv', () => {
  it('extracts items with id, title, url, and date', () => {
    const items = parseArxiv(xml, now)
    expect(items.length).toBeGreaterThan(0)
    for (const i of items) {
      expect(i.id).toBeTruthy()
      expect(i.title.length).toBeGreaterThan(5)
      expect(i.url.startsWith('http')).toBe(true)
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(i.source).toBe('arxiv')
    }
  })

  it('collapses whitespace inside titles', () => {
    const items = parseArxiv(xml, now)
    for (const i of items) expect(i.title).not.toMatch(/\s{2,}|\n/)
  })

  it('filters to the last seven days relative to now', () => {
    const items = parseArxiv(xml, '1999-01-01')
    expect(items).toHaveLength(0)
  })

  it('excludes an item published after now', () => {
    const future = `<feed><entry>
      <id>http://arxiv.org/abs/9999.99999v1</id>
      <title>Time-travelling paper</title>
      <published>2030-01-01T00:00:00Z</published>
    </entry></feed>`
    expect(parseArxiv(future, '2020-01-01')).toHaveLength(0)
  })

  it('decodes HTML entities in titles', () => {
    const encoded = `<feed><entry>
      <id>http://arxiv.org/abs/1234.5678v1</id>
      <title>Foo &amp; Bar &lt;Test&gt; &quot;quoted&quot; &#39;it&#39;s&#39;</title>
      <published>${now}T00:00:00Z</published>
    </entry></feed>`
    const items = parseArxiv(encoded, now)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe(`Foo & Bar <Test> "quoted" 'it's'`)
  })

  it('returns an empty array for malformed xml', () => {
    expect(parseArxiv('<not-a-feed/>', '2099-01-01')).toEqual([])
    expect(parseArxiv('', '2099-01-01')).toEqual([])
  })
})

describe('hnUrls', () => {
  it('builds one URL per search term, each with a points floor and recency filter', () => {
    const urls = hnUrls(new Date('2026-09-06T00:00:00Z'))
    expect(urls.length).toBeGreaterThan(1)
    for (const url of urls) {
      expect(url).toContain('tags=story')
      expect(url).toMatch(/numericFilters=points>20,created_at_i>\d+/)
    }
    expect(urls.some((u) => u.includes('query=LLM'))).toBe(true)
    expect(urls.some((u) => u.includes('query=RAG'))).toBe(true)
    expect(urls.some((u) => u.includes('query=transformer'))).toBe(true)
    expect(urls.some((u) => u.includes(encodeURIComponent('AI agents')))).toBe(true)
  })
})

describe('mergeHnPayloads', () => {
  const shared = { objectID: '111', title: 'Shared story', created_at: '2026-09-05T00:00:00Z', points: 50, url: 'https://example.com/shared' }
  const onlyInA = { objectID: '222', title: 'Only in payload A', created_at: '2026-09-04T00:00:00Z', points: 40 }
  const onlyInB = { objectID: '333', title: 'Only in payload B', created_at: '2026-09-06T00:00:00Z', points: 30 }
  const payloadA = { hits: [shared, onlyInA] }
  const payloadB = { hits: [shared, onlyInB] }

  it('dedupes a story that matches more than one search term', () => {
    const items = mergeHnPayloads([payloadA, payloadB])
    const ids = items.map((i) => i.id)
    expect(ids.filter((id) => id === 'hn-111')).toHaveLength(1)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('hn-222')
    expect(ids).toContain('hn-333')
  })

  it('sorts the merged result by date descending', () => {
    const items = mergeHnPayloads([payloadA, payloadB])
    expect(items.map((i) => i.id)).toEqual(['hn-333', 'hn-111', 'hn-222'])
  })

  it('returns an empty array when every payload is malformed', () => {
    expect(mergeHnPayloads([null, {}, { hits: 'nope' }])).toEqual([])
  })
})

describe('parseHn', () => {
  it('maps hits to feed items', () => {
    const items = parseHn(hnJson)
    expect(items.length).toBeGreaterThan(0)
    for (const i of items) {
      expect(i.source).toBe('hn')
      expect(i.url.startsWith('http')).toBe(true)
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('falls back to the HN permalink when a story has no url', () => {
    const items = parseHn({ hits: [{ objectID: '42', title: 'Ask HN: something', created_at: '2026-09-01T00:00:00Z', points: 30, url: null }] })
    expect(items[0].url).toBe('https://news.ycombinator.com/item?id=42')
  })

  it('returns an empty array for a malformed payload', () => {
    expect(parseHn(null)).toEqual([])
    expect(parseHn({})).toEqual([])
    expect(parseHn({ hits: 'nope' })).toEqual([])
  })

  it('skips hits with no title', () => {
    expect(parseHn({ hits: [{ objectID: '1', created_at: '2026-09-01T00:00:00Z' }] })).toEqual([])
  })
})
