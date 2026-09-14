import { describe, it, expect } from 'vitest'
import {
  dayLabelsFromRows,
  nextPlanDayIndex,
  planFromRow,
  profileFromRow,
  profileToRow,
  rowsToSessions,
  type TrainSessionRow,
  type TrainSetRow,
} from '@/lib/train/data'
import { generatePlan } from '@/lib/train/plan'
import type { Session, TrainingProfile } from '@/lib/train/types'

const profile: TrainingProfile = {
  goal: 'hypertrophy',
  experience: 'beginner',
  availableDays: 3,
  equipment: ['barbell', 'bodyweight'],
  injuries: [],
}

function sessionRow(id: string, date: string, label?: string): TrainSessionRow {
  return { session_id: id, session_date: date, day_label: label ?? null }
}

function setRow(over: Partial<TrainSetRow> & { set_id: string; session_id: string }): TrainSetRow {
  return {
    exercise_id: 'barbell-bench-press',
    reps: 8,
    load_kg: 40,
    rpe: null,
    performed_at: '2026-09-10T10:00:00.000Z',
    ...over,
  }
}

describe('rowsToSessions', () => {
  it('groups sets under their session and returns sessions oldest first', () => {
    const { sessions } = rowsToSessions(
      [sessionRow('s2', '2026-09-12'), sessionRow('s1', '2026-09-10')],
      [
        setRow({ set_id: 'a', session_id: 's1' }),
        setRow({ set_id: 'b', session_id: 's2', performed_at: '2026-09-12T10:00:00.000Z' }),
      ],
    )
    expect(sessions.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(sessions[0].sets).toHaveLength(1)
    expect(sessions[1].sets).toHaveLength(1)
  })

  it('keeps set ids positionally aligned with the sets they belong to', () => {
    const { sessions, setIds } = rowsToSessions(
      [sessionRow('s1', '2026-09-10')],
      [
        setRow({ set_id: 'third', session_id: 's1', performed_at: '2026-09-10T10:20:00.000Z', reps: 3 }),
        setRow({ set_id: 'first', session_id: 's1', performed_at: '2026-09-10T10:00:00.000Z', reps: 1 }),
        setRow({ set_id: 'second', session_id: 's1', performed_at: '2026-09-10T10:10:00.000Z', reps: 2 }),
      ],
    )
    expect(sessions[0].sets.map((s) => s.reps)).toEqual([1, 2, 3])
    // This alignment is what makes "remove that set" addressable at all.
    expect(setIds.s1).toEqual(['first', 'second', 'third'])
  })

  it('breaks a timestamp tie by id so two reads never disagree on the order', () => {
    const at = '2026-09-10T10:00:00.000Z'
    const first = rowsToSessions(
      [sessionRow('s1', '2026-09-10')],
      [
        setRow({ set_id: 'b', session_id: 's1', performed_at: at, reps: 5 }),
        setRow({ set_id: 'a', session_id: 's1', performed_at: at, reps: 6 }),
      ],
    )
    const second = rowsToSessions(
      [sessionRow('s1', '2026-09-10')],
      [
        setRow({ set_id: 'a', session_id: 's1', performed_at: at, reps: 6 }),
        setRow({ set_id: 'b', session_id: 's1', performed_at: at, reps: 5 }),
      ],
    )
    expect(first.setIds.s1).toEqual(['a', 'b'])
    expect(second.setIds.s1).toEqual(first.setIds.s1)
  })

  it('drops a malformed set rather than throwing — one bad row must not blank the page', () => {
    const { sessions, setIds } = rowsToSessions(
      [sessionRow('s1', '2026-09-10')],
      [
        setRow({ set_id: 'ok', session_id: 's1' }),
        setRow({ set_id: 'bad', session_id: 's1', reps: 0, performed_at: '2026-09-10T11:00:00.000Z' }),
      ],
    )
    expect(sessions[0].sets).toHaveLength(1)
    expect(setIds.s1).toEqual(['ok'])
  })

  it('reads a numeric load that arrives as a string, and keeps 0 kg as a real load', () => {
    const { sessions } = rowsToSessions(
      [sessionRow('s1', '2026-09-10')],
      [
        setRow({ set_id: 'a', session_id: 's1', load_kg: '42.50' }),
        setRow({
          set_id: 'b',
          session_id: 's1',
          exercise_id: 'push-up',
          load_kg: 0,
          performed_at: '2026-09-10T10:05:00.000Z',
        }),
      ],
    )
    expect(sessions[0].sets[0].load).toBe(42.5)
    expect(sessions[0].sets[1].load).toBe(0)
  })

  it('keeps a session that has no sets yet', () => {
    const { sessions, setIds } = rowsToSessions([sessionRow('s1', '2026-09-10')], [])
    expect(sessions).toEqual([{ id: 's1', date: '2026-09-10', sets: [] }])
    expect(setIds.s1).toEqual([])
  })
})

describe('profileFromRow / profileToRow', () => {
  it('round-trips a profile through the row shape', () => {
    const row = profileToRow('user-1', profile, generatePlan(profile))
    expect(row.user_id).toBe('user-1')
    expect(
      profileFromRow({
        goal: row.goal as string,
        experience: row.experience as string,
        available_days: row.available_days as number,
        equipment: row.equipment as string[],
        injuries: row.injuries as string[],
        plan: row.plan,
      }),
    ).toEqual(profile)
  })

  it('reads a row whose array columns came back null as empty lists', () => {
    const read = profileFromRow({
      goal: 'strength',
      experience: 'advanced',
      available_days: 4,
      equipment: null,
      injuries: null,
      plan: null,
    })
    expect(read).toEqual({
      goal: 'strength',
      experience: 'advanced',
      availableDays: 4,
      equipment: [],
      injuries: [],
    })
  })

  it('returns null for a row this build cannot understand, rather than throwing', () => {
    expect(profileFromRow({ goal: 'powerlifting', experience: 'beginner', available_days: 3, equipment: [], injuries: [], plan: null })).toBeNull()
    expect(profileFromRow(null)).toBeNull()
  })
})

describe('planFromRow', () => {
  it('parses a stored plan', () => {
    const plan = generatePlan(profile)
    expect(planFromRow(JSON.parse(JSON.stringify(plan)))).toEqual(plan)
  })

  it('reads an unparseable plan as "no plan yet" instead of crashing the page', () => {
    expect(planFromRow(null)).toBeNull()
    expect(planFromRow({ daysPerWeek: 99 })).toBeNull()
    expect(planFromRow('a plan, honest')).toBeNull()
  })
})

describe('nextPlanDayIndex', () => {
  // Full body at 3 days: "Full Body 1/2/3", so every label is distinct and the
  // rotation is unambiguous. Upper/lower and push/pull/legs REPEAT labels by
  // design ("Upper, Lower, Upper, Lower"), and there the first match is the
  // right answer anyway — the day after any "Lower" is an "Upper".
  const plan = generatePlan(profile)

  function session(id: string, date: string): Session {
    return { id, date, sets: [] }
  }

  it('is the day after whichever day the last session was logged against', () => {
    const sessions = [session('s1', '2026-09-10')]
    const labels = dayLabelsFromRows([sessionRow('s1', '2026-09-10', plan.days[0].label)])
    expect(nextPlanDayIndex(plan, sessions, labels)).toBe(1)
  })

  it('wraps around the end of the rotation', () => {
    const last = plan.days.length - 1
    const sessions = [session('s1', '2026-09-10')]
    const labels = dayLabelsFromRows([sessionRow('s1', '2026-09-10', plan.days[last].label)])
    expect(nextPlanDayIndex(plan, sessions, labels)).toBe(0)
  })

  it('reads a repeated label as the first day carrying it, which is the same rotation', () => {
    const upperLower = generatePlan({ ...profile, availableDays: 4 })
    expect(upperLower.days.map((d) => d.label)).toEqual(['Upper', 'Lower', 'Upper', 'Lower'])
    const labels = dayLabelsFromRows([sessionRow('s1', '2026-09-10', 'Lower')])
    const next = nextPlanDayIndex(upperLower, [session('s1', '2026-09-10')], labels)
    expect(upperLower.days[next].label).toBe('Upper')
  })

  it('falls back to the first day when the last session carries no label', () => {
    expect(nextPlanDayIndex(plan, [session('s1', '2026-09-10')], {})).toBe(0)
  })

  it('falls back to the first day when the label belongs to a plan that was regenerated away', () => {
    const labels = { s1: 'A day this plan has never had' }
    expect(nextPlanDayIndex(plan, [session('s1', '2026-09-10')], labels)).toBe(0)
  })

  it('is 0 with no history and 0 with no plan', () => {
    expect(nextPlanDayIndex(plan, [], {})).toBe(0)
    expect(nextPlanDayIndex(null, [session('s1', '2026-09-10')], {})).toBe(0)
  })
})
