import { NextResponse } from 'next/server'
import { ARXIV_URL, parseArxiv } from '@/lib/feed/arxiv'
import { todayIso } from '@/lib/date'
import type { FeedResponse } from '@/lib/feed/types'

// Caching comes from the fetch() call's `next.revalidate` option below (the
// Next.js Data Cache keeps the upstream response for up to 6 hours) plus the
// `Cache-Control` header on the response (for the browser/CDN). There is no
// route-segment `revalidate` export here: per `node_modules/next/dist/docs`,
// GET Route Handlers are dynamic (not cached) by default, and the documented
// way to cache a GET handler's own output is `export const dynamic =
// 'force-static'` — a plain `export const revalidate` segment config is not
// documented to do anything for a route handler that isn't force-static, so
// it would be dead code here.
const CACHE_CONTROL = 'public, s-maxage=10800, stale-while-revalidate=3600'

export async function GET() {
  const fetchedAt = new Date().toISOString()
  try {
    const res = await fetch(ARXIV_URL, {
      next: { revalidate: 10800 },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`arxiv responded ${res.status}`)
    const body: FeedResponse = { items: parseArxiv(await res.text(), todayIso()), fetchedAt }
    return NextResponse.json(body, { headers: { 'Cache-Control': CACHE_CONTROL } })
  } catch {
    return NextResponse.json(
      { items: [], error: 'unavailable', fetchedAt } satisfies FeedResponse,
      { headers: { 'Cache-Control': CACHE_CONTROL } }
    )
  }
}
