import { NextResponse } from 'next/server'
import {
  ARS_URL,
  INDIAN_EXPRESS_URL,
  MEDIANAMA_URL,
  VERGE_URL,
  mergeNews,
  parseArs,
  parseIndianExpress,
  parseMedianama,
  parseVerge,
} from '@/lib/feed/news'
import type { FeedItem, FeedResponse } from '@/lib/feed/types'

// Caching comes from the fetch() call's `next.revalidate` option below (the
// Next.js Data Cache keeps each upstream response for up to 6 hours) plus the
// `Cache-Control` header on the response (for the browser/CDN). There is no
// route-segment `revalidate` export here, for the same reason the arXiv and HN
// routes have none: per `node_modules/next/dist/docs`, GET Route Handlers are
// dynamic by default and a plain `revalidate` segment config does nothing for a
// handler that isn't `force-static`.
//
// Unlike the HN route, none of the URLs here needs a bucketed timestamp: all
// four are fixed publisher endpoints with no query string, so the fetch cache
// key is already byte-identical on every request inside the 6-hour window.
const CACHE_CONTROL = 'public, s-maxage=10800, stale-while-revalidate=3600'
const REVALIDATE_SECONDS = 10800
const TIMEOUT_MS = 8000

async function load(url: string, parse: (xml: string) => FeedItem[]): Promise<FeedItem[]> {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // Ars and The Verge serve a plain 403 to the default fetch UA.
    headers: { 'User-Agent': 'ai-engineer-guide/1.0 (+feed reader)', Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8' },
  })
  if (!res.ok) throw new Error(`${url} responded ${res.status}`)
  return parse(await res.text())
}

export async function GET() {
  const fetchedAt = new Date().toISOString()

  // Concurrent, so a slow or dead publisher cannot stall or sink the others.
  // Two global mastheads and two Indian ones; `mergeNews` caps each publisher
  // so the merge stays balanced whichever of them answers.
  const sources = [
    { name: 'ars', url: ARS_URL, parse: parseArs },
    { name: 'verge', url: VERGE_URL, parse: parseVerge },
    { name: 'medianama', url: MEDIANAMA_URL, parse: parseMedianama },
    { name: 'indianexpress', url: INDIAN_EXPRESS_URL, parse: parseIndianExpress },
  ] as const

  const settled = await Promise.allSettled(sources.map((s) => load(s.url, s.parse)))

  // A rejected source used to be dropped in silence, and that is how MediaNama
  // died unnoticed in production: it answers fine from a laptop and not at all
  // from Vercel's servers, the route degraded exactly as designed, and there was
  // nothing in the runtime logs to find because nothing ever wrote one. Partial
  // success is still the right RESPONSE — a reader wants three publishers rather
  // than an error page — but it must not be a silent one. A source that has
  // stopped working permanently is indistinguishable from one that never ran.
  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.warn(`[feed/news] source "${sources[i].name}" failed: ${reason}`)
    }
  })

  // An empty-but-successful parse is its own failure mode, and a quieter one:
  // the fetch succeeded, so nothing rejected, but a changed feed format yields
  // zero items forever.
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.length === 0) {
      console.warn(`[feed/news] source "${sources[i].name}" parsed 0 items`)
    }
  })

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
