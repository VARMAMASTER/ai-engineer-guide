import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/user'

const BodySchema = z.object({ endpoint: z.string().min(1).max(1000) })

/**
 * Stop notifications on one device.
 *
 * Deleting the ROW is what actually stops the sending — a browser-side
 * `subscription.unsubscribe()` alone would leave an endpoint in the table that
 * answers 410 forever and is retried on every run. `lib/push/client.ts`
 * therefore calls this first and only then drops the browser's own
 * subscription.
 *
 * No `.eq('user_id', ...)`: the delete policy already restricts this to the
 * caller's own rows, so passing somebody else's endpoint deletes nothing. A
 * redundant filter here would read as though it were the thing providing the
 * safety, which is the habit RLS exists to break. The response is the same
 * either way, so this is not an oracle for whether an endpoint exists.
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

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Expected an endpoint.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('push_subscription')
    .delete()
    .eq('endpoint', parsed.data.endpoint)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'private, no-store' } })
}
