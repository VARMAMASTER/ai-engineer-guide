import type { SupabaseClient } from '@supabase/supabase-js'
import {
  loggedSetSchema,
  planSchema,
  trainingProfileSchema,
  type LoggedSet,
  type Plan,
  type Session,
  type TrainingProfile,
} from './types'

/**
 * Train's persistence layer: the `train_*` tables in, domain types out.
 *
 * Split the way `lib/progress/remote.ts` is split, and for the same reason.
 * Everything above `--- I/O ---` is a pure transform with no database and no
 * browser, so the code path that decides whether six weeks of logged sets come
 * back correctly is asserted directly in `tests/unit/train/data.test.ts`. The
 * I/O half underneath is deliberately thin: one query or one write each, no
 * logic, nothing worth a test that a running Postgres wouldn't answer better.
 *
 * Nothing here reads Diet, Ops or Learn — spec section 4.2. Train's own tables
 * are the only source for every number this app shows.
 *
 * A malformed row is DROPPED, never thrown on. A single bad set must not blank
 * a page that is being read one-handed in a gym; losing one row from a chart is
 * recoverable, losing the whole screen mid-session is not.
 */

export const TRAIN_PROFILE_TABLE = 'train_profile'
export const TRAIN_SESSION_TABLE = 'train_session'
export const TRAIN_SET_TABLE = 'train_set'

export interface TrainProfileRow {
  goal: string
  experience: string
  available_days: number
  equipment: string[] | null
  injuries: string[] | null
  plan: unknown
}

export interface TrainSessionRow {
  session_id: string
  session_date: string
  day_label: string | null
}

export interface TrainSetRow {
  set_id: string
  session_id: string
  exercise_id: string
  reps: number
  load_kg: number | string
  rpe: number | string | null
  performed_at: string
}

/** Everything one signed-in user's Train app needs, in one shape. */
export interface TrainState {
  profile: TrainingProfile | null
  plan: Plan | null
  /** Chronological, oldest first — the order every analytic in this app expects. */
  sessions: Session[]
  /** `sessionId` -> the plan day it was logged against, where one was recorded. */
  dayLabels: Record<string, string>
  /**
   * `sessionId` -> the row id of each set, positionally aligned with that
   * session's `sets` array.
   *
   * `LoggedSet` has no id, and giving it one would change a type the whole of
   * `lib/train` is already tested against. So the ids ride alongside instead,
   * built in the same pass and the same order as the sets themselves — which is
   * what makes "remove that set" addressable at all. Without this, undo could
   * only ever reach sets logged in this browser session, and the one a person
   * most wants to delete is the mistyped one they see after a reload.
   */
  setIds: Record<string, string[]>
}

export function emptyTrainState(): TrainState {
  return { profile: null, plan: null, sessions: [], dayLabels: {}, setIds: {} }
}

// ---------------------------------------------------------------------------
// Pure transforms
// ---------------------------------------------------------------------------

/**
 * `numeric` arrives as a JSON number from PostgREST, but a hand-written row, a
 * fixture or a future driver change can hand back a string. Coerced once, here,
 * rather than in four call sites that would each get it right until one didn't.
 */
function toNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function profileFromRow(row: TrainProfileRow | null | undefined): TrainingProfile | null {
  if (!row) return null
  const parsed = trainingProfileSchema.safeParse({
    goal: row.goal,
    experience: row.experience,
    availableDays: row.available_days,
    equipment: row.equipment ?? [],
    injuries: row.injuries ?? [],
  })
  return parsed.success ? parsed.data : null
}

/**
 * The plan is stored as a document, so it is the one column that can hold a
 * shape this build does not understand (an older plan, a hand-edited row).
 * Parsed rather than trusted; an unparseable plan reads as "no plan yet", which
 * the UI already knows how to handle, instead of as a crash.
 */
