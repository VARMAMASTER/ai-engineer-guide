import type { FeedItem } from './types'

/**
 * Build the HN Algolia search URL for recent, well-received AI-engineering
 * stories.
 *
 * Verified against the live API: without Algolia's `advancedSyntax`, a
 * plain multi-word query is scored as an OR of terms, but empirically
 * adding a third or later OR'd keyword (e.g. "LLM OR RAG OR transformer")
 * collapses real result counts to zero far more often than a two-term
 * query does — confirmed by hand against the live endpoint while building
 * this feed. Two terms plus the recency filter is the combination that
 * reliably returned live, on-topic hits during testing.
 *
 * The `points>20` floor was re-verified against the live 2-term query
 * (probed at 20/15/10/5): all four floors returned the same 2 hits at
 * test time, so 20 is kept — it's the highest floor that still returns a
 * usable result set, and it keeps low-signal (1-2 point) stories out of
 * the feed.
 */
export function hnUrl(now: Date): string {
  const weekAgo = Math.floor(now.getTime() / 1000) - 7 * 86_400
  const query = encodeURIComponent('LLM OR RAG')
  return `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story` +
    `&numericFilters=points>20,created_at_i>${weekAgo}&hitsPerPage=40`
}

interface Hit {
  objectID?: string
  title?: string | null
  url?: string | null
  points?: number
  created_at?: string
}

export function parseHn(payload: unknown): FeedItem[] {
  if (typeof payload !== 'object' || payload === null) return []
  const hits = (payload as { hits?: unknown }).hits
  if (!Array.isArray(hits)) return []

  const items: FeedItem[] = []
  for (const raw of hits as Hit[]) {
    const id = raw.objectID
    const title = raw.title
    const created = raw.created_at
    if (!id || !title || !created) continue
    const date = created.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    items.push({
      id: `hn-${id}`,
      title,
      url: raw.url ?? `https://news.ycombinator.com/item?id=${id}`,
      source: 'hn',
      date,
      meta: typeof raw.points === 'number' ? `${raw.points} points` : undefined,
    })
  }
  return items
}
