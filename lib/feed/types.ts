/** Every feed source the app reads. The four `news` sources carry images. */
export type FeedSource = 'arxiv' | 'hn' | 'ars' | 'verge' | 'medianama' | 'indianexpress'

/**
 * Where a source reports from. This is a property of the publisher, not of the
 * story: MediaNama and the Indian Express are read *because* they cover Indian
 * policy, funding and hiring, and that is true of the masthead whether a given
 * item is about the RBI or about OpenAI. Nothing here sniffs an item's text for
 * "India" — that would be a guess, and a wrong one on every story about an
 * Indian company shipping abroad.
 */
export type FeedRegion = 'global' | 'india'

export interface FeedItem {
  id: string
  title: string
  url: string
  source: FeedSource
  /** Always set, and always `SOURCE_REGION[source]`. See {@link FeedRegion}. */
  region: FeedRegion
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
