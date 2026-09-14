import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DELIVERY_RETENTION_DAYS,
  SCHEDULING_SLOP_MINUTES,
  SENDER_GRACE_MINUTES,
  SENDER_PATH,
  deliveryKey,
} from '@/lib/push/schedule'

/**
 * The cron configuration and the code that assumes it, held to each other.
 *
 * `vercel.json` is a JSON file with no comments and no types; nothing in the
 * build checks that its `path` still points at a route that exists, or that the
 * sender's grace window still covers the gap between two runs. Both are silent
 * failures: the first delivers nothing, the second delivers nothing for any
 * reminder that came due between runs. So the cron expression is parsed here
 * and the invariant derived from it, rather than a constant being asserted
 * against another constant.
 */

const ROOT = process.cwd()
const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
  crons?: { path: string; schedule: string }[]
}

/**
 * The longest gap between two runs of a 5-field cron expression, in minutes.
 *
 * Deliberately narrow: it understands a bare star, a star with a step, and a
 * literal — which is everything this project's schedule will ever be — and
 * throws on anything else rather than returning a number it cannot justify.
 */
function longestGapMinutes(expression: string): number {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = expression.trim().split(/\s+/)

  if (dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*') {
    throw new Error('this test only understands daily-or-finer schedules')
  }

  /** The step of a field, or null when it names one fixed value. */
  const step = (field: string): number | null => {
    if (field === '*') return 1
    const every = /^\*\/(\d+)$/.exec(field)
    if (every) return Number(every[1])
    if (/^\d+$/.test(field)) return null
    throw new Error(`this test only understands a star, a star with a step, and a literal; got "${field}"`)
  }

  const minuteStep = step(minute)
  const hourStep = step(hour)

  if (minuteStep === null) {
    // One fixed minute: the gap is a whole hour, or a whole day if the hour is
    // fixed too.
    return hourStep === null ? 24 * 60 : hourStep * 60
  }
  // Several runs per selected hour. The longest gap is the wait from the last
  // run of one selected hour to the first run of the next.
  if (hourStep === null) return 24 * 60 - 60 + minuteStep
  return (hourStep - 1) * 60 + minuteStep
}

describe('the cron entry in vercel.json', () => {
  it('points at the sender the code actually exports', () => {
    const crons = config.crons ?? []
    expect(crons.length, 'exactly one scheduled sender').toBe(1)
    expect(crons[0].path).toBe(SENDER_PATH)
  })

  it('names a route that exists on disk', () => {
    // A cron whose path 404s costs nothing at deploy time and delivers nothing
    // forever, which is the worst combination a config error can have.
    const route = join(ROOT, 'app', SENDER_PATH.replace(/^\//, ''), 'route.ts')
    expect(() => readFileSync(route, 'utf8')).not.toThrow()
  })

  it('stays inside the Hobby plan, where a finer schedule fails the deploy', () => {
    // Vercel: "Hobby accounts are limited to daily cron jobs. Cron expressions
    // that would run more frequently will fail during deployment." Shipping
    // `*/5` here would break every deploy rather than deliver faster.
    expect(longestGapMinutes(config.crons![0].schedule)).toBe(24 * 60)
  })

  it('has a grace window wide enough that no reminder falls between two runs', () => {
    // This is the invariant that has to survive a cadence change. Move the
    // schedule and forget the constant, and reminders start disappearing
    // silently; this assertion is what makes that a failing test instead.
    const gap = longestGapMinutes(config.crons![0].schedule)
    expect(SENDER_GRACE_MINUTES).toBeGreaterThanOrEqual(gap + SCHEDULING_SLOP_MINUTES)
  })
})

describe('the cron parser this file checks with', () => {
  it('reads the gap of the schedules this project might use', () => {
    // Guards the guard: a parser that always returned 1440 would make the
    // grace-window assertion above pass for any cadence at all.
    expect(longestGapMinutes('0 2 * * *')).toBe(24 * 60)
    expect(longestGapMinutes('0 * * * *')).toBe(60)
    expect(longestGapMinutes('*/5 * * * *')).toBe(5)
    expect(longestGapMinutes('*/15 */6 * * *')).toBe(5 * 60 + 15)
    expect(() => longestGapMinutes('0 2 * * 1')).toThrow(/daily-or-finer/)
  })
})

describe('deliveryKey', () => {
  it('is the rule AND the instant, because a rule fires more than once', () => {
    expect(deliveryKey('rule-1', '2026-09-14T17:30')).toBe('rule-1@2026-09-14T17:30')
  })

  it('is stable for the same reminder however many times it is computed', () => {
    // Overlapping runs, a retry, and a late run whose window covers the same
    // instant twice all land on this string — which the primary key then
    // rejects on the second insert.
    expect(deliveryKey('r', '2026-09-14T17:30')).toBe(deliveryKey('r', '2026-09-14T17:30'))
  })

  it('changes when the task is rescheduled, so the new time is still delivered', () => {
    expect(deliveryKey('r', '2026-09-14T17:30')).not.toBe(deliveryKey('r', '2026-09-14T18:30'))
  })

  it('never collides across rules that fire at the same instant', () => {
    expect(deliveryKey('r1', '2026-09-14T17:30')).not.toBe(deliveryKey('r2', '2026-09-14T17:30'))
  })

  it('fits the column it is stored in', () => {
    // `push_delivery.delivery_key` is capped at 300 characters. Rule ids are
    // UUIDs (36) and the instant is 16, so the real ceiling is nowhere near —
    // but the check is here so a future id scheme cannot overflow it silently.
    const uuid = '0ec0311d-af9e-4478-bcd6-c65b84565131'
    expect(deliveryKey(uuid, '2026-09-14T17:30').length).toBeLessThanOrEqual(300)
  })
})

describe('retention', () => {
  it('keeps the send log long enough to be useful and short enough to be bounded', () => {
    expect(DELIVERY_RETENTION_DAYS).toBeGreaterThan(1)
    expect(DELIVERY_RETENTION_DAYS).toBeLessThanOrEqual(90)
  })
})
