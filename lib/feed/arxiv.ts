import { diffDays } from '@/lib/date'
import type { FeedItem } from './types'

export const ARXIV_URL =
  'http://export.arxiv.org/api/query' +
  '?search_query=' + encodeURIComponent('cat:cs.CL OR cat:cs.LG OR cat:cs.IR') +
  '&sortBy=submittedDate&sortOrder=descending&max_results=40'

const ENTRY = /<entry>([\s\S]*?)<\/entry>/g
const NAME = /<name>([\s\S]*?)<\/name>/g

const WINDOW_DAYS = 7

function tag(entry: string, name: string): string {
  const m = entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? m[1].trim() : ''
}

/** All `<author><name>...</name></author>` entries within an `<entry>`, joined for display. */
function authors(entry: string): string {
  const names = [...entry.matchAll(NAME)].map((m) => clean(decodeEntities(m[1])))
  return names.join(', ')
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => ENTITIES[m])
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Parse the arXiv Atom feed into feed items, keeping only entries published
 * within the last `WINDOW_DAYS` (7) days as of `now`. An entry published
 * after `now` is also excluded (guards malformed/clock-skewed timestamps).
 */
export function parseArxiv(xml: string, now: string): FeedItem[] {
  const items: FeedItem[] = []
  for (const m of xml.matchAll(ENTRY)) {
    const entry = m[1]
    const id = clean(tag(entry, 'id'))
    const title = decodeEntities(clean(tag(entry, 'title')))
    const published = tag(entry, 'published').slice(0, 10)
    if (!id || !title || !/^\d{4}-\d{2}-\d{2}$/.test(published)) continue
    const age = diffDays(published, now)
    if (age < 0 || age > WINDOW_DAYS) continue
    items.push({ id, title, url: id, source: 'arxiv', date: published, meta: authors(entry) || undefined })
  }
  return items
}
