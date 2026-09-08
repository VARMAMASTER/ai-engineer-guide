'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { content } from '@/lib/content/index'
import type { Reading } from '@/lib/content/schema'
import Checkbox from './Checkbox'
import LiveFeed from './LiveFeed'
import Mermaid from './Mermaid'

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleSummary = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

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
      <div>
        <h1>Reading</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          The curated list is the one that matters — it is scheduled into the plan week by week.
          The live feed is there for what landed after the list was written.
        </p>
      </div>

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
              <h2 className="eyebrow mb-3">Week {week.number}</h2>
              <ul className="flex min-w-0 flex-col">
                {readings.map((r) => {
                  const isOpen = Boolean(expanded[r.id])
                  const panelId = `reading-summary-${r.id}`
                  return (
                    <li key={r.id} className="border-b border-[var(--panel-border)] last:border-0">
                      <Checkbox
                        itemId={r.id}
                        meta={`${r.minutes} min`}
                        labelText={`${KIND_LABEL[r.kind]}: ${r.title}`}
                        label={
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="tag tag-outline uppercase">
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
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={panelId}
                              onClick={(e) => {
                                // A button is interactive content inside the Checkbox's
                                // <label>, so per the HTML label activation algorithm it
                                // already will not toggle the checkbox — stopPropagation
                                // just keeps that intent explicit and future-proof.
                                e.stopPropagation()
                                toggleSummary(r.id)
                              }}
                              className="eyebrow mt-0.5 flex w-fit items-center gap-1 self-start rounded-[var(--radius-sm)] px-1.5 py-1 text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                            >
                              <span aria-hidden="true" className={`inline-block transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                                &rsaquo;
                              </span>
                              {isOpen ? 'Hide summary' : 'What does it say?'}
                            </button>
                          </span>
                        }
                      />
                      {isOpen ? (
                        <div
                          id={panelId}
                          className="surface-solid mb-3 min-w-0 max-w-full rounded-[var(--radius-sm)] p-3"
                        >
                          <p className="text-sm font-medium leading-snug">
                            <span className="eyebrow text-[var(--accent)]">The idea — </span>
                            {r.summary.idea}
                          </p>

                          <dl className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="min-w-0">
                              <dt className="eyebrow text-[var(--text-muted)]">Problem</dt>
                              <dd className="mt-0.5 text-sm">{r.summary.problem}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="eyebrow text-[var(--text-muted)]">How</dt>
                              <dd className="mt-0.5 whitespace-pre-line text-sm">{r.summary.how}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="eyebrow text-[var(--text-muted)]">Result</dt>
                              <dd className="mt-0.5 text-sm">{r.summary.result}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="eyebrow text-[var(--text-muted)]">Limits</dt>
                              <dd className="mt-0.5 text-sm">{r.summary.limits}</dd>
                            </div>
                          </dl>

                          {r.diagram !== undefined ? (
                            <Mermaid source={r.diagram} caption={`${r.title} — mechanism`} />
                          ) : null}

                          <div className="mt-3 min-w-0 rounded-[var(--radius-sm)] border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2">
                            <p className="eyebrow text-[var(--accent)]">So what — for your plan</p>
                            <p className="mt-0.5 text-sm">{r.summary.soWhat}</p>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
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
