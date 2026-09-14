'use client'

import { useEffect, useMemo, useState } from 'react'
import { relativeTime } from '@/lib/date'
import {
  FEED_ENDPOINTS,
  REGIONS,
  SOURCES,
  SOURCE_LABEL,
  SOURCE_REGION,
  byNewest,
} from '@/lib/feed/sources'
import type { FeedItem, FeedRegion, FeedResponse, FeedSource } from '@/lib/feed/types'
import Chip from './ui/Chip'
import FeedCard from './FeedCard'

type Filter = 'all' | FeedSource
type RegionFilter = 'all' | FeedRegion
type Status = 'loading' | 'ready' | 'empty'

const REGION_LABEL: Record<FeedRegion, string> = {
  global: 'Global',
  india: 'India',
}

/**
 * How many text-only items the combined view shows. arXiv and HN each return
 * up to 40, and eighty text cards stacked under the picture wall buries the
 * thing this page exists for. Selecting a single source lifts the cap, so
 * nothing is unreachable — only deprioritised in the "everything" view.
 */
const TEXT_PREVIEW = 24

/**
 * The Feed board: all six sources in one client-side load, split into a
 * picture wall and a text list.
 *
 * The split is by whether an item actually has an image, not by which source
 * it came from: arXiv and Hacker News never have one, MediaNama usually does
 * not, and a publisher CDN can fail at any time. Items with no image never
 * render as a card with a blank grey rectangle at the top — they get their own
 * compact treatment, and each section disappears entirely when a filter
 * empties it.
 *
 * Two filters, both chips, both defaulting to "All": region (global / India)
 * and source. Region comes first because it is the coarser cut and the reason
 * the Indian publishers are here at all. Picking a region that the selected
 * source does not belong to resets the source rather than painting an empty
 * board — the filters narrow together instead of fighting.
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
  const [region, setRegion] = useState<RegionFilter>('all')

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

  const regionCounts = useMemo(() => {
    const by = new Map<FeedRegion, number>()
    for (const i of items) by.set(i.region, (by.get(i.region) ?? 0) + 1)
    return by
  }, [items])

  // Everything the region chips allow through. The source chips count within
  // it, so their numbers always describe what clicking them would actually
  // show rather than a total the region filter has already ruled out.
  const inRegion = useMemo(
    () => (region === 'all' ? items : items.filter((i) => i.region === region)),
    [items, region],
  )

  const counts = useMemo(() => {
    const by = new Map<FeedSource, number>()
    for (const i of inRegion) by.set(i.source, (by.get(i.source) ?? 0) + 1)
    return by
  }, [inRegion])

  const visible = useMemo(
    () => (filter === 'all' ? inRegion : inRegion.filter((i) => i.source === filter)),
    [inRegion, filter],
  )

  /** Picking a region drops a source selection that region cannot contain. */
  const selectRegion = (next: RegionFilter) => {
    setRegion(next)
    if (next !== 'all' && filter !== 'all' && SOURCE_REGION[filter] !== next) setFilter('all')
  }

  const withImages = visible.filter((i) => i.image)
  const allTextOnly = visible.filter((i) => !i.image)
  const textOnly = filter === 'all' ? allTextOnly.slice(0, TEXT_PREVIEW) : allTextOnly

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div role="group" aria-label="Region" className="flex min-w-0 flex-wrap items-center gap-2">
            <FilterChip active={region === 'all'} onClick={() => selectRegion('all')} count={items.length}>
              All regions
            </FilterChip>
            {REGIONS.map((r) => (
              <FilterChip
                key={r.id}
                active={region === r.id}
                onClick={() => selectRegion(r.id)}
                count={regionCounts.get(r.id) ?? 0}
              >
                {r.label}
              </FilterChip>
            ))}
          </div>
          {fetchedAt ? (
            <span className="readout ml-auto shrink-0 text-[var(--text-muted)]">
              refreshed {relativeTime(fetchedAt)}
            </span>
          ) : null}
        </div>

        <div role="group" aria-label="Source" className="flex min-w-0 flex-wrap items-center gap-2">
          <FilterChip
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            count={inRegion.length}
          >
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
        </div>
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
                {withImages.map((item, n) => (
                  <FeedCard key={item.id} item={item} priority={n < 2} />
                ))}
              </div>
            </section>
          ) : null}

          {textOnly.length > 0 ? (
            <section className="flex min-w-0 flex-col gap-3">
              {/*
                Not "Papers and threads" any more: this section is everything
                without an image, and since MediaNama ships most of its items
                without one, it is now mostly Indian policy reporting rather
                than arXiv and Hacker News. The heading names the split the
                board actually makes.
              */}
              <h2 className="eyebrow">Text only</h2>
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                {textOnly.map((item) => (
                  <TextCard key={item.id} item={item} />
                ))}
              </div>
              {textOnly.length < allTextOnly.length ? (
                <p className="readout text-[var(--text-muted)]">
                  showing {textOnly.length} of {allTextOnly.length} — filter by source for the rest
                </p>
              ) : null}
            </section>
          ) : null}

          {visible.length === 0 ? (
            <p className="panel p-4 text-sm text-[var(--text-muted)]">
              Nothing from {filter === 'all' ? 'any source' : SOURCE_LABEL[filter]}
              {region === 'all' ? '' : ` in ${REGION_LABEL[region]}`} in the current window.
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
  // The shared primitive, not a hand-rolled pill: it is the thing that already
  // guarantees a real <button>, a 44px target, and `aria-pressed` and
  // `data-active` set from one value so the announced and painted states
  // cannot drift apart.
  return (
    <Chip pressed={active} onClick={onClick}>
      <span className="truncate">{children}</span>
      <span className="readout shrink-0 text-[var(--text-faint)]">{count}</span>
    </Chip>
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
