'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { content } from '@/lib/content/index'
import type { Reading } from '@/lib/content/schema'
import Checkbox from './Checkbox'
import LiveFeed from './LiveFeed'

type Tab = 'curated' | 'live'

const KIND_LABEL: Record<Reading['kind'], string> = {
  paper: 'Paper',
  post: 'Post',
  api: 'API',
}

/**
 * Reading page: a curated list grouped by week (the default) and a live feed
 * of arXiv + Hacker News, switched by a standard ARIA tablist.
 */
export default function ReadingTabs() {
  const [tab, setTab] = useState<Tab>('curated')

  const weekGroups = useMemo(() => {
    const byWeek = new Map<string, Reading[]>()
    for (const r of content.readings) {
      const list = byWeek.get(r.weekId) ?? []
      list.push(r)
      byWeek.set(r.weekId, list)
    }
    return [...content.weeks]
      .sort((a, b) => a.number - b.number)
      .map((week) => ({ week, readings: byWeek.get(week.id) ?? [] }))
      .filter((g) => g.readings.length > 0)
  }, [])

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        role="tablist"
        aria-label="Reading view"
        className="panel inline-flex w-fit gap-1 p-1"
      >
        <TabButton id="tab-curated" controls="panel-curated" active={tab === 'curated'} onClick={() => setTab('curated')}>
          Curated
        </TabButton>
        <TabButton id="tab-live" controls="panel-live" active={tab === 'live'} onClick={() => setTab('live')}>
          Live feed
        </TabButton>
      </div>

      {tab === 'curated' ? (
        <div
          id="panel-curated"
          role="tabpanel"
          aria-labelledby="tab-curated"
          className="flex min-w-0 flex-col gap-4"
        >
          {weekGroups.map(({ week, readings }) => (
            <section key={week.id} className="panel min-w-0 p-4">
              <h3 className="eyebrow mb-3">Week {week.number}</h3>
              <ul className="flex min-w-0 flex-col">
                {readings.map((r) => (
                  <li key={r.id} className="border-b border-[var(--panel-border)] last:border-0">
                    <Checkbox
                      itemId={r.id}
                      meta={`${r.minutes} min`}
                      labelText={`${KIND_LABEL[r.kind]}: ${r.title}`}
                      label={
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="eyebrow rounded-full border border-[var(--panel-border)] px-2 py-0.5">
                              {KIND_LABEL[r.kind]}
                            </span>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium hover:underline"
                            >
                              {r.title}
                            </a>
                          </span>
                          <span className="readout text-[var(--text-muted)]">
                            {r.source} · {r.year}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">{r.why}</span>
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div
          id="panel-live"
          role="tabpanel"
          aria-labelledby="tab-live"
          className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2"
        >
          <LiveFeed endpoint="/api/feed/arxiv" heading="arXiv" />
          <LiveFeed endpoint="/api/feed/hn" heading="Hacker News" />
        </div>
      )}
    </div>
  )
}

function TabButton({
  id,
  controls,
  active,
  onClick,
  children,
}: {
  id: string
  controls: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-controls={controls}
      aria-selected={active}
      onClick={onClick}
      className={`flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
      }`}
    >
      {children}
    </button>
  )
}
