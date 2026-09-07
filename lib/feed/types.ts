/** Every feed source the app reads. The two `news` sources carry images. */
export type FeedSource = 'arxiv' | 'hn' | 'ars' | 'verge'

export interface FeedItem {
  id: string
  title: string
  url: string
  source: FeedSource
  /** Calendar day, `YYYY-MM-DD`. Every source has one. */
  date: string
  /**
   * Full ISO instant, when the source publishes one. arXiv and Algolia are
   * read at day resolution, so this is absent there and the relative-time
   * readout falls back to `date`.
   */
  published?: string
  /** Article image, absolute https URL. Only the news sources have one. */
  image?: string
  meta?: string
}

export interface FeedResponse {
  items: FeedItem[]
  error?: string
  fetchedAt: string
}
