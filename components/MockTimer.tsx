'use client'

import { formatClock, formatDuration, toneFor } from '@/lib/progress/mock'
import type { TimerTone } from '@/lib/progress/mock'

export type TimerState = 'running' | 'paused' | 'ended'

interface Props {
  /** What is being timed: "Session", or the name of the design phase. */
  label: string
  /** Milliseconds left in the box. Negative once it is blown. */
  remainingMs: number
  budgetMs: number
  state: TimerState
  /** Shown next to the label, so the pause count is never hidden from the runner. */
  pauses?: number
  size?: 'lg' | 'sm'
  testId?: string
}

const TONE_COLOR: Record<TimerTone, string> = {
  calm: 'var(--text)',
  nearly: 'var(--warning)',
  over: 'var(--danger)',
}

/**
 * The readout. Deliberately dumb: it is handed a remaining figure and renders
 * it, because the moment a timer component owns its own arithmetic it starts
 * counting frames and lying about backgrounded tabs. Everything to do with
 * wall clocks lives in `lib/progress/mock`.
 *
 * Three signals carry the state, never colour alone: the digits themselves,
 * a status word, and the fill of the bar. Running out of time is announced
 * once, politely, and reads as information — the clock keeps counting up past
 * zero rather than stopping, because a blown box you can see is more useful
 * than one that froze at 00:00.
 */
export default function MockTimer({
  label, remainingMs, budgetMs, state, pauses = 0, size = 'lg', testId,
}: Props) {
  const tone = state === 'ended' ? 'calm' : toneFor(remainingMs, budgetMs)
  const over = remainingMs < 0
  const elapsedMs = budgetMs - remainingMs
  const pct = budgetMs === 0 ? 0 : Math.min(100, Math.max(0, (elapsedMs / budgetMs) * 100))

  const status =
    state === 'ended' ? 'Ended'
    : state === 'paused' ? 'Paused'
    : over ? 'Time — keep going if you need to'
    : tone === 'nearly' ? 'Nearly there'
    : 'Running'

  return (
    <div
      data-testid={testId ?? 'mock-timer'}
      data-tone={tone}
      data-state={state}
      className="flex min-w-0 flex-col gap-2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="eyebrow">{label}</span>
        <span className="readout text-[var(--text-faint)]">
          {`box ${formatDuration(budgetMs)}`}
          {pauses > 0 ? ` · ${pauses} pause${pauses === 1 ? '' : 's'}` : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          role="timer"
          aria-label={`${label}: ${over ? formatClock(remainingMs).slice(1) + ' over' : formatClock(remainingMs) + ' left'}`}
          style={{ color: TONE_COLOR[tone] }}
          className={
            'font-mono font-semibold tabular-nums tracking-tight ' +
            (size === 'lg' ? 'text-4xl md:text-5xl' : 'text-xl')
          }
        >
          {formatClock(remainingMs)}
        </span>
        <span
          className="readout"
          style={{ color: tone === 'calm' ? 'var(--text-muted)' : TONE_COLOR[tone] }}
        >
          {status}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} time used`}
        className={
          'w-full overflow-hidden rounded-full bg-[var(--track)] ' +
          (size === 'lg' ? 'h-2' : 'h-1')
        }
      >
        <div
          className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-linear"
          style={{ width: `${pct}%`, backgroundColor: TONE_COLOR[tone] }}
        />
      </div>
    </div>
  )
}
