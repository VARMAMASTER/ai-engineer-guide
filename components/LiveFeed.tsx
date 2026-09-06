'use client'

import { useEffect, useState } from 'react'
import type { FeedItem, FeedResponse } from '@/lib/feed/types'

interface Props {
  endpoint: string
  heading: string
}

type Status = 'loading' | 'ready' | 'empty'

/**
 * One column of a live feed: fetches `endpoint` on mount and renders
 * `loading | ready | empty`. A failed fetch, an `error` field, or zero items
 * all collapse to the same "empty" state — the caller never needs to know
 * which one happened, only that this column has nothing curated to show.
 */
export default function LiveFeed({ endpoint, heading }: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [items, setItems] = useState<FeedItem[]>([])
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  // Resetting to `loading` when the column is pointed at a different endpoint
  // is state derived from a prop, so it is adjusted during render rather than
  // in an effect (https://react.dev/learn/you-might-not-need-an-effect). An
  // effect would have painted the previous endpoint's items for one frame
  // first, and the extra render pass it costs is the cascade the lint rule is
  // about. React re-runs this component immediately, before any child renders.
  const [loadedFrom, setLoadedFrom] = useState(endpoint)
  if (loadedFrom !== endpoint) {
    setLoadedFrom(endpoint)
    setStatus('loading')
    setItems([])
    setFetchedAt(null)
  }

  useEffect(() => {
    let cancelled = false

    fetch(endpoint)
      .then((res) => res.json() as Promise<FeedResponse>)
      .then((data) => {
        if (cancelled) return
        setFetchedAt(data.fetchedAt)
        if (data.error || data.items.length === 0) {
          setItems([])
          setStatus('empty')
        } else {
          setItems(data.items)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (cancelled) return
        setItems([])
        setStatus('empty')
      })

    return () => {
      cancelled = true
    }
  }, [endpoint])

  return (
    <section className="panel min-w-0 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{heading}</h2>
        {fetchedAt ? (
          <span className="readout shrink-0 text-[var(--text-muted)]">
            refreshed{' '}
            {new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
      </div>

      {status === 'loading' ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : status === 'empty' ? (
        <p className="text-sm text-[var(--text-muted)]">
          Feed unavailable, showing curated list only.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="surface-solid min-w-0 p-3">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm font-medium hover:underline"
              >
                {item.title}
              </a>
              <div className="readout mt-1 text-[var(--text-muted)]">
                {item.date}
                {item.meta ? ` · ${item.meta}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
