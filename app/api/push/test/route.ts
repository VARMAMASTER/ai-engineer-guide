import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/user'
import { sendPush, type PushTarget } from '@/lib/push/send'
import { vapidKeys } from '@/lib/push/vapid'
import { SUBSCRIPTION_COLUMNS } from '@/lib/push/subscription'

/**
 * Send the signed-in user one notification, now, to their own devices.
 *
 * WHY THIS EXISTS AND IS NOT A DEBUG ROUTE. Granting notification permission is
 * a one-way-ish decision — a denial is close to permanent — so the user deserves
 * to find out immediately whether the thing they just agreed to actually works,
 * rather than at 08:30 tomorrow when a reminder either arrives or does not.
 * Every part of the path a real reminder takes is exercised: the same
 * encryption, the same VAPID signature, the same service worker handler and the
 * same click target.
 *
 * SCOPING. The REQUEST-SCOPED client, so RLS limits the `select` below to the
 * caller's own rows — this route can only ever push to the devices of whoever
 * is signed in, whatever the query says. That is the difference between this
 * and `../send`, which runs as no user and therefore needs the admin client.
 *
 * NOT IDEMPOTENT, DELIBERATELY. A test is something the user asked for, so
 * pressing the button twice should produce two notifications. Nothing is
 * written to `push_delivery`, so a test can never consume a real reminder's
 * delivery key.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const keys = vapidKeys()
  if (!keys) {
    return NextResponse.json({ error: 'Push is not configured on this deployment.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('push_subscription').select(SUBSCRIPTION_COLUMNS)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const targets = (data ?? []) as unknown as PushTarget[]
  if (targets.length === 0) {
    return NextResponse.json(
      { error: 'This account has no devices registered for notifications.' },
      { status: 409 },
    )
  }

  const now = new Date()
  const results = await Promise.all(
    targets.map(async (target) => ({ target, result: await sendPush(target, {
      title: 'Notifications are on',
      body: 'This is what a reminder will look like.',
      url: '/ops/reminders',
      // A fixed tag, so pressing the button repeatedly replaces the test
      // notification rather than stacking five identical ones.
      tag: 'unyfide-push-test',
    }, keys, now) })),
  )

  // Same cleanup contract as the scheduled sender: a push service saying 404 or
  // 410 is the only signal a subscription is dead, so act on it wherever it
  // arrives rather than only in the cron path.
  for (const { target, result } of results) {
    if (result.gone) {
      await supabase.from('push_subscription').delete().eq('endpoint', target.endpoint)
    }
  }

  const delivered = results.filter(({ result }) => result.ok).length
  if (delivered === 0) {
    const detail = results[0]?.result.detail ?? 'the push service refused it'
    return NextResponse.json(
      { error: `Nothing could be delivered — ${detail}.` },
      { status: 502, headers: { 'cache-control': 'private, no-store' } },
    )
  }

  return NextResponse.json(
    { ok: true, delivered, devices: results.length },
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
