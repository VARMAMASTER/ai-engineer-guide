import { describe, it, expect } from 'vitest'
import { clampLoadIncrease, MAX_LOAD_INCREASE_KG, suggestNextSession } from '@/lib/train/progression'
import type { Session } from '@/lib/train/types'

function session(date: string, exerciseId: string, reps: number, load: number): Session {
  return { id: date, date, sets: [{ exerciseId, reps, load, timestamp: `${date}T10:00:00.000Z` }] }
}

describe('suggestNextSession — no history at all', () => {
  it('returns insufficient_data rather than a fabricated number', () => {
    const result = suggestNextSession([], 'back-squat')
    expect(result.kind).toBe('insufficient_data')
  })
})

describe('suggestNextSession — an exercise done once', () => {
  it('still gives a progress suggestion from a single session (not insufficient_data)', () => {
    const sessions = [session('2026-09-01', 'back-squat', 6, 80)]
    const result = suggestNextSession(sessions, 'back-squat', [8, 12])
    expect(result.kind).toBe('progress')
  })
})

describe('suggestNextSession — double progression within range', () => {
  it('adds a rep at the same load when below the top of the range', () => {
    // Hand-computed: last session hit 10 reps at 40kg, range top is 12, so
    // the rule adds one rep at the same load rather than touching load.
    const sessions = [session('2026-09-01', 'dumbbell-bench-press', 10, 40)]
    const result = suggestNextSession(sessions, 'dumbbell-bench-press', [8, 12])
    expect(result).toMatchObject({ kind: 'progress', suggestedLoad: 40, suggestedReps: 11 })
  })

  it('resets to the bottom of the range and adds load once the top is met', () => {
    // Hand-computed: back-squat is compound + squat pattern, so its
    // increment is 5kg. 100kg x 12 reps met the top of [8,12], so the next
    // suggestion is 105kg x 8 reps.
    const sessions = [session('2026-09-01', 'back-squat', 12, 100)]
    const result = suggestNextSession(sessions, 'back-squat', [8, 12])
    expect(result).toMatchObject({ kind: 'progress', suggestedLoad: 105, suggestedReps: 8 })
  })

  it('uses a smaller increment for isolation work', () => {
    // dumbbell-curl is not compound, so its increment is 1kg.
    const sessions = [session('2026-09-01', 'dumbbell-curl', 12, 10)]
    const result = suggestNextSession(sessions, 'dumbbell-curl', [8, 12])
    expect(result).toMatchObject({ kind: 'progress', suggestedLoad: 11, suggestedReps: 8 })
  })
})

describe('suggestNextSession — stall detection and deload', () => {
  it('suggests a deload after 3 consecutive sessions with no improvement', () => {
    const sessions = [
      session('2026-09-01', 'back-squat', 10, 100),
      session('2026-09-08', 'back-squat', 10, 100),
      session('2026-09-15', 'back-squat', 10, 100),
    ]
    const result = suggestNextSession(sessions, 'back-squat', [8, 12])
    // Hand-computed: 10% deload from 100kg is 90kg, reset to the bottom of range.
    expect(result).toMatchObject({ kind: 'deload', suggestedLoad: 90, suggestedReps: 8 })
  })

  it('does not call a stall when the most recent session improved', () => {
    const sessions = [
      session('2026-09-01', 'back-squat', 10, 100),
      session('2026-09-08', 'back-squat', 10, 100),
      session('2026-09-15', 'back-squat', 11, 100),
    ]
    const result = suggestNextSession(sessions, 'back-squat', [8, 12])
    expect(result.kind).toBe('progress')
  })
})

describe('load-increase cap', () => {
  it('clamps a proposed increase at MAX_LOAD_INCREASE_KG', () => {
    expect(clampLoadIncrease(100, 130)).toBe(100 + MAX_LOAD_INCREASE_KG)
  })

  it('leaves a proposed increase within the cap untouched', () => {
    expect(clampLoadIncrease(100, 102.5)).toBe(102.5)
  })

  it('never lets a full suggestion exceed the cap even for the largest built-in increment', () => {
    const sessions = [session('2026-09-01', 'barbell-deadlift', 12, 200)]
    const result = suggestNextSession(sessions, 'barbell-deadlift', [8, 12])
    if (result.kind === 'progress') {
      expect(result.suggestedLoad - 200).toBeLessThanOrEqual(MAX_LOAD_INCREASE_KG)
    }
  })
})
