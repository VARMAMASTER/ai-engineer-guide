import { NextResponse } from 'next/server'
import { ARS_URL, VERGE_URL, mergeNews, parseArs, parseVerge } from '@/lib/feed/news'
import type { FeedItem, FeedResponse } from '@/lib/feed/types'

// Caching comes from the fetch() call's `next.revalidate` option below (the
// Next.js Data Cache keeps each upstream response for up to 6 hours) plus the
// `Cache-Control` header on the response (for the browser/CDN). There is no
// route-segment `revalidate` export here, for the same reason the arXiv and HN
// routes have none: per `node_modules/next/dist/docs`, GET Route Handlers are
// dynamic by default and a plain `revalidate` segment config does nothing for a
// handler that isn't `force-static`.
//
// Unlike the HN route, neither URL here needs a bucketed timestamp: both are
// fixed publisher endpoints with no query string, so the fetch cache key is
// already byte-identical on every request inside the 6-hour window.
const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=3600'
const REVALIDATE_SECONDS = 21600
const TIMEOUT_MS = 8000

async function load(url: string, parse: (xml: string) => FeedItem[]): Promise<FeedItem[]> {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // Both publishers serve a plain 403 to the default fetch UA.
    headers: { 'User-Agent': 'ai-engineer-guide/1.0 (+feed reader)', Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8' },
  })
  if (!res.ok) throw new Error(`${url} responded ${res.status}`)
  return parse(await res.text())
}

export async function GET() {
  const fetchedAt = new Date().toISOString()

  // Concurrent, so a slow or dead publisher cannot stall or sink the other.
  const settled = await Promise.allSettled([
    load(ARS_URL, parseArs),
    load(VERGE_URL, parseVerge),
  ])
  const lists = settled
    .filter((r): r is PromiseFulfilledResult<FeedItem[]> => r.status === 'fulfilled')
    .map((r) => r.value)

  if (lists.length === 0) {
    return NextResponse.json(
      { items: [], error: 'unavailable', fetchedAt } satisfies FeedResponse,
      { headers: { 'Cache-Control': CACHE_CONTROL } },
    )
  }

  // Partial success (one publisher down) is still a working feed: no `error`.
  const body: FeedResponse = { items: mergeNews(lists), fetchedAt }
  return NextResponse.json(body, { headers: { 'Cache-Control': CACHE_CONTROL } })
}
