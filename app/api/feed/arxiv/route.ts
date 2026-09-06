import { NextResponse } from 'next/server'
import { ARXIV_URL, parseArxiv } from '@/lib/feed/arxiv'
import { todayIso } from '@/lib/date'
import type { FeedResponse } from '@/lib/feed/types'

export const revalidate = 21600

export async function GET() {
  const fetchedAt = new Date().toISOString()
  try {
    const res = await fetch(ARXIV_URL, { next: { revalidate } })
    if (!res.ok) throw new Error(`arxiv responded ${res.status}`)
    const body: FeedResponse = { items: parseArxiv(await res.text(), todayIso()), fetchedAt }
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json({ items: [], error: 'unavailable', fetchedAt } satisfies FeedResponse)
  }
}
