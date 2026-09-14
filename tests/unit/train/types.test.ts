import { describe, it, expect } from 'vitest'
import { parseLoggedSet, parseSession, parseTrainingProfile } from '@/lib/train/types'

describe('train types — boundary validation', () => {
  it('parses a valid training profile', () => {
    const profile = parseTrainingProfile({
      goal: 'hypertrophy',
      experience: 'beginner',
      availableDays: 4,
      equipment: ['dumbbell', 'bodyweight'],
      injuries: ['shoulder'],
    })
    expect(profile.availableDays).toBe(4)
  })

  it('rejects a training profile with an unknown goal', () => {
    expect(() =>
      parseTrainingProfile({
        goal: 'get-swole',
        experience: 'beginner',
        availableDays: 3,
        equipment: [],
        injuries: [],
      }),
    ).toThrow()
  })

  it('rejects a negative available-days count', () => {
    expect(() =>
      parseTrainingProfile({
        goal: 'strength',
        experience: 'intermediate',
        availableDays: -1,
        equipment: ['barbell'],
        injuries: [],
      }),
    ).toThrow()
  })

  it('rejects a session with a malformed date', () => {
    expect(() => parseSession({ id: 's1', date: '14-09-2026', sets: [] })).toThrow()
  })

  it('parses a valid session', () => {
    const session = parseSession({
      id: 's1',
      date: '2026-09-14',
      sets: [{ exerciseId: 'back-squat', reps: 5, load: 100, timestamp: '2026-09-14T10:00:00.000Z' }],
    })
    expect(session.sets).toHaveLength(1)
  })

  it('rejects a logged set with zero or negative reps', () => {
    expect(() =>
      parseLoggedSet({ exerciseId: 'back-squat', reps: 0, load: 100, timestamp: '2026-09-14T10:00:00.000Z' }),
    ).toThrow()
  })

  it('accepts a bodyweight-only set with zero load', () => {
    const set = parseLoggedSet({ exerciseId: 'push-up', reps: 15, load: 0, timestamp: '2026-09-14T10:00:00.000Z' })
    expect(set.load).toBe(0)
  })

  it('rejects an RPE outside 1-10', () => {
    expect(() =>
      parseLoggedSet({ exerciseId: 'back-squat', reps: 5, load: 100, rpe: 11, timestamp: '2026-09-14T10:00:00.000Z' }),
    ).toThrow()
  })
})
