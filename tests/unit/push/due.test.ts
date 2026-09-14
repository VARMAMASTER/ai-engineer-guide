import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { dueForUser, payloadFor } from '@/app/api/push/send/due'
import { deliveryKey } from '@/lib/push/schedule'

/**
 * What the sender decides to send, tested without a database.
 *
 * This is the join between Ops's rules and push's delivery, and the one place
 * a timezone bug would hide: every function on either side is individually
 * correct in UTC. The fake client below returns fixed rows, so what is under
 * test is the decision — which reminders are due, at what local instant, for a
 * person in a given zone.
 */

const TASKS = [
  {
    id: 'task-board',
    title: 'Third Tuesday board pack',
    notes: null,
    due_date: '2026-09-15',
    due_time: '09:00',
    priority: 'high',
    tags: [],
    completed: false,
    completed_on: null,
    recurrence: null,
    created_on: '2026-09-01',
  },
  {
    id: 'task-done',
    title: 'Already finished',
    notes: null,
    due_date: '2026-09-15',
    due_time: '09:00',
    priority: 'low',
    tags: [],
    completed: true,
    completed_on: '2026-09-14',
    recurrence: null,
    created_on: '2026-09-01',
  },
  {
    id: 'task-no-time',
    title: 'Someday',
    notes: null,
    due_date: '2026-09-15',
    due_time: null,
    priority: 'low',
    tags: [],
    completed: false,
    completed_on: null,
    recurrence: null,
    created_on: '2026-09-01',
  },
]

const RULES = [
  { id: 'rule-board', task_id: 'task-board', offset_minutes: 30 },
  { id: 'rule-done', task_id: 'task-done', offset_minutes: 30 },
  { id: 'rule-no-time', task_id: 'task-no-time', offset_minutes: 30 },
]

/**
 * Just enough of the PostgREST builder for `dueForUser`, and it RECORDS the
 * filters: with the admin client in play RLS is bypassed, so the `user_id`
 * filter is the only thing scoping the query and a missing one would push one
 * person's task titles to another person's phone.
 */
function fakeClient(calls: { table: string; userId: string | null }[]): SupabaseClient {
  return {
    from(table: string) {
      const call = { table, userId: null as string | null }
      calls.push(call)
      return {
        select() {
          return {
            eq(column: string, value: string) {
              if (column === 'user_id') call.userId = value
              const data = table === 'ops_task' ? TASKS : RULES
              return Promise.resolve({ data, error: null })
            },
          }
        },
      }
    },
  } as unknown as SupabaseClient
}

async function due(timeZone: string, instant: Date) {
  const calls: { table: string; userId: string | null }[] = []
  const result = await dueForUser(fakeClient(calls), 'user-1', timeZone, instant)
  return { result, calls }
}

