'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safeGet, safeSet, safeRemove } from './storage'

/**
 * Timed mock mode's own store (spec 6.8).
 *
 * Deliberately NOT a slice of `useProgress`. That blob is the 180-day record —
 * what you have completed, what you can say out loud, how many hours you put
 * in — and it is exported, imported and migrated as one unit. A half-finished
 * 25-minute drill is transient session state with a completely different
 * lifetime: it is meaningless a day later, it must survive a reload, and
 * losing it should never be able to corrupt six months of progress. So it
 * lives under its own key, with its own hydration flag, and the two stores
 * never read each other.
 *
 * The honesty rule for everything below: elapsed time is derived from wall
 * clock timestamps, never accumulated from ticks. A backgrounded tab stops
 * firing intervals and animation frames; `Date.now()` does not care.
 */

export type MockKind = 'coding' | 'design' | 'behavioural'

export const MOCK_KINDS: MockKind[] = ['coding', 'design', 'behavioural']

export function isMockKind(value: string): value is MockKind {
  return (MOCK_KINDS as string[]).includes(value)
}

/** How many finished drills to keep. Enough to see a trend, small enough to read. */
export const HISTORY_LIMIT = 24

export interface MockSession {
  id: string
  kind: MockKind
  itemId: string
  label: string
  /** The time box in milliseconds. Overrunning it is allowed and recorded. */
  budgetMs: number
  /** Wall clock at the moment the drill started. */
  startedAt: number
  /** Wall clock at the moment it was paused, or null while running. */
  pausedAt: number | null
  /** Total milliseconds spent paused across the whole session. */
  pausedMs: number
  /** How many times it was paused. Three pauses is not a clean 25 minutes. */
  pauses: number
  /** Elapsed-ms readings at which each design phase was closed. */
  phaseMarks: number[]
  /** Ticked communication-script step ids, for the coding drill. */
  script: string[]
  /** Frozen elapsed ms once the drill ends, or null while it is live. */
  endedAt: number | null
  revealed: boolean
}

export interface MockPhaseResult {
  name: string
  budgetMs: number
  actualMs: number
}

export interface MockRecord {
  id: string
  kind: MockKind
  itemId: string
  label: string
  /** Wall clock when the drill finished. */
  finishedAt: number
  budgetMs: number
  elapsedMs: number
  pausedMs: number
  pauses: number
  /** Per-phase outcome, for design drills. Empty for the other two kinds. */
  phases: MockPhaseResult[]
}

/* --------------------------------------------------------------------------
 * Pure time maths. Exported because these are the parts worth testing without
 * a DOM, and the parts a wrong answer in would quietly lie to the user.
 * ------------------------------------------------------------------------ */

/**
 * Milliseconds of drill time that have actually passed.
 *
 * Anchored to `Date.now()`, so a tab switch, a sleeping laptop, or a reload
 * all resolve to the same number the wall clock would give. While paused the
 * anchor freezes at `pausedAt`; once ended the frozen value is authoritative.
 */
export function elapsedOf(session: MockSession, now: number): number {
  if (session.endedAt !== null) return session.endedAt
  const anchor = session.pausedAt ?? now
  return Math.max(0, anchor - session.startedAt - session.pausedMs)
}

export function isRunning(session: MockSession | null): boolean {
  return session !== null && session.endedAt === null && session.pausedAt === null
}

/**
 * `MM:SS` counting down, or `+MM:SS` once the box is blown.
 *
 * The countdown rounds UP, the way every clock does: a 25-minute box reads
 * 25:00 for its first second rather than flicking to 24:59 the instant you
 * press start. Overtime rounds down for the same reason — the first second
 * past zero should read +00:00, not +00:01.
 */
