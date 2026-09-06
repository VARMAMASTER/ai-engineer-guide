import { NextResponse } from 'next/server'
import { hnUrl, parseHn } from '@/lib/feed/hn'
import type { FeedResponse } from '@/lib/feed/types'

export const revalidate = 21600

export async function GET() {
  const fetchedAt = new Date().toISOString()
  try {
    const res = await fetch(hnUrl(new Date()), { next: { revalidate } })
    if (!res.ok) throw new Error(`hn responded ${res.status}`)
    const body: FeedResponse = { items: parseHn(await res.json()), fetchedAt }
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json({ items: [], error: 'unavailable', fetchedAt } satisfies FeedResponse)
  }
}
