import type { FeedItem } from './types'

/**
 * Search terms fired as SEPARATE Algolia requests and merged.
 *
 * Algolia's `query` parameter is free-text relevance search, not a boolean
 * query language: `query=LLM OR RAG` searches for stories containing the
 * literal tokens "LLM", "OR", and "RAG", which is why a single combined
 * query collapsed to almost nothing (verified live: 'LLM OR RAG' -> 2 hits,
 * vs 'LLM' -> 28, 'RAG' -> 40, 'AI agents' -> 11, 'transformer' -> 4, all
 * with the same points>20 + 7-day filters). There is no in-query OR — each
 * term must be its own request.
 */
const TERMS = ['LLM', 'RAG', 'AI agents', 'transformer']

const MAX_ITEMS = 40

/** Build one Algolia search URL per term in {@link TERMS}, same filters on each. */
export function hnUrls(now: Date): string[] {
  const weekAgo = Math.floor(now.getTime() / 1000) - 7 * 86_400
  return TERMS.map((term) => {
    const query = encodeURIComponent(term)
    return `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story` +
      `&numericFilters=points>20,created_at_i>${weekAgo}&hitsPerPage=${MAX_ITEMS}`
  })
}

interface Hit {
  objectID?: string
  title?: string | null
  url?: string | null
  points?: number
  created_at?: string
}

function hitsOf(payload: unknown): Hit[] {
  if (typeof payload !== 'object' || payload === null) return []
  const hits = (payload as { hits?: unknown }).hits
  return Array.isArray(hits) ? (hits as Hit[]) : []
}

export function parseHn(payload: unknown): FeedItem[] {
  const items: FeedItem[] = []
  for (const raw of hitsOf(payload)) {
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

/**
 * Merge the JSON payloads from the per-term Algolia requests: dedupe by
 * `objectID` (the same story legitimately matches several search terms),
 * sort by `created_at` descending, then cap at {@link MAX_ITEMS}.
 */
export function mergeHnPayloads(payloads: unknown[]): FeedItem[] {
  const byId = new Map<string, Hit>()
  for (const payload of payloads) {
    for (const hit of hitsOf(payload)) {
      if (hit.objectID && !byId.has(hit.objectID)) byId.set(hit.objectID, hit)
    }
  }
  const sorted = [...byId.values()].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return parseHn({ hits: sorted }).slice(0, MAX_ITEMS)
}
