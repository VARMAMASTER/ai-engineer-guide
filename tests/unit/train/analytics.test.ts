import { describe, it, expect } from 'vitest'
import {
  currentStreakWeeks,
  estimatedOneRepMax,
  personalBests,
  sessionTonnage,
  weeklyAdherence,
  weeklySetsByMuscleGroup,
  weeklyTonnage,
} from '@/lib/train/analytics'
import type { Session } from '@/lib/train/types'

function session(id: string, date: string, sets: Array<[string, number, number]>): Session {
  return {
    id,
    date,
    sets: sets.map(([exerciseId, reps, load]) => ({ exerciseId, reps, load, timestamp: `${date}T10:00:00.000Z` })),
  }
}

describe('estimatedOneRepMax — Epley, capped at ~10 reps', () => {
  it('matches a hand-computed value: 100kg x 5 reps -> 116.7kg', () => {
    // Epley: load * (1 + reps/30) = 100 * (1 + 5/30) = 116.666... -> 116.7
    const result = estimatedOneRepMax({ reps: 5, load: 100 })
    expect(result).toEqual({ kind: 'estimate', value: 116.7, formula: 'epley' })
  })

  it('matches a hand-computed value: 60kg x 8 reps -> 76kg', () => {
    // 60 * (1 + 8/30) = 60 + 16 = 76
    const result = estimatedOneRepMax({ reps: 8, load: 60 })
    expect(result).toEqual({ kind: 'estimate', value: 76, formula: 'epley' })
  })

  it('does not extrapolate past ~10 reps', () => {
    const result = estimatedOneRepMax({ reps: 15, load: 60 })
    expect(result.kind).toBe('not_meaningful')
  })

  it('rejects a zero-rep set rather than returning a number', () => {
    expect(estimatedOneRepMax({ reps: 0, load: 60 }).kind).toBe('not_meaningful')
  })
})

describe('weeklySetsByMuscleGroup', () => {
  it('counts only sets within the 7-day window and buckets by primary muscle', () => {
    const sessions = [
      session('s1', '2026-09-07', [['back-squat', 5, 100], ['barbell-bench-press', 5, 80]]), // in week
      session('s2', '2026-09-10', [['back-squat', 5, 100]]), // in week
      session('s3', '2026-09-15', [['back-squat', 5, 100]]), // next week — excluded
    ]
    const counts = weeklySetsByMuscleGroup(sessions, '2026-09-07')
    expect(counts.quads).toBe(2)
    expect(counts.chest).toBe(1)
    expect(counts.back).toBe(0)
  })

  it('returns all zeros for a week with no sessions logged (a multi-week gap)', () => {
    const sessions = [session('s1', '2026-08-01', [['back-squat', 5, 100]])]
    const counts = weeklySetsByMuscleGroup(sessions, '2026-09-07')
    expect(Object.values(counts).every((n) => n === 0)).toBe(true)
  })
})

describe('tonnage', () => {
  it('sums load x reps for a session', () => {
    const s = session('s1', '2026-09-07', [['back-squat', 5, 100], ['barbell-bench-press', 8, 60]])
    expect(sessionTonnage(s)).toBe(5 * 100 + 8 * 60)
  })

  it('sums tonnage across sessions in the week only', () => {
    const sessions = [
      session('s1', '2026-09-07', [['back-squat', 5, 100]]), // 500
      session('s2', '2026-09-10', [['back-squat', 5, 100]]), // 500, still in week
      session('s3', '2026-09-20', [['back-squat', 5, 100]]), // out of week
    ]
    expect(weeklyTonnage(sessions, '2026-09-07')).toBe(1000)
  })
})

describe('weeklyAdherence and currentStreakWeeks', () => {
  it('reports whether a week met the planned session count', () => {
    const sessions = [
      session('s1', '2026-09-07', [['back-squat', 5, 100]]),
      session('s2', '2026-09-09', [['back-squat', 5, 100]]),
      session('s3', '2026-09-11', [['back-squat', 5, 100]]),
    ]
    const adherence = weeklyAdherence(sessions, '2026-09-07', 3)
    expect(adherence).toMatchObject({ sessionCount: 3, plannedDays: 3, met: true })
  })

  it('breaks the streak at a three-week gap', () => {
    const threeSessionsInWeek = (weekStart: string) => [
      session(`${weekStart}-a`, weekStart, [['back-squat', 5, 100]]),
      session(`${weekStart}-b`, weekStart, [['back-squat', 5, 100]]),
      session(`${weekStart}-c`, weekStart, [['back-squat', 5, 100]]),
    ]
    // Weeks of 2026-08-17 and 2026-08-24 met the target; then a gap; then
    // 2026-09-07 met it again. Counting back from 2026-09-07, the streak is
    // exactly 1 — the gap breaks it rather than the count.
    const sessions = [...threeSessionsInWeek('2026-08-17'), ...threeSessionsInWeek('2026-08-24'), ...threeSessionsInWeek('2026-09-07')]
    expect(currentStreakWeeks(sessions, 3, '2026-09-07')).toBe(1)
  })

  it('is zero with no history at all', () => {
    expect(currentStreakWeeks([], 3, '2026-09-07')).toBe(0)
  })
})

describe('personalBests', () => {
  it('returns none for an exercise never logged', () => {
    expect(personalBests([], 'back-squat')).toEqual({ kind: 'none' })
  })

  it('finds the heaviest load and the best meaningful estimated 1RM', () => {
    const sessions = [
      session('s1', '2026-09-01', [['back-squat', 5, 100]]), // 1RM-eligible, 116.7
      session('s2', '2026-09-08', [['back-squat', 5, 110]]), // heaviest AND best 1RM: 128.3
      session('s3', '2026-09-15', [['back-squat', 15, 120]]), // heavier load, but not 1RM-meaningful
    ]
    const result = personalBests(sessions, 'back-squat')
    expect(result.kind).toBe('best')
    if (result.kind === 'best') {
      expect(result.heaviestLoad).toMatchObject({ load: 120, reps: 15 })
      expect(result.bestEstimatedOneRepMax?.value).toBeCloseTo(128.3, 1)
      expect(result.bestEstimatedOneRepMax?.date).toBe('2026-09-08')
    }
  })
})
