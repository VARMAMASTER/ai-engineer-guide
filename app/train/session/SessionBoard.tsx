'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import Chip from '@/components/ui/Chip'
import Stat from '@/components/ui/Stat'
import { createClient } from '@/lib/db/client'
import { todayIso } from '@/lib/date'
import { sessionTonnage } from '@/lib/train/analytics'
import { deleteSet, ensureSession, insertSet, newId, nextPlanDayIndex } from '@/lib/train/data'
import { exerciseById } from '@/lib/train/exercises'
import {
  DEFAULT_REP_RANGE,
  MAX_LOAD_INCREASE_KG,
  suggestNextSession,
  type TrainingSuggestion,
} from '@/lib/train/progression'
import { trainSummary } from '@/lib/train/summary'
import type { LoggedSet, Plan, Session, TrainingProfile } from '@/lib/train/types'
import { formatKg } from '../labels'
import ExerciseLogger, { type SetDraft } from './ExerciseLogger'

/**
 * Put `value` back at `index`, without mutating. `Array.prototype.toSpliced` is
 * the same thing in one call, and is deliberately not used: it is ES2023 and
 * this project's `lib` target does not include it, so it would typecheck only
 * by widening the whole build's assumptions for one undo path.
 */
function insertAt<T>(list: T[], index: number, value: T): T[] {
  const out = [...list]
  out.splice(index, 0, value)
  return out
}

/** Nothing to subscribe to: the date changes on a reload, not on an event. */
const subscribeToNothing = () => () => {}

/**
 * The browser's calendar date, with the server's used for the server render.
 *
 * `useSyncExternalStore` rather than `useState` + an effect, which is the same
 * shape `lib/progress/useHydrated.ts` uses and for the same reason: this is a
 * value the server cannot know (its clock is UTC on a deployment; a 21:30
 * workout in IST is already tomorrow there), so it has to differ between the
 * two renders WITHOUT being a hydration mismatch. That is exactly the hook's
 * job, and it avoids the cascading render an effect-then-setState would cost.
 *
 * `todayIso` returns a fresh string each call, which is fine — `Object.is` on
 * two equal strings is true, so the store never reports a change it has not had.
 */
function useLocalToday(serverToday: string): string {
  return useSyncExternalStore(subscribeToNothing, todayIso, () => serverToday)
}

export interface SessionBoardProps {
  userId: string
  plan: Plan
  profile: TrainingProfile | null
  initialSessions: Session[]
  initialSetIds: Record<string, string[]>
  dayLabels: Record<string, string>
  /** The server's calendar date, used for the first paint only — see below. */
  serverToday: string
}

/**
 * Today's session: the due day, its exercises, and one button per set.
 *
 * WHICH DAY "TODAY" IS. The server renders with its own calendar date, which
 * on a deployment is UTC — for a 21:30 workout in IST that is already tomorrow.
 * So the first paint uses the server's date (no hydration mismatch, and the
 * page is readable with JavaScript off) and an effect immediately replaces it
 * with the browser's. A session belongs to the local evening it happened in,
 * because that is what every weekly analytic in `lib/train/analytics.ts` buckets
 * by and what a person means by "yesterday".
 *
 * WRITES ARE OPTIMISTIC. The set appears the instant it is tapped and the
 * database catches up; a failure puts it back and says so. Between sets there
 * is no patience for a round trip, and a button that greys out for 400ms on gym
 * wifi gets pressed twice.
 */
