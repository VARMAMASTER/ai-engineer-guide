'use client'

import { useEffect, useMemo, useState } from 'react'
import { relativeTime } from '@/lib/date'
import { FEED_ENDPOINTS, SOURCES, SOURCE_LABEL, byNewest } from '@/lib/feed/sources'
import type { FeedItem, FeedResponse, FeedSource } from '@/lib/feed/types'
import FeedCard from './FeedCard'

type Filter = 'all' | FeedSource
type Status = 'loading' | 'ready' | 'empty'

/**
 * The Feed board: all four sources in one client-side load, split into a
 * picture wall (Ars Technica, The Verge) and a text list (arXiv, Hacker News).
 *
 * The split is the whole design. Items with no image never render as a card
 * with a blank grey rectangle at the top — they get their own compact
 * treatment, and each section disappears entirely when a filter empties it.
 *
 * Fetching happens on the client for the same reason `LiveFeed` does it: the
 * page's `h1` and chrome are server-rendered and static, so a slow or dead
 * publisher can never block the document. Every endpoint answers 200 with an
 * `error` field rather than failing, and `Promise.allSettled` means one dead
 * route still leaves the others on screen.
 */
export default function FeedBoard() {
  const [status, setStatus] = useState<Status>('loading')
  const [items, setItems] = useState<FeedItem[]>([])
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const settled = await Promise.allSettled(
        FEED_ENDPOINTS.map((e) => fetch(e).then((r) => r.json() as Promise<FeedResponse>)),
      )
      if (cancelled) return

      const ok = settled
        .filter((r): r is PromiseFulfilledResult<FeedResponse> => r.status === 'fulfilled')
        .map((r) => r.value)

      const merged = ok.flatMap((r) => r.items ?? []).sort(byNewest)
      setFetchedAt(ok.map((r) => r.fetchedAt).sort().at(-1) ?? null)
      setItems(merged)
      setStatus(merged.length > 0 ? 'ready' : 'empty')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const by = new Map<FeedSource, number>()
    for (const i of items) by.set(i.source, (by.get(i.source) ?? 0) + 1)
    return by
  }, [items])

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.source === filter)),
    [items, filter],
  )

  const withImages = visible.filter((i) => i.image)
  const textOnly = visible.filter((i) => !i.image)

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} count={items.length}>
          Everything
        </FilterChip>
        {SOURCES.map((s) => (
          <FilterChip
            key={s.id}
            active={filter === s.id}
            onClick={() => setFilter(s.id)}
            count={counts.get(s.id) ?? 0}
          >
            {s.label}
          </FilterChip>
        ))}
        {fetchedAt ? (
          <span className="readout ml-auto shrink-0 text-[var(--text-muted)]">
            refreshed {relativeTime(fetchedAt)}
          </span>
        ) : null}
      </div>

      {status === 'loading' ? (
        <SkeletonWall />
      ) : status === 'empty' ? (
        <p className="panel p-4 text-sm text-[var(--text-muted)]">
          Every feed is unavailable right now. The curated Reading list is the one that matters
          anyway — this page is only for what landed after it was written.
        </p>
      ) : (
        <>
          {withImages.length > 0 ? (
            <section className="flex min-w-0 flex-col gap-3">
              <h2 className="eyebrow">Headlines</h2>
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                {withImages.map((item) => (
                  <FeedCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          {textOnly.length > 0 ? (
            <section className="flex min-w-0 flex-col gap-3">
              <h2 className="eyebrow">Papers and threads</h2>
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                {textOnly.map((item) => (
                  <TextCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          {visible.length === 0 ? (
            <p className="panel p-4 text-sm text-[var(--text-muted)]">
              Nothing from {filter === 'all' ? 'any source' : SOURCE_LABEL[filter]} in the current
              window.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

/**
 * A source with no image gets a card with no image box, not a card with an
 * empty one: a left accent rule instead of a picture, and denser text.
 */
function TextCard({ item }: { item: FeedItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="panel card flex min-w-0 flex-col gap-1.5 border-l-2 border-l-[var(--accent-line)] p-4"
    >
      <span className="eyebrow">{SOURCE_LABEL[item.source]}</span>
      <span className="min-w-0 text-sm font-medium">{item.title}</span>
      {item.meta ? (
        <span className="min-w-0 truncate text-xs text-[var(--text-muted)]">{item.meta}</span>
      ) : null}
      <span className="readout text-[var(--text-muted)]">
        {relativeTime(item.published ?? item.date)}
      </span>
    </a>
  )
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-11 min-w-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
        active
          ? 'nav-pill border-transparent'
          : 'border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text)]'
      }`}
    >
      <span className="truncate">{children}</span>
      <span className="readout shrink-0 text-[var(--text-faint)]">{count}</span>
    </button>
  )
}

/**
 * Reserves the real card geometry while the feeds land, so the first paint of
 * real content does not push the page around.
 */
function SkeletonWall() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
      <span className="sr-only" role="status">
        Loading the feed
      </span>
      {[0, 1, 2, 3].map((n) => (
        <div key={n} aria-hidden="true" className="panel flex min-w-0 flex-col overflow-hidden">
          <div className="aspect-[16/9] w-full bg-[var(--track)]" />
          <div className="flex flex-col gap-2 p-4">
            <div className="h-3 w-24 rounded-full bg-[var(--track)]" />
            <div className="h-4 w-full rounded-full bg-[var(--track)]" />
            <div className="h-4 w-2/3 rounded-full bg-[var(--track)]" />
          </div>
        </div>
      ))}
    </div>
  )
}
