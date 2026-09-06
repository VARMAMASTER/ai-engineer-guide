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

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

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
        <h3 className="text-sm font-semibold">{heading}</h3>
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
