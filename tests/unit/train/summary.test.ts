import { describe, it, expect } from 'vitest'
import { generatePlan } from '@/lib/train/plan'
import { trainSummary } from '@/lib/train/summary'
import type { Session, TrainingProfile } from '@/lib/train/types'

const profile: TrainingProfile = {
  goal: 'hypertrophy',
  experience: 'beginner',
  availableDays: 5,
  equipment: ['barbell', 'dumbbell', 'bodyweight', 'machine', 'cable'],
  injuries: [],
}

describe('trainSummary — no history at all', () => {
  it('is idle and names the first plan day rather than restating a metric', () => {
    const plan = generatePlan(profile)
    const summary = trainSummary({ profile, plan, sessions: [], today: '2026-09-14' })
    expect(summary.status).toBe('idle')
    expect(summary.headline).toContain(plan.days[0].label)
    expect(summary.metrics.length).toBeLessThanOrEqual(3)
  })
})

describe('trainSummary — one session logged', () => {
  it('acknowledges today\'s session rather than asking for one that already happened', () => {
    const plan = generatePlan(profile)
    const pullDay = plan.days.find((d) => d.label === 'Pull')!
    const sessions: Session[] = [
      {
        id: 's1',
        date: '2026-09-14',
        sets: [{ exerciseId: pullDay.exerciseIds[0], reps: 8, load: 40, timestamp: '2026-09-14T10:00:00.000Z' }],
      },
    ]
    const summary = trainSummary({ profile, plan, sessions, today: '2026-09-14' })
    expect(summary.headline).toMatch(/today/i)
  })
})

describe('trainSummary — a gap since the last session', () => {
  it('produces the sentence a person would say: next day due, days since last session', () => {
    const plan = generatePlan(profile) // push_pull_legs: Push, Pull, Legs, Push, Pull
    const pullDay = plan.days.find((d) => d.label === 'Pull')!
    const sessions: Session[] = [
      {
        id: 's1',
        date: '2026-09-11',
        sets: pullDay.exerciseIds.map((exerciseId) => ({
          exerciseId,
          reps: 8,
          load: 40,
          timestamp: '2026-09-11T10:00:00.000Z',
        })),
      },
    ]
    const summary = trainSummary({ profile, plan, sessions, today: '2026-09-14' })
    // Last session matched Pull, so Legs is next; the gap is 3 days.
    expect(summary.headline).toBe('Legs due today, 3 days since the last session.')
  })

  it('moves to attention status after a long gap', () => {
    const plan = generatePlan(profile)
    const sessions: Session[] = [{ id: 's1', date: '2026-08-01', sets: [] }]
    const summary = trainSummary({ profile, plan, sessions, today: '2026-09-14' })
    expect(summary.status).toBe('attention')
  })
})
