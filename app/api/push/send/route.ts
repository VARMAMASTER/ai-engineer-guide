import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/db/admin'
import { sendPush, type PushTarget } from '@/lib/push/send'
import { vapidKeys } from '@/lib/push/vapid'
import { DELIVERY_RETENTION_DAYS } from '@/lib/push/schedule'
import { SUBSCRIPTION_COLUMNS } from '@/lib/push/subscription'
import { safeTimeZone } from '@/lib/push/time'
import { dueForUser } from './due'

/**
 * The scheduled sender. Woken by a Vercel Cron Job — see `vercel.json`, whose
 * `path` is asserted against `SENDER_PATH` by `tests/unit/push/schedule.test.ts`.
 *
 * THREE THINGS THIS ROUTE HAS TO GET RIGHT, because a notification system that
 * gets any of them wrong is worse than having none.
 *
 * 1. IT IS AUTHENTICATED, and closed by default. An open endpoint that sends a
 *    notification to every user is an abuse vector anybody can fire at will and
 *    a reliable way to get an application server key blocked by a push service.
 *    Vercel's convention is a `CRON_SECRET` environment variable, which the
 *    platform then sends as `Authorization: Bearer <secret>` on every cron
 *    invocation. If the variable is ABSENT the route answers 401 rather than
 *    running unauthenticated — a missing secret must fail closed, not open.
 *    The comparison is constant-time over digests so the response time leaks
 *    nothing about how much of a guessed secret was right.
 *
 * 2. IT NEVER SENDS THE SAME REMINDER TWICE. Every send is preceded by an
 *    INSERT of `(user_id, delivery_key)` into `push_delivery`, whose primary
 *    key rejects a second one. Postgres arbitrates, so two overlapping runs —
 *    or a retry of a run the platform thought had timed out — produce one
 *    winner and one silent no-op with no lock and no coordination. The claim
 *    happens BEFORE the push, which chooses "possibly missed" over "possibly
 *    duplicated"; the trade-off and its reasoning are in the migration.
 *
 * 3. IT RESPECTS THE USER'S CLOCK. `dueForUser` evaluates `lib/ops`'s rules
 *    against the wall clock of the timezone stored with the subscription, not
 *    the region's UTC. Without that, "remind me at 18:00" would mean 18:00 UTC
 *    for everybody.
 *
 * THE ADMIN CLIENT IS USED HERE AND NOWHERE ELSE IN THIS FEATURE. A cron
 * invocation carries no session, so `auth.uid()` is null and every RLS policy
 * on `ops_*`, `push_subscription` and `push_delivery` would correctly return
 * nothing. This is the legitimate bypass `lib/db/admin.ts` describes. Its
 * consequence is that the `user_id` filters in this file and in `./due.ts` are
 * the ONLY thing scoping each query — with policies out of the picture, a
 * missing filter would push one person's task titles to another person's phone.
 */

// One invocation walks every subscriber. The default is comfortably enough at
// this size, but the sender is the one function here whose work grows with the
// user count, so the ceiling is stated rather than inherited.
export const maxDuration = 60

interface Subscriber {
  userId: string
  timeZone: string
  targets: PushTarget[]
}

