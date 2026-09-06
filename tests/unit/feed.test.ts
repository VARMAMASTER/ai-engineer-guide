import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseArxiv } from '@/lib/feed/arxiv'
import { parseHn } from '@/lib/feed/hn'

const xml = readFileSync('tests/fixtures/arxiv.xml', 'utf8')
const hnJson = JSON.parse(readFileSync('tests/fixtures/hn.json', 'utf8'))

describe('parseArxiv', () => {
  it('extracts items with id, title, url, and date', () => {
    const items = parseArxiv(xml, '2099-01-01')
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
    const items = parseArxiv(xml, '2099-01-01')
    for (const i of items) expect(i.title).not.toMatch(/\s{2,}|\n/)
  })

  it('filters to the last seven days relative to now', () => {
    const items = parseArxiv(xml, '1999-01-01')
    expect(items).toHaveLength(0)
  })

  it('returns an empty array for malformed xml', () => {
    expect(parseArxiv('<not-a-feed/>', '2099-01-01')).toEqual([])
    expect(parseArxiv('', '2099-01-01')).toEqual([])
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
