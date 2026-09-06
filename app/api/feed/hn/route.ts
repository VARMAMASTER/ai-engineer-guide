import { NextResponse } from 'next/server'
import { hnUrls, mergeHnPayloads } from '@/lib/feed/hn'
import type { FeedResponse } from '@/lib/feed/types'

// Caching comes from the fetch() call's `next.revalidate` option below (the
// Next.js Data Cache keeps each upstream response for up to 6 hours) plus the
// `Cache-Control` header on the response (for the browser/CDN). There is no
// route-segment `revalidate` export here: per `node_modules/next/dist/docs`,
// GET Route Handlers are dynamic (not cached) by default, and the documented
// way to cache a GET handler's own output is `export const dynamic =
// 'force-static'` — a plain `export const revalidate` segment config is not
// documented to do anything for a route handler that isn't force-static, so
// it would be dead code here.
const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=3600'

async function fetchTerm(url: string): Promise<unknown> {
  const res = await fetch(url, {
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`hn responded ${res.status}`)
  return res.json()
}

export async function GET() {
  const fetchedAt = new Date().toISOString()

  // One request per search term (Algolia has no boolean OR), fired
  // concurrently so one slow/failing term can't stall or sink the rest.
  const settled = await Promise.allSettled(hnUrls(new Date()).map(fetchTerm))
  const payloads = settled
    .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
    .map((r) => r.value)

  if (payloads.length === 0) {
    return NextResponse.json(
      { items: [], error: 'unavailable', fetchedAt } satisfies FeedResponse,
      { headers: { 'Cache-Control': CACHE_CONTROL } }
    )
  }

  // Partial success (some terms failed) is still a working feed: no `error`.
  const body: FeedResponse = { items: mergeHnPayloads(payloads), fetchedAt }
  return NextResponse.json(body, { headers: { 'Cache-Control': CACHE_CONTROL } })
}
