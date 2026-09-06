export interface FeedItem {
  id: string
  title: string
  url: string
  source: 'arxiv' | 'hn'
  date: string
  meta?: string
}

export interface FeedResponse {
  items: FeedItem[]
  error?: string
  fetchedAt: string
}
