import { describe, expect, it } from 'vitest'
import { evaluateGoal, goalsNeedingAttention } from '@/lib/ops/goals'
import { makeGoal } from './helpers'

describe('lib/ops/goals', () => {
  it('reports achieved once current reaches target, even before the deadline', () => {
    const goal = makeGoal({ target: 10, current: 10, startDate: '2026-01-01', deadline: '2026-12-31' })
    const evaluation = evaluateGoal(goal, new Date(2026, 5, 1))
    expect(evaluation.achieved).toBe(true)
    expect(evaluation.status).toBe('achieved')
    expect(evaluation.fraction).toBe(1)
  })

  it('a goal whose deadline has passed, and target not met, is honestly "missed" — not stuck at its last percentage', () => {
    const goal = makeGoal({ target: 100, current: 97, startDate: '2026-01-01', deadline: '2026-06-01' })
    const evaluation = evaluateGoal(goal, new Date(2026, 8, 14)) // well after the deadline
    expect(evaluation.deadlinePassed).toBe(true)
    expect(evaluation.status).toBe('missed')
    expect(evaluation.onPace).toBe(false)
    expect(evaluation.daysRemaining).toBeLessThan(0)
    // Once the deadline is gone, a "pace required to hit it" is not a real number.
    expect(evaluation.requiredPacePerDay).toBeNull()
    // But progress itself is still honestly reported, not hidden.
    expect(evaluation.fraction).toBeCloseTo(0.97)
  })

  it('is on pace when the projected finish at the current rate clears the target by the deadline', () => {
    // 50 of 100 after 50 days: rate 1/day. 50 days still remain until the
    // deadline, so continuing at 1/day projects to exactly 100 — on pace.
    const goal = makeGoal({ target: 100, current: 50, startDate: '2026-01-01', deadline: '2026-04-11' })
    const now = new Date(2026, 1, 20) // 2026-02-20 is 50 days after 2026-01-01
    const evaluation = evaluateGoal(goal, now)
    expect(evaluation.daysElapsed).toBe(50)
    expect(evaluation.daysRemaining).toBe(50)
    expect(evaluation.currentPacePerDay).toBeCloseTo(1)
    expect(evaluation.onPace).toBe(true)
    expect(evaluation.status).toBe('on-pace')
  })

  it('is behind when the current rate would not reach the target by the deadline', () => {
    // 10 of 100 after 50 days: rate 0.2/day, but the same 50 remaining days
    // would need a rate of 1.8/day to close the gap — behind, not on pace.
    const goal = makeGoal({ target: 100, current: 10, startDate: '2026-01-01', deadline: '2026-04-11' })
    const now = new Date(2026, 1, 20)
    const evaluation = evaluateGoal(goal, now)
    expect(evaluation.onPace).toBe(false)
    expect(evaluation.status).toBe('behind')
  })

  it('goalsNeedingAttention surfaces missed goals ahead of merely-behind ones', () => {
    const missed = makeGoal({ title: 'missed', target: 10, current: 1, startDate: '2026-01-01', deadline: '2026-01-31' })
    const behind = makeGoal({ title: 'behind', target: 10, current: 1, startDate: '2026-01-01', deadline: '2026-12-31' })
    const onTrack = makeGoal({ title: 'on track', target: 10, current: 10, startDate: '2026-01-01', deadline: '2026-12-31' })
    const now = new Date(2026, 8, 14)
    expect(goalsNeedingAttention([onTrack, behind, missed], now)).toEqual([missed, behind])
  })
})