describe('dueForUser', () => {
  it('fires at the local hour the user set, not the sender region hour', () => {
    // The task is due 2026-09-15 09:00 LOCAL with a 30-minute reminder, so the
    // reminder instant is 08:30 local. For Asia/Kolkata (+05:30) that is
    // 03:00 UTC, which is the instant the sender is handed below.
    return due('Asia/Kolkata', new Date('2026-09-15T03:00:00.000Z')).then(({ result }) => {
      expect(result.map((item) => item.key)).toEqual([deliveryKey('rule-board', '2026-09-15T08:30')])
    })
  })

  it('does NOT fire that reminder for the same instant in UTC', () => {
    // The exact bug this design prevents. 03:00 UTC is 03:00 in London, which
    // is five and a half hours before the reminder is due there — and a sender
    // that ignored the stored zone would have fired it anyway.
    return due('UTC', new Date('2026-09-15T03:00:00.000Z')).then(({ result }) => {
      expect(result).toEqual([])
    })
  })

  it('fires for a UTC subscriber at the UTC instant instead', async () => {
    const { result } = await due('UTC', new Date('2026-09-15T08:30:00.000Z'))
    expect(result.map((item) => item.key)).toEqual([deliveryKey('rule-board', '2026-09-15T08:30')])
  })

  it('skips a completed task and a task with no due time', async () => {
    const { result } = await due('UTC', new Date('2026-09-15T08:30:00.000Z'))
    const rules = result.map((item) => item.key.split('@')[0])
    expect(rules).not.toContain('rule-done')
    expect(rules).not.toContain('rule-no-time')
  })

  it('scopes both reads by user, because RLS is not doing it here', async () => {
    const { calls } = await due('UTC', new Date('2026-09-15T08:30:00.000Z'))
    expect(calls.map((call) => call.table).sort()).toEqual(['ops_reminder', 'ops_task'])
    for (const call of calls) expect(call.userId, call.table).toBe('user-1')
  })

  it('produces a key that is stable across runs, so the second run claims nothing', async () => {
    const first = await due('Asia/Kolkata', new Date('2026-09-15T03:00:00.000Z'))
    // Eleven minutes later, the same reminder is still inside the grace window.
    const second = await due('Asia/Kolkata', new Date('2026-09-15T03:11:00.000Z'))

    expect(second.result.map((i) => i.key)).toEqual(first.result.map((i) => i.key))
  })

  it('stops firing once the reminder is older than the grace window', async () => {
    // Two days later the reminder is long past; a sender that had been offline
    // must not replay it.
    const { result } = await due('Asia/Kolkata', new Date('2026-09-17T03:00:00.000Z'))
    expect(result).toEqual([])
  })
})

describe('payloadFor', () => {
  const task = {
    id: 't',
    title: 'Third Tuesday board pack',
    priority: 'high' as const,
    tags: [],
    completed: false,
    createdAt: '2026-09-01',
    dueDate: '2026-09-15',
    dueTime: '09:00',
  }

  it('leads with the task, not the app name', () => {
    // A notification shade shows a stack of these. "Unyfide" six times is
    // unreadable; the title is the only thing that tells them apart.
    const payload = payloadFor({ rule: { id: 'r', taskId: 't', offsetMinutes: 30 }, task, firesAt: '2026-09-15T08:30' })
    expect(payload.title).toBe('Third Tuesday board pack')
    expect(payload.body).toBe('Due in 30 minutes. At 09:00.')
  })

  it('says "now" at a zero offset and scales the unit upward', () => {
    const at = (offsetMinutes: number) =>
      payloadFor({ rule: { id: 'r', taskId: 't', offsetMinutes }, task, firesAt: '2026-09-15T08:30' }).body

    expect(at(0)).toContain('Due now.')
    expect(at(45)).toContain('Due in 45 minutes.')
    expect(at(120)).toContain('Due in 2 hours.')
    expect(at(2880)).toContain('Due in 2 days.')
  })

  it('tags the notification with the same key the send log uses', () => {
    // Two names for "the same reminder" is how a redelivery ends up stacking on
    // screen even though the log knew about it.
    const payload = payloadFor({ rule: { id: 'r', taskId: 't', offsetMinutes: 30 }, task, firesAt: '2026-09-15T08:30' })
    expect(payload.tag).toBe(deliveryKey('r', '2026-09-15T08:30'))
  })

  it('opens the screen that shows what is next', () => {
    const payload = payloadFor({ rule: { id: 'r', taskId: 't', offsetMinutes: 0 }, task, firesAt: '2026-09-15T09:00' })
    expect(payload.url).toBe('/ops/today')
  })

  it('clamps a long title rather than overflowing the payload', () => {
    const payload = payloadFor({
      rule: { id: 'r', taskId: 't', offsetMinutes: 0 },
      task: { ...task, title: 'x'.repeat(200) },
      firesAt: '2026-09-15T09:00',
    })
    expect(payload.title.length).toBeLessThanOrEqual(90)
    expect(payload.title.endsWith('…')).toBe(true)
  })
})
