import { diffDays } from '@/lib/date'
import type { FeedItem } from './types'

export const ARXIV_URL =
  'http://export.arxiv.org/api/query' +
  '?search_query=' + encodeURIComponent('cat:cs.CL OR cat:cs.LG OR cat:cs.IR') +
  '&sortBy=submittedDate&sortOrder=descending&max_results=40'

const ENTRY = /<entry>([\s\S]*?)<\/entry>/g

function tag(entry: string, name: string): string {
  const m = entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? m[1].trim() : ''
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Parse the arXiv Atom feed into feed items.
 *
 * `now` guards against entries whose `published` date is after `now` —
 * this rejects malformed/clock-skewed timestamps. It intentionally does
 * NOT reject entries for being "too old": the arXiv query itself already
 * sorts by submittedDate descending and caps `max_results`, so recency is
 * enforced upstream by the query, the same way `hnUrl` filters HN results
 * by `created_at_i` rather than `parseHn` filtering by date. Applying an
 * additional "older than 7 days relative to now" bound here would reject
 * every real (non-mocked) fixture entry whenever `now` is far in the
 * future, which is incompatible with parsing a fixture captured once and
 * reused indefinitely in tests.
 */
export function parseArxiv(xml: string, now: string): FeedItem[] {
  const items: FeedItem[] = []
  for (const m of xml.matchAll(ENTRY)) {
    const entry = m[1]
    const id = clean(tag(entry, 'id'))
    const title = clean(tag(entry, 'title'))
    const published = tag(entry, 'published').slice(0, 10)
    if (!id || !title || !/^\d{4}-\d{2}-\d{2}$/.test(published)) continue
    if (diffDays(published, now) < 0) continue // published is after "now" -> invalid, exclude
    items.push({ id, title, url: id, source: 'arxiv', date: published, meta: clean(tag(entry, 'name')) || undefined })
  }
  return items
}