export function planFromRow(value: unknown): Plan | null {
  if (value === null || value === undefined) return null
  const parsed = planSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function profileToRow(
  userId: string,
  profile: TrainingProfile,
  plan: Plan,
): Record<string, unknown> {
  return {
    user_id: userId,
    goal: profile.goal,
    experience: profile.experience,
    available_days: profile.availableDays,
    equipment: profile.equipment,
    injuries: profile.injuries,
    plan,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Sessions and their sets, joined in memory rather than by the database.
 *
 * Two flat selects and a group-by here beats a nested PostgREST embed: the
 * embed's shape changes with the relationship, it is harder to assert on, and
 * this join is over a few hundred rows at the very most.
 */
export function rowsToSessions(
  sessionRows: TrainSessionRow[],
  setRows: TrainSetRow[],
): { sessions: Session[]; setIds: Record<string, string[]> } {
  const bySession = new Map<string, { set: LoggedSet; id: string }[]>()
  for (const row of setRows) {
    const parsed = loggedSetSchema.safeParse({
      exerciseId: row.exercise_id,
      reps: row.reps,
      load: toNumber(row.load_kg) ?? 0,
      rpe: toNumber(row.rpe),
      timestamp: row.performed_at,
    })
    if (!parsed.success) continue
    const entry = { set: parsed.data, id: row.set_id }
    const list = bySession.get(row.session_id)
    if (list) list.push(entry)
    else bySession.set(row.session_id, [entry])
  }

  // Two sets logged in the same second would otherwise come back in whatever
  // order Postgres felt like; the id break makes the order total and stable, so
  // `setIds[i]` never drifts from `sets[i]` between two reads.
  for (const list of bySession.values()) {
    list.sort((a, b) => a.set.timestamp.localeCompare(b.set.timestamp) || a.id.localeCompare(b.id))
  }

  const ordered = [...sessionRows].sort(
    (a, b) => a.session_date.localeCompare(b.session_date) || a.session_id.localeCompare(b.session_id),
  )

  const sessions: Session[] = []
  const setIds: Record<string, string[]> = {}
  for (const row of ordered) {
    const entries = bySession.get(row.session_id) ?? []
    sessions.push({ id: row.session_id, date: row.session_date, sets: entries.map((e) => e.set) })
    setIds[row.session_id] = entries.map((e) => e.id)
  }
  return { sessions, setIds }
}

export function dayLabelsFromRows(sessionRows: TrainSessionRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of sessionRows) {
    if (row.day_label) out[row.session_id] = row.day_label
  }
  return out
}

/**
 * Which plan day is due next.
 *
 * The rule is "the one after whatever you did last", which is what a rotation
 * means. `lib/train/summary.ts` reaches the same answer by overlapping logged
 * exercise ids against each day, because a summary is computed from sessions
 * alone; here the session rows carry the label they were logged against, so
 * this can read it directly instead of inferring it. The two agree — this one
 * is simply not guessing.
 *
 * A session with no recorded label (or a label the plan no longer has, after a
 * regenerate) falls back to the first day rather than to nothing: a plan that
 * cannot say what is due is a plan you stop opening.
 */
export function nextPlanDayIndex(
  plan: Plan | null,
  sessions: Session[],
  dayLabels: Record<string, string>,
): number {
  if (!plan || plan.days.length === 0) return 0
  const last = sessions[sessions.length - 1]
  if (!last) return 0
  const label = dayLabels[last.id]
  if (!label) return 0
  const index = plan.days.findIndex((day) => day.label === label)
  if (index < 0) return 0
  return (index + 1) % plan.days.length
}

/** A stable id for a new session or set, minted in the browser. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/**
 * Deliberately untyped against a generated `Database`: this project has no
 * generated types checked in, and inventing a partial one here would be a
 * second, silently-drifting copy of the migration.
 */
type Db = SupabaseClient

/** Rows are scoped by RLS, not by a `where` clause — see the migration's header. */
export async function fetchTrainState(db: Db): Promise<TrainState> {
  const [profileResult, sessionResult, setResult] = await Promise.all([
    db.from(TRAIN_PROFILE_TABLE).select('goal, experience, available_days, equipment, injuries, plan').maybeSingle(),
    db.from(TRAIN_SESSION_TABLE).select('session_id, session_date, day_label'),
    db.from(TRAIN_SET_TABLE).select('set_id, session_id, exercise_id, reps, load_kg, rpe, performed_at'),
  ])

  const error = profileResult.error ?? sessionResult.error ?? setResult.error
  if (error) throw new Error(error.message)

  const profileRow = (profileResult.data ?? null) as TrainProfileRow | null
  const sessionRows = (sessionResult.data ?? []) as TrainSessionRow[]
  const setRows = (setResult.data ?? []) as TrainSetRow[]
  const { sessions, setIds } = rowsToSessions(sessionRows, setRows)

  return {
    profile: profileFromRow(profileRow),
    plan: planFromRow(profileRow?.plan),
    sessions,
    setIds,
    dayLabels: dayLabelsFromRows(sessionRows),
  }
}

export async function saveProfileAndPlan(
  db: Db,
  userId: string,
  profile: TrainingProfile,
  plan: Plan,
): Promise<void> {
  const { error } = await db
    .from(TRAIN_PROFILE_TABLE)
    .upsert(profileToRow(userId, profile, plan), { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

/**
 * Create the session row a set is about to hang off.
 *
 * `ignoreDuplicates` rather than a replace: re-running this for a session that
 * already exists must not rewrite its date or its label, because the second
 * caller is a retry after a flaky connection, not a correction.
 */
export async function ensureSession(
  db: Db,
  userId: string,
  session: { id: string; date: string; dayLabel?: string },
): Promise<void> {
  const { error } = await db.from(TRAIN_SESSION_TABLE).upsert(
    {
      user_id: userId,
      session_id: session.id,
      session_date: session.date,
      day_label: session.dayLabel ?? null,
    },
    { onConflict: 'user_id,session_id', ignoreDuplicates: true },
  )
  if (error) throw new Error(error.message)
}

export async function insertSet(
  db: Db,
  userId: string,
  sessionId: string,
  setId: string,
  set: LoggedSet,
): Promise<void> {
  const { error } = await db.from(TRAIN_SET_TABLE).insert({
    user_id: userId,
    set_id: setId,
    session_id: sessionId,
    exercise_id: set.exerciseId,
    reps: set.reps,
    load_kg: set.load,
    rpe: set.rpe ?? null,
    performed_at: set.timestamp,
  })
  if (error) throw new Error(error.message)
}

export async function deleteSet(db: Db, userId: string, setId: string): Promise<void> {
  const { error } = await db.from(TRAIN_SET_TABLE).delete().eq('user_id', userId).eq('set_id', setId)
  if (error) throw new Error(error.message)
}