export default function SessionBoard({
  userId,
  plan,
  profile,
  initialSessions,
  initialSetIds,
  dayLabels,
  serverToday,
}: SessionBoardProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [setIds, setSetIds] = useState<Record<string, string[]>>(initialSetIds)
  const today = useLocalToday(serverToday)
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  const todaySession = useMemo(() => sessions.find((s) => s.date === today), [sessions, today])
  /** Everything before today. The target you walked in with is computed from this. */
  const priorSessions = useMemo(() => sessions.filter((s) => s.date !== today), [sessions, today])

  const dueIndex = useMemo(
    () => nextPlanDayIndex(plan, priorSessions, dayLabels),
    [plan, priorSessions, dayLabels],
  )
  // The day actually being trained. Defaults to what is due and stays where the
  // user put it — a busy gym is the normal reason to do Pull on a Push day, and
  // silently re-deciding it on every state change would be maddening.
  const [chosenIndex, setChosenIndex] = useState<number | null>(null)
  const activeIndex = useMemo(() => {
    if (chosenIndex !== null) return chosenIndex
    // A session already started today was started against a day; stay on it.
    const startedLabel = todaySession ? dayLabels[todaySession.id] : undefined
    if (startedLabel) {
      const index = plan.days.findIndex((d) => d.label === startedLabel)
      if (index >= 0) return index
    }
    return dueIndex
  }, [chosenIndex, todaySession, dayLabels, plan.days, dueIndex])
  const day = plan.days[activeIndex] ?? plan.days[0]

  const headline = useMemo(() => {
    if (!profile) return null
    return trainSummary({ profile, plan, sessions, today }).headline
  }, [profile, plan, sessions, today])

  const setsToday = todaySession?.sets.length ?? 0
  const tonnageToday = todaySession ? sessionTonnage(todaySession) : 0

  function entriesFor(exerciseId: string): { set: LoggedSet; id: string }[] {
    if (!todaySession) return []
    const ids = setIds[todaySession.id] ?? []
    return todaySession.sets
      .map((set, index) => ({ set, id: ids[index] ?? `${todaySession.id}-${index}` }))
      .filter((entry) => entry.set.exerciseId === exerciseId)
  }

  function defaultDraft(exerciseId: string, target: TrainingSuggestion): SetDraft {
    // Repeating the last set is the overwhelmingly common next action, so the
    // controls start there once there is one. Before that, the suggestion.
    const logged = entriesFor(exerciseId)
    const last = logged[logged.length - 1]
    if (last) return { reps: last.set.reps, load: last.set.load, rpe: last.set.rpe ?? null }
    if (target.kind === 'insufficient_data') return { reps: DEFAULT_REP_RANGE[0], load: 0, rpe: null }
    return { reps: target.suggestedReps, load: target.suggestedLoad, rpe: null }
  }

  async function logSet(exerciseId: string, draft: SetDraft) {
    setBusy(true)
    setError(null)

    const sessionId = todaySession?.id ?? newId()
    const setId = newId()
    const set: LoggedSet = {
      exerciseId,
      reps: draft.reps,
      load: draft.load,
      ...(draft.rpe === null ? {} : { rpe: draft.rpe }),
      timestamp: new Date().toISOString(),
    }

    setSessions((current) => {
      const existing = current.find((s) => s.id === sessionId)
      if (existing) {
        return current.map((s) => (s.id === sessionId ? { ...s, sets: [...s.sets, set] } : s))
      }
      return [...current, { id: sessionId, date: today, sets: [set] }]
    })
    setSetIds((current) => ({ ...current, [sessionId]: [...(current[sessionId] ?? []), setId] }))
    setDrafts((current) => ({ ...current, [exerciseId]: draft }))

    try {
      const db = createClient()
      await ensureSession(db, userId, { id: sessionId, date: today, dayLabel: day?.label })
      await insertSet(db, userId, sessionId, setId, set)
      setStatus(`Logged ${set.reps} reps at ${set.load} kg.`)
    } catch (cause) {
      // Put it back. A set that looks logged and is not is worse than an error.
      setSessions((current) =>
        current
          .map((s) => (s.id === sessionId ? { ...s, sets: s.sets.filter((x) => x !== set) } : s))
          .filter((s) => s.sets.length > 0 || s.id !== sessionId),
      )
      setSetIds((current) => ({
        ...current,
        [sessionId]: (current[sessionId] ?? []).filter((id) => id !== setId),
      }))
      setError(cause instanceof Error ? cause.message : 'That set did not save. Try it again.')
    } finally {
      setBusy(false)
    }
  }

  async function removeSet(sessionId: string, setId: string) {
    setBusy(true)
    setError(null)
    const index = (setIds[sessionId] ?? []).indexOf(setId)
    const removed = index >= 0 ? sessions.find((s) => s.id === sessionId)?.sets[index] : undefined

    setSessions((current) =>
      current.map((s) =>
        s.id === sessionId ? { ...s, sets: s.sets.filter((_, i) => i !== index) } : s,
      ),
    )
    setSetIds((current) => ({
      ...current,
      [sessionId]: (current[sessionId] ?? []).filter((id) => id !== setId),
    }))

    try {
      await deleteSet(createClient(), userId, setId)
      setStatus('Set removed.')
    } catch (cause) {
      if (removed && index >= 0) {
        setSessions((current) =>
          current.map((s) => (s.id === sessionId ? { ...s, sets: insertAt(s.sets, index, removed) } : s)),
        )
        setSetIds((current) => ({
          ...current,
          [sessionId]: insertAt(current[sessionId] ?? [], index, setId),
        }))
      }
      setError(cause instanceof Error ? cause.message : 'That set could not be removed.')
    } finally {
      setBusy(false)
    }
  }

  const exercises = (day?.exerciseIds ?? [])
    .map((id) => exerciseById(id))
    .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise))

  return (
    <div className="flex flex-col gap-5">
      <section className="panel flex flex-col gap-4 p-4" aria-labelledby="train-due">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="eyebrow">Due next</p>
          <h2 id="train-due" className="font-[family-name:var(--font-display)] text-lg">
            {day?.label ?? 'Your session'}
          </h2>
          {headline ? <p className="text-sm text-[var(--text-muted)]">{headline}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat value={setsToday} label="Sets today" data-testid="train-sets-today" />
          <Stat value={formatKg(tonnageToday)} label="Tonnage today" />
        </div>

        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="eyebrow mb-2">Doing a different day?</legend>
          <div className="flex flex-wrap gap-2">
            {plan.days.map((planDay, index) => (
              <Chip
                key={`${planDay.label}-${index}`}
                pressed={index === activeIndex}
                onClick={() => setChosenIndex(index)}
                data-testid={`train-day-${index}`}
              >
                {planDay.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      </section>

      <p className="hint" data-testid="train-load-cap">
        A suggestion never adds more than {MAX_LOAD_INCREASE_KG} kg in one session. The cap is
        applied last and to every rule, because a suggestion of +20 kg is not a bad number, it is an
        injury.
      </p>

      {error ? (
        <p className="field-error" role="alert" data-testid="train-error">
          {error}
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {exercises.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          This day has no exercises — the constraints ruled everything out.{' '}
          <Link href="/train/plan" className="underline">
            Loosen them on the plan page
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {exercises.map((exercise) => {
            const target = suggestNextSession(priorSessions, exercise.id)
            const entries = entriesFor(exercise.id)
            const draft = drafts[exercise.id] ?? defaultDraft(exercise.id, target)
            return (
              <ExerciseLogger
                key={exercise.id}
                exercise={exercise}
                todaySets={entries}
                target={target}
                nextTime={entries.length > 0 ? suggestNextSession(sessions, exercise.id) : null}
                draft={draft}
                onDraft={(patch) =>
                  setDrafts((current) => ({
                    ...current,
                    [exercise.id]: { ...(current[exercise.id] ?? draft), ...patch },
                  }))
                }
                onLog={() => void logSet(exercise.id, draft)}
                onRemove={(setId) => void removeSet(todaySession?.id ?? '', setId)}
                busy={busy}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
