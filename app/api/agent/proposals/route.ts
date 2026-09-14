import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/user'
import { decideProposal } from '@/lib/agent/store'

/**
 * Accept or dismiss one proposal.
 *
 * Read the handler and note what it does NOT do. There is no branch on which
 * proposal it is, no dispatch into a mini-app, no write to a calorie target or
 * a session or a task, and no path of any kind to the 180-day study plan. It
 * sets a state and a timestamp on one row in `agent_proposal`.
 *
 * That is the feature. The owner's words were "strictly I will follow", and an
 * agent that could act on its own advice would be an excuse machine with good
 * manners. Accepting means "I have read this and I intend to do it"; the doing
 * happens in the app that owns the change, by the person who owns the plan.
 *
 * SCOPING. RLS again: the update's `eq('id', ...)` selects which of YOUR rows
 * is meant, and the policy is what makes it yours. A missing row and somebody
 * else's row are indistinguishable from here, which is the correct answer to
 * both.
 */
const DecisionSchema = z.object({
  id: z.string().min(1).max(200),
  state: z.enum(['accepted', 'dismissed']),
})

const PRIVATE = { 'cache-control': 'private, no-store' }

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401, headers: PRIVATE })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400, headers: PRIVATE })
  }

  const parsed = DecisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Expected an id and a state of accepted or dismissed.' },
      { status: 400, headers: PRIVATE },
    )
  }

  const supabase = await createClient()
  try {
    const updated = await decideProposal({
      supabase,
      id: parsed.data.id,
      state: parsed.data.state,
      now: new Date(),
    })
    if (!updated) {
      return NextResponse.json({ error: 'No such proposal.' }, { status: 404, headers: PRIVATE })
    }
    return NextResponse.json({ id: parsed.data.id, state: parsed.data.state }, { headers: PRIVATE })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: PRIVATE })
  }
}
