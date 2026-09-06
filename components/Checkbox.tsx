'use client'

import type { ReactNode } from 'react'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'

interface Props {
  itemId: string
  label: ReactNode
  meta?: ReactNode
}

/**
 * A completion row. The whole 44px row is the tap target.
 *
 * A completed row dims, desaturates, gains a strikethrough and a check glyph —
 * four signals, so colour is never carrying the state on its own.
 */
export default function Checkbox({ itemId, label, meta }: Props) {
  const hydrated = useHydrated()
  const stored = useProgress((s) => Boolean(s.completed[itemId]))
  const toggle = useProgress((s) => s.toggle)
  const done = hydrated && stored

  return (
    <label
      data-completed={done ? 'true' : 'false'}
      data-item-id={itemId}
      className="group flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] px-2 py-2.5 transition-colors hover:bg-[var(--track)] data-[completed=true]:[filter:saturate(0.5)]"
    >
      <span className="relative mt-px flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={hydrated ? stored : false}
          onChange={() => toggle(itemId)}
          aria-label={typeof label === 'string' ? label : itemId}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-solid)] transition-colors checked:border-[var(--accent)] checked:bg-[var(--accent)] hover:border-[var(--accent-line)]"
        />
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--accent-contrast)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none relative h-3 w-3 opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path d="M3 8.4l3.2 3.2L13 4.8" />
        </svg>
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <span className="min-w-0 text-sm group-data-[completed=true]:text-[var(--text-muted)] group-data-[completed=true]:line-through">
          {label}
        </span>
        {meta ? (
          <span className="readout shrink-0 text-[var(--text-muted)]">{meta}</span>
        ) : null}
      </span>
    </label>
  )
}
