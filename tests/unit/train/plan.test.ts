import { describe, it, expect } from 'vitest'
import { generatePlan } from '@/lib/train/plan'
import { exerciseById } from '@/lib/train/exercises'
import type { TrainingProfile } from '@/lib/train/types'

function profile(overrides: Partial<TrainingProfile> = {}): TrainingProfile {
  return {
    goal: 'hypertrophy',
    experience: 'beginner',
    availableDays: 3,
    equipment: ['barbell', 'dumbbell', 'bodyweight', 'machine', 'cable'],
    injuries: [],
    ...overrides,
  }
}

function allIds(plan: ReturnType<typeof generatePlan>): string[] {
  return plan.days.flatMap((d) => d.exerciseIds)
}

describe('generatePlan — split selection', () => {
  it('uses full body at 2-3 days', () => {
    expect(generatePlan(profile({ availableDays: 2 })).split).toBe('full_body')
    expect(generatePlan(profile({ availableDays: 3 })).split).toBe('full_body')
  })

  it('uses upper/lower at 4 days', () => {
    const plan = generatePlan(profile({ availableDays: 4 }))
    expect(plan.split).toBe('upper_lower')
    expect(plan.days.map((d) => d.label)).toEqual(['Upper', 'Lower', 'Upper', 'Lower'])
  })

  it('uses push/pull/legs at 5-6 days', () => {
    const five = generatePlan(profile({ availableDays: 5 }))
    expect(five.split).toBe('push_pull_legs')
    expect(five.days.map((d) => d.label)).toEqual(['Push', 'Pull', 'Legs', 'Push', 'Pull'])

    const six = generatePlan(profile({ availableDays: 6 }))
    expect(six.days.map((d) => d.label)).toEqual(['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'])
  })
})

describe('generatePlan — day-count clamping', () => {
  it('clamps a requested day count below the minimum and notes it', () => {
    const plan = generatePlan(profile({ availableDays: 0 }))
    expect(plan.daysPerWeek).toBe(2)
    expect(plan.notes.some((n) => n.includes('clamped to the minimum'))).toBe(true)
  })

  it('clamps a requested day count above the maximum and notes it', () => {
    const plan = generatePlan(profile({ availableDays: 10 }))
    expect(plan.daysPerWeek).toBe(6)
    expect(plan.notes.some((n) => n.includes('clamped to the maximum'))).toBe(true)
  })
})

describe('generatePlan — equipment respected', () => {
  it('never includes a barbell exercise in a dumbbell-only plan', () => {
    const plan = generatePlan(profile({ equipment: ['dumbbell'], availableDays: 5 }))
    const barbellExercises = allIds(plan)
      .map((id) => exerciseById(id))
      .filter((e) => e?.equipment === 'barbell')
    expect(barbellExercises).toHaveLength(0)
  })

  it('treats no equipment as bodyweight-only rather than an empty plan', () => {
    const plan = generatePlan(profile({ equipment: [], availableDays: 3 }))
    const ids = allIds(plan)
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(exerciseById(id)?.equipment).toBe('bodyweight')
    }
  })
})

describe('generatePlan — injuries exclude movement patterns, not named exercises', () => {
  it('a shoulder injury rules out overhead pressing generally, not one named exercise', () => {
    const plan = generatePlan(profile({ injuries: ['shoulder'], availableDays: 6 }))
    const ids = new Set(allIds(plan))
    // Every exercise expressing the vertical_push (overhead press) pattern
    // must be absent, whichever piece of equipment it uses.
    for (const id of ['barbell-overhead-press', 'dumbbell-shoulder-press', 'pike-push-up', 'machine-shoulder-press']) {
      expect(ids.has(id)).toBe(false)
    }
  })

  it('a knee injury excludes both squats and lunges', () => {
    const plan = generatePlan(profile({ injuries: ['knee'], availableDays: 6 }))
    const patterns = allIds(plan).map((id) => exerciseById(id)?.pattern)
    expect(patterns).not.toContain('squat')
    expect(patterns).not.toContain('lunge')
  })

  it('conflicting injuries that exclude nearly everything still produce a plan, not a crash', () => {
    const plan = generatePlan(
      profile({
        injuries: ['shoulder', 'knee', 'lower_back', 'elbow', 'hip'],
        equipment: ['dumbbell'],
        availableDays: 3,
      }),
    )
    // It must not throw (implicit — we got here), must still return a day
    // per requested day, and must document every gap it could not fill.
    expect(plan.days).toHaveLength(3)
    expect(plan.notes.length).toBeGreaterThan(0)
    // Nothing matching an excluded pattern ever sneaks in.
    const patterns = allIds(plan).map((id) => exerciseById(id)?.pattern)
    for (const excluded of ['vertical_push', 'squat', 'lunge', 'hinge', 'horizontal_push']) {
      expect(patterns).not.toContain(excluded)
    }
  })
})

describe('generatePlan — no repeats within a day', () => {
  it('never selects the same exercise twice on one day', () => {
    const plan = generatePlan(profile({ availableDays: 6 }))
    for (const day of plan.days) {
      expect(new Set(day.exerciseIds).size).toBe(day.exerciseIds.length)
    }
  })
})
