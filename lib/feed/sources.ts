import type { FeedRegion, FeedSource } from './types'

/**
 * The six sources the Feed page combines, in the order their filter chips
 * appear. The four news sources carry images (MediaNama only sometimes — see
 * `parseMedianama`); arXiv and Hacker News never do, which is why the page
 * gives them their own text-only section rather than a card with an empty grey
 * box where the picture should be.
 */
export interface SourceMeta {
  id: FeedSource
  label: string
  /** The route that serves this source. Four of them share `/api/feed/news`. */
  endpoint: string
}

export const SOURCES: SourceMeta[] = [
  { id: 'ars', label: 'Ars Technica', endpoint: '/api/feed/news' },
  { id: 'verge', label: 'The Verge', endpoint: '/api/feed/news' },
  { id: 'medianama', label: 'MediaNama', endpoint: '/api/feed/news' },
  { id: 'indianexpress', label: 'Indian Express', endpoint: '/api/feed/news' },
  { id: 'arxiv', label: 'arXiv', endpoint: '/api/feed/arxiv' },
  { id: 'hn', label: 'Hacker News', endpoint: '/api/feed/hn' },
]

export const SOURCE_LABEL: Record<FeedSource, string> = {
  ars: 'Ars Technica',
  verge: 'The Verge',
  medianama: 'MediaNama',
  indianexpress: 'Indian Express',
  arxiv: 'arXiv',
  hn: 'Hacker News',
}

/**
 * The one place a source's region is decided. Every parser stamps its items
 * from this map rather than writing a literal, so a source can never disagree
 * with the chip that filters it.
 */
export const SOURCE_REGION: Record<FeedSource, FeedRegion> = {
  ars: 'global',
  verge: 'global',
  medianama: 'india',
  indianexpress: 'india',
  arxiv: 'global',
  hn: 'global',
}

export interface RegionMeta {
  id: FeedRegion
  label: string
}

/** The region chips, after "All". Order is the order they render in. */
export const REGIONS: RegionMeta[] = [
  { id: 'global', label: 'Global' },
  { id: 'india', label: 'India' },
]

/** Each endpoint once, so `/api/feed/news` is not fetched twice. */
export const FEED_ENDPOINTS = [...new Set(SOURCES.map((s) => s.endpoint))]

/** Newest first. arXiv and HN only expose a day, so they sort by `date`. */
export function byNewest(a: { published?: string; date: string }, b: { published?: string; date: string }): number {
  return (b.published ?? b.date).localeCompare(a.published ?? a.date)
}
