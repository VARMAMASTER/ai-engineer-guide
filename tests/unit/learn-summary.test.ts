import { describe, expect, it } from 'vitest'
import { content, completionKey } from '@/lib/content/index'
import { PLAN_DAYS, learnSummary } from '@/lib/learn/summary'
import { isStale, orderSummaries } from '@/lib/summary'
import type { Completed } from '@/lib/progress/selectors'

/**
 * Learn's contribution to the shared seam.
 *
 * Learn was the one app with no `AppSummary` provider, which meant the half of
 * the product everything else is arranged around was invisible to Today and to
 * the agent. These tests hold it to the same contract the other three meet.
 */

const START = '2026-09-01'

/** Mark every task scheduled for `dayNumber` as completed on `on`. */
function completeDay(dayNumber: number, on: string, into: Completed = {}): Completed {
  const day = content.days.find((d) => d.number === dayNumber)
  for (const task of day?.tasks ?? []) into[completionKey(task)] = on
  return into
}

describe('before the plan has started', () => {
  it('is idle and says why, rather than claiming day 1', () => {
    const summary = learnSummary({ startDate: null, completed: {}, today: '2026-09-14' })
    expect(summary.status).toBe('idle')
    expect(summary.headline).toContain('no start date')
    expect(summary.metrics).toEqual([])
  })
})

describe('a day in the plan', () => {
  it('counts the day and what is done on it', () => {
    const summary = learnSummary({ startDate: START, completed: {}, today: '2026-09-03' })
    expect(summary.headline).toContain('Day 3 of 180')
    expect(summary.metrics.find((m) => m.label === 'Day')?.value).toBe('3')
  })

  it('is ok once everything scheduled for the day is ticked', () => {
    const completed = completeDay(3, '2026-09-03')
    const summary = learnSummary({ startDate: START, completed, today: '2026-09-03' })
    expect(summary.status).toBe('ok')
    expect(summary.headline).toMatch(/done/)
  })

  it('is idle, not behind, when the day has simply not been started', () => {
    // A card that shouted "behind" at 8am every morning would be noise, and
    // Diet uses `idle` for exactly this ("nothing logged today yet").
    const summary = learnSummary({ startDate: START, completed: {}, today: '2026-09-03' })
    expect(summary.status).toBe('idle')
  })

  it('is behind when the day is half done', () => {
    const day = content.days.find((d) => d.number === 3)
    const first = day?.tasks[0]
    expect(first, 'fixture needs a day with more than one task').toBeDefined()
    const partial: Completed = day!.tasks.length > 1 ? { [completionKey(first!)]: '2026-09-03' } : {}
    if (day!.tasks.length > 1) {
      const summary = learnSummary({ startDate: START, completed: partial, today: '2026-09-03' })
      expect(summary.status).toBe('behind')
      expect(summary.headline).toMatch(/\d of \d done today/)
    }
  })
})

describe('past the end of the written plan', () => {
  it('says the plan is not written that far rather than blaming the reader', () => {
    // The plan is 180 days and is authored a month at a time. "Nothing
    // scheduled today" on day 40 would be a statement about the content
    // dressed up as a statement about the user.
    const summary = learnSummary({ startDate: START, completed: {}, today: '2026-12-01' })
    expect(summary.headline).toMatch(/written as far as day \d+/)
    expect(summary.status).toBe('idle')
  })
})

describe('it can be asked about a past date, which is what the agent needs', () => {
  it('answers for an earlier day over the same completions', () => {
    const completed = completeDay(2, '2026-09-02', completeDay(3, '2026-09-03'))
    const onThe2nd = learnSummary({ startDate: START, completed, today: '2026-09-02' })
    const onThe3rd = learnSummary({ startDate: START, completed, today: '2026-09-03' })
    expect(onThe2nd.date).toBe('2026-09-02')
    expect(onThe3rd.date).toBe('2026-09-03')
    expect(onThe2nd.headline).toContain('Day 2')
    expect(onThe3rd.headline).toContain('Day 3')
  })

  it('is pure — the same input twice gives the same summary', () => {
    const input = { startDate: START, completed: completeDay(3, '2026-09-03'), today: '2026-09-03' }
    expect(learnSummary(input)).toEqual(learnSummary(input))
  })
})

describe('the shared contract', () => {
  it('fits the AppSummary seam like the other three', () => {
    const summary = learnSummary({ startDate: START, completed: {}, today: '2026-09-03' })
    expect(summary.appId).toBe('learn')
    expect(summary.href).toMatch(/^\//)
    expect(summary.metrics.length).toBeLessThanOrEqual(3)
    expect(isStale(summary, '2026-09-03')).toBe(false)
    expect(isStale(summary, '2026-09-04')).toBe(true)
    expect(orderSummaries([summary])).toEqual([summary])
  })

  it('keeps every fraction inside its own track', () => {
    for (const day of ['2026-09-01', '2026-09-15', '2027-09-01']) {
      const summary = learnSummary({ startDate: START, completed: {}, today: day })
      for (const metric of summary.metrics) {
        if (metric.fraction !== undefined) {
          expect(metric.fraction, `${day} ${metric.label}`).toBeGreaterThanOrEqual(0)
          expect(metric.fraction, `${day} ${metric.label}`).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('knows how long the plan is', () => {
    expect(PLAN_DAYS).toBe(180)
  })
})
