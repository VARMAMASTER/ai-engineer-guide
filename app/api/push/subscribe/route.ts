import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/user'
import { PushSubscriptionInputSchema, inputToRow } from '@/lib/push/subscription'
import { safeTimeZone } from '@/lib/push/time'

/**
 * Register this device for notifications.
 *
 * Called by `lib/push/client.ts` immediately after the browser has granted
 * permission and minted a subscription, and by the service worker's
 * `pushsubscriptionchange` handler when a push service rotates one.
 *
 * SCOPING. The REQUEST-SCOPED client, so RLS is what keeps one account's
 * devices out of another's — the `user_id` written below is what makes the
 * insert satisfy `with check`, not what provides the isolation. The
 * service-role key is not involved here and must not be: this is a route a
 * browser can reach.
 *
 * IDEMPOTENT BY THE PRIMARY KEY. Re-subscribing on a device the user already
 * registered produces the same endpoint, so the upsert refreshes the keys, the
 * timezone and `updated_at` instead of creating a second row. That is also how
 * a timezone change reaches the sender: turning the toggle off and on again in
 * a new zone rewrites it.
 *
 * THE TIMEZONE IS NOT TRUSTED. It arrives from the browser and is used to
 * decide when to wake somebody's phone, so it is passed through
 * `safeTimeZone` — an unrecognised zone becomes UTC rather than a `RangeError`
 * thrown inside the nightly run, which would take everyone else's reminders
 * down with it.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
  }

  const parsed = PushSubscriptionInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'That is not a push subscription.' }, { status: 400 })
  }

  const row = inputToRow(parsed.data, safeTimeZone(parsed.data.timezone))

  const supabase = await createClient()
  const { error } = await supabase.from('push_subscription').upsert(
    { user_id: user.id, ...row, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { ok: true, timezone: row.timezone },
    // A device registration is personal and must never be held by the service
    // worker's cache or a CDN. `public/sw.js` already declines to intercept
    // anything under `/api/` that is not the feed; this says so at the response
    // too, so the rule holds even if that ever changes.
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
