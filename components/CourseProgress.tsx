'use client'

import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import Meter from './ui/Meter'

/**
 * How much of a course — or of one part — has been read.
 *
 * Reads the same `completed` map every other completable thing in Learn writes
 * to, through the same store, so a section ticked here counts towards the
 * streak and shows up in Today without a second progress scheme existing.
 *
 * Both exports render their unhydrated state as zero and never as `null`: the
 * server cannot know what is in localStorage, so the markup has to agree with
 * itself before hydration or React replaces it and the reader sees a flicker
 * where the numbers are.
 */

function countDone(completed: Record<string, string>, itemIds: string[]): number {
  let done = 0
  for (const id of itemIds) if (completed[id]) done += 1
  return done
}

export function CourseMeter({ itemIds, label }: { itemIds: string[]; label: string }) {
  const hydrated = useHydrated()
  const done = useProgress((s) => countDone(s.completed, itemIds))
  const read = hydrated ? done : 0

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Meter value={read} max={itemIds.length} label={label} />
      <p className="readout text-[var(--text-muted)]">
        {read} of {itemIds.length} sections read
      </p>
    </div>
  )
}

/** The compact `3/8` on a contents row. */
export function SectionCount({ itemIds, label }: { itemIds: string[]; label: string }) {
  const hydrated = useHydrated()
  const done = useProgress((s) => countDone(s.completed, itemIds))
  const read = hydrated ? done : 0

  if (itemIds.length === 0) return null

  return (
    <span
      className="readout shrink-0 text-[var(--text-muted)]"
      data-complete={read === itemIds.length ? 'true' : 'false'}
      style={read === itemIds.length ? { color: 'var(--positive)' } : undefined}
    >
      <span className="sr-only">{label}: </span>
      {read}/{itemIds.length}
    </span>
  )
}