interface SubscriptionRecord {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  timezone: string
  updated_at: string
}

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  // Fail closed: an unconfigured deployment must not have an open sender.
  if (!secret) return false

  const offered = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`

  // Digest first, so the comparison is over two equal-length buffers whatever
  // the caller sent — `timingSafeEqual` throws on a length mismatch, and that
  // throw is itself an oracle for the secret's length.
  const a = createHash('sha256').update(offered).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/**
 * Every device with notifications on, folded into one entry per person.
 *
 * Ordered by `updated_at` so the LAST timezone written wins: a user with a
 * laptop in one zone and a phone in another is most likely where they most
 * recently turned notifications on, and that is the best guess available. A
 * reminder then goes to all of their devices at that one local time, rather
 * than to each device at its own — which would be two notifications for one
 * reminder as far as the person is concerned.
 */
async function subscribers(supabase: SupabaseClient): Promise<Subscriber[]> {
  const { data, error } = await supabase
    .from('push_subscription')
    .select(`user_id, ${SUBSCRIPTION_COLUMNS}`)
    .order('updated_at', { ascending: true })

  if (error) throw new Error(`could not read subscriptions: ${error.message}`)

  const byUser = new Map<string, Subscriber>()
  for (const row of (data ?? []) as unknown as SubscriptionRecord[]) {
    const existing = byUser.get(row.user_id)
    const target: PushTarget = { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth }
    if (existing) {
      existing.targets.push(target)
      existing.timeZone = safeTimeZone(row.timezone)
    } else {
      byUser.set(row.user_id, {
        userId: row.user_id,
        timeZone: safeTimeZone(row.timezone),
        targets: [target],
      })
    }
  }

  return [...byUser.values()]
}

/**
 * Claim one reminder. True means "you send it"; false means somebody already
 * did, or is doing it right now.
 *
 * 23505 is Postgres's unique_violation. It is the SUCCESS path of this
 * function's contract — the primary key doing the arbitration — so it is
 * matched explicitly and any other error is re-raised rather than swallowed
 * into a silent "already sent".
 */
async function claim(supabase: SupabaseClient, userId: string, key: string): Promise<boolean> {
  const { error } = await supabase
    .from('push_delivery')
    .insert({ user_id: userId, delivery_key: key })

  if (!error) return true
  if (error.code === '23505') return false
  throw new Error(`could not claim ${key}: ${error.message}`)
}

async function resolve(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  outcome: 'sent' | 'failed' | 'no-subscription',
): Promise<void> {
  await supabase
    .from('push_delivery')
    .update({ sent_at: new Date().toISOString(), outcome })
    .eq('user_id', userId)
    .eq('delivery_key', key)
}

/** Drop a subscription a push service has told us is dead. */
async function forget(supabase: SupabaseClient, userId: string, endpoint: string): Promise<void> {
  await supabase
    .from('push_subscription')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const keys = vapidKeys()
  if (!keys) {
    // Not a 500: the deployment is simply not configured for push. Saying so
    // plainly is what stops this from being debugged as a delivery bug.
    return NextResponse.json({ error: 'Push is not configured on this deployment.' }, { status: 503 })
  }

  const supabase = createAdminClient()
  const instant = new Date()

  let sent = 0
  let skipped = 0
  let failed = 0
  let removed = 0
  const problems: string[] = []

  let people: Subscriber[]
  try {
    people = await subscribers(supabase)
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : 'could not read subscriptions' },
      { status: 500 },
    )
  }

  for (const person of people) {
    try {
      const due = await dueForUser(supabase, person.userId, person.timeZone, instant)

      for (const item of due) {
        if (!(await claim(supabase, person.userId, item.key))) {
          skipped += 1
          continue
        }

        // Every live device of this person, in parallel: one slow push service
        // must not serialise the others.
        const outcomes = await Promise.all(
          person.targets.map(async (target) => ({
            target,
            result: await sendPush(target, item.payload, keys, instant),
          })),
        )

        for (const { target, result } of outcomes) {
          if (result.gone) {
            await forget(supabase, person.userId, target.endpoint)
            removed += 1
          }
        }

        const delivered = outcomes.some(({ result }) => result.ok)
        if (delivered) sent += 1
        else failed += 1
        await resolve(supabase, person.userId, item.key, delivered ? 'sent' : 'failed')
      }
    } catch (cause) {
      // One person's bad data must never stop everybody else's reminders.
      failed += 1
      problems.push(cause instanceof Error ? cause.message : 'unknown failure')
    }
  }

  // Keep the ledger bounded. Cheap, and it runs after the sending so a slow
  // delete can never delay a notification.
  const cutoff = new Date(instant.getTime() - DELIVERY_RETENTION_DAYS * 86_400_000).toISOString()
  await supabase.from('push_delivery').delete().lt('created_at', cutoff)

  return NextResponse.json(
    { ok: true, subscribers: people.length, sent, skipped, failed, removed, problems },
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