export function formatClock(remainingMs: number): string {
  const over = remainingMs < 0
  const total = over
    ? Math.floor(-remainingMs / 1000)
    : Math.ceil(remainingMs / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${over ? '+' : ''}${mm}:${ss}`
}

/** Human duration for the history rows: `24m 08s`, or `48s` under a minute. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return m === 0 ? `${s}s` : `${m}m ${String(s).padStart(2, '0')}s`
}

/**
 * How close to the end counts as "nearly out of time".
 *
 * A tenth of the box, capped at two minutes, floored at thirty seconds. On a
 * 2-minute behavioural answer that is the last 30 seconds; on a 60-minute
 * design round it is the last 2 minutes, not the last 6.
 */
export function warningThresholdMs(budgetMs: number): number {
  return Math.min(120_000, Math.max(30_000, Math.round(budgetMs * 0.1)))
}

export type TimerTone = 'calm' | 'nearly' | 'over'

export function toneFor(remainingMs: number, budgetMs: number): TimerTone {
  if (remainingMs <= 0) return 'over'
  if (remainingMs <= warningThresholdMs(budgetMs)) return 'nearly'
  return 'calm'
}

/* --------------------------------------------------------------------------
 * Design phase budget
 * ------------------------------------------------------------------------ */

export const PHASE_KEYS = [
  'requirements', 'estimates', 'apiAndData', 'architecture', 'deepDive', 'wrapUp',
] as const

export type PhaseKey = (typeof PHASE_KEYS)[number]

export const PHASE_LABELS: Record<PhaseKey, string> = {
  requirements: 'Requirements',
  estimates: 'Estimates',
  apiAndData: 'API & data model',
  architecture: 'Architecture',
  deepDive: 'Deep dive',
  wrapUp: 'Wrap-up',
}

export interface Phase {
  key: PhaseKey
  name: string
  budgetMs: number
  /** Elapsed-ms offset at which this phase is scheduled to start and end. */
  startMs: number
  endMs: number
}

/** Turn a question's `delivery.budget` (minutes per phase) into a running schedule. */
export function phasesOf(budget: Record<PhaseKey, number>): Phase[] {
  let cursor = 0
  return PHASE_KEYS.map((key) => {
    const budgetMs = budget[key] * 60_000
    const startMs = cursor
    cursor += budgetMs
    return { key, name: PHASE_LABELS[key], budgetMs, startMs, endMs: cursor }
  })
}

/**
 * Which phase the clock says you should be in, regardless of which one you
 * are actually in. Clamped to the last phase once the box is blown — the
 * schedule has no opinion about overtime beyond "you are in wrap-up".
 */
export function scheduledPhaseIndex(phases: Phase[], elapsedMs: number): number {
  for (let i = 0; i < phases.length; i += 1) {
    if (elapsedMs < phases[i].endMs) return i
  }
  return phases.length - 1
}

/**
 * Actual milliseconds spent in each phase so far.
 *
 * Closed phases come from the marks; the phase you are in runs to `elapsedMs`;
 * phases you have not reached are zero. This is the whole point of the design
 * drill: it is the only way to say "you spent 19 minutes on requirements"
 * afterwards.
 */
export function phaseActuals(phases: Phase[], marks: number[], elapsedMs: number): number[] {
  const current = Math.min(marks.length, phases.length - 1)
  return phases.map((_, i) => {
    const from = i === 0 ? 0 : (marks[i - 1] ?? 0)
    if (i < marks.length) return Math.max(0, marks[i] - from)
    if (i === current) return Math.max(0, elapsedMs - from)
    return 0
  })
}

/** Names of the phases that ran past their budget. The weak-spot signal. */
export function overrunNames(results: MockPhaseResult[]): string[] {
  return results.filter((p) => p.actualMs > p.budgetMs).map((p) => p.name)
}

/* --------------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------------ */

export const MOCK_STORAGE_KEY = 'aeg.mock.v1'

function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export interface StartInput {
  kind: MockKind
  itemId: string
  label: string
  budgetMs: number
}

interface MockState {
  active: MockSession | null
  history: MockRecord[]
  start: (input: StartInput, now?: number) => void
  pause: (now?: number) => void
  resume: (now?: number) => void
  toggleScriptStep: (stepId: string) => void
  advancePhase: (elapsedMs: number) => void
  /** End the timed portion, freeze the clock and write the history row. */
  end: (elapsedMs: number, phases?: MockPhaseResult[], now?: number) => void
  discard: () => void
  clearHistory: () => void
}

export const useMock = create<MockState>()(
  persist(
    (set) => ({
      active: null,
      history: [],

      start: (input, now = Date.now()) =>
        set({
          active: {
            id: newId(),
            kind: input.kind,
            itemId: input.itemId,
            label: input.label,
            budgetMs: input.budgetMs,
            startedAt: now,
            pausedAt: null,
            pausedMs: 0,
            pauses: 0,
            phaseMarks: [],
            script: [],
            endedAt: null,
            revealed: false,
          },
        }),

      pause: (now = Date.now()) =>
        set((s) => {
          const a = s.active
          if (!a || a.endedAt !== null || a.pausedAt !== null) return s
          return { active: { ...a, pausedAt: now, pauses: a.pauses + 1 } }
        }),

      resume: (now = Date.now()) =>
        set((s) => {
          const a = s.active
          if (!a || a.endedAt !== null || a.pausedAt === null) return s
          return {
            active: { ...a, pausedAt: null, pausedMs: a.pausedMs + Math.max(0, now - a.pausedAt) },
          }
        }),

      toggleScriptStep: (stepId) =>
        set((s) => {
          const a = s.active
          if (!a) return s
          const script = a.script.includes(stepId)
            ? a.script.filter((id) => id !== stepId)
            : [...a.script, stepId]
          return { active: { ...a, script } }
        }),

      advancePhase: (elapsedMs) =>
        set((s) => {
          const a = s.active
          if (!a || a.endedAt !== null) return s
          return { active: { ...a, phaseMarks: [...a.phaseMarks, elapsedMs] } }
        }),

      end: (elapsedMs, phases = [], now = Date.now()) =>
        set((s) => {
          const a = s.active
          // Idempotent: ending an already-ended session must never append a
          // second history row for the same drill.
          if (!a || a.endedAt !== null) return s
          const record: MockRecord = {
            id: a.id,
            kind: a.kind,
            itemId: a.itemId,
            label: a.label,
            finishedAt: now,
            budgetMs: a.budgetMs,
            elapsedMs,
            pausedMs: a.pausedMs,
            pauses: a.pauses,
            phases,
          }
          return {
            active: { ...a, endedAt: elapsedMs, pausedAt: null, revealed: true },
            history: [record, ...s.history].slice(0, HISTORY_LIMIT),
          }
        }),

      discard: () => set({ active: null }),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: MOCK_STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: safeGet,
        setItem: safeSet,
        removeItem: safeRemove,
      })),
      partialize: (s) => ({ active: s.active, history: s.history }),
    },
  ),
)

/* --------------------------------------------------------------------------
 * Hooks
 * ------------------------------------------------------------------------ */

let mockHydrated = false

const subscribeHydration = (onStoreChange: () => void) =>
  useMock.persist.onFinishHydration(() => {
    mockHydrated = true
    onStoreChange()
  })

const getHydration = () => mockHydrated || useMock.persist.hasHydrated()

/** Server markup cannot know what is in storage, so it renders unhydrated. */
export function useMockHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, getHydration, () => false)
}

/** How often the readout re-reads the clock. Twice a second keeps the seconds honest. */
const TICK_MS = 500

/**
 * The wall clock is an external system, so it is read as one.
 *
 * The cache exists because `useSyncExternalStore` requires a snapshot that is
 * stable between notifications — `() => Date.now()` would return a different
 * value on every call and spin. The interval only decides how often we LOOK
 * at the clock; it never decides what time it is, so a throttled background
 * tab that fires twice in twenty minutes still produces a correct readout.
 * `visibilitychange` and `focus` re-read immediately, so coming back to the
 * tab is never a second stale.
 */
let clockNow = 0

function readClock(): number {
  return clockNow
}

/** Stable across the server render; nothing timed is rendered before hydration. */
function readClockOnServer(): number {
  return 0
}

export function useNow(running: boolean): number {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Re-reading here means flipping from paused to running refreshes the
      // readout on the spot rather than up to one tick later.
      clockNow = Date.now()
      if (!running) return () => {}

      const tick = () => {
        clockNow = Date.now()
        onStoreChange()
      }
      const id = window.setInterval(tick, TICK_MS)
      document.addEventListener('visibilitychange', tick)
      window.addEventListener('focus', tick)
      return () => {
        window.clearInterval(id)
        document.removeEventListener('visibilitychange', tick)
        window.removeEventListener('focus', tick)
      }
    },
    [running],
  )

  return useSyncExternalStore(subscribe, readClock, readClockOnServer)
}
