import type { FeedSource } from './types'

/**
 * The four sources the Feed page combines, in the order their filter chips
 * appear. The two news sources carry images; arXiv and Hacker News do not,
 * which is why the page gives them their own text-only section rather than a
 * card with an empty grey box where the picture should be.
 */
export interface SourceMeta {
  id: FeedSource
  label: string
  /** The route that serves this source. Two of them share `/api/feed/news`. */
  endpoint: string
}

export const SOURCES: SourceMeta[] = [
  { id: 'ars', label: 'Ars Technica', endpoint: '/api/feed/news' },
  { id: 'verge', label: 'The Verge', endpoint: '/api/feed/news' },
  { id: 'arxiv', label: 'arXiv', endpoint: '/api/feed/arxiv' },
  { id: 'hn', label: 'Hacker News', endpoint: '/api/feed/hn' },
]

export const SOURCE_LABEL: Record<FeedSource, string> = {
  ars: 'Ars Technica',
  verge: 'The Verge',
  arxiv: 'arXiv',
  hn: 'Hacker News',
}

/** Each endpoint once, so `/api/feed/news` is not fetched twice. */
export const FEED_ENDPOINTS = [...new Set(SOURCES.map((s) => s.endpoint))]

/** Newest first. arXiv and HN only expose a day, so they sort by `date`. */
export function byNewest(a: { published?: string; date: string }, b: { published?: string; date: string }): number {
  return (b.published ?? b.date).localeCompare(a.published ?? a.date)
}
