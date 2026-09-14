/**
 * Reading and writing the agent's own two tables. Nothing else is touched.
 *
 * That sentence is the design, not a description of the current version. The
 * agent is advisory: accepting a proposal writes `state = 'accepted'` in
 * `agent_proposal` and changes no calorie target, no session, no task and
 * — above all — nothing in the 180-day study plan.
 *
 * Rows are scoped by RLS. The `user_id` written below is what makes an INSERT
 * satisfy `with check`; it is not the mechanism keeping other accounts out, and
 * a bug in a filter here could not return somebody else's brief.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Brief, Proposal, ProposalState } from './types'
import { parseStoredBrief } from './schema'
import type { RateLimitState } from './rate-limit'

export interface StoredBriefRow {
  brief: Brief | null
  limit: RateLimitState
}

/**
 * Today's brief and the counters that govern regenerating it.
 *
 * Both come from the same row, which is why there is no separate usage table:
 * "briefs generated today" is a fact about today's brief.
 */
export async function readBrief(
  supabase: SupabaseClient,
  date: string,
): Promise<StoredBriefRow> {
  const { data, error } = await supabase
    .from('agent_brief')
    .select('payload, generation_count, generated_at')
    .eq('brief_date', date)
    .maybeSingle()

  if (error) throw new Error(`Could not read your brief: ${error.message}`)
  if (!data) return { brief: null, limit: { count: 0, lastAt: null } }

  const row = data as { payload: unknown; generation_count: number; generated_at: string }
  return {
    // A payload written by an older shape is dropped, not repaired: the
    // counters are still true, so the rate limit holds even when the brief
    // itself has to be regenerated.
    brief: parseStoredBrief(row.payload),
    limit: {
      count: row.generation_count,
      lastAt: row.generated_at ? new Date(row.generated_at) : null,
    },
  }
}

/** Write (or overwrite) the day's brief and bump its generation counters. */
export async function writeBrief(args: {
  supabase: SupabaseClient
  userId: string
  brief: Brief
  previousCount: number
  now: Date
}): Promise<void> {
  const { supabase, userId, brief, previousCount, now } = args
  const { error } = await supabase.from('agent_brief').upsert(
    {
      user_id: userId,
      brief_date: brief.date,
      payload: brief,
      generation_count: previousCount + 1,
      generated_at: now.toISOString(),
      model: brief.model,
    },
    { onConflict: 'user_id,brief_date' },
  )
  if (error) throw new Error(`Could not save your brief: ${error.message}`)
}

/**
 * Add the day's proposals without disturbing decisions already made.
 *
 * `ignoreDuplicates` is the whole point: proposal ids are `<date>:<rule>`, so
 * regenerating today's brief re-offers the same proposals, and one you
 * dismissed at breakfast must not quietly come back as pending.
 */
export async function insertProposals(args: {
  supabase: SupabaseClient
  userId: string
  proposals: Proposal[]
  date: string
}): Promise<void> {
  const { supabase, userId, proposals, date } = args
  if (proposals.length === 0) return

  const { error } = await supabase.from('agent_proposal').upsert(
    proposals.map((p) => ({
      user_id: userId,
      id: p.id,
      brief_date: date,
      title: p.title,
      body: p.body,
      apps: p.apps,
      severity: p.severity,
      state: 'pending',
      decided_at: null,
    })),
    { onConflict: 'user_id,id', ignoreDuplicates: true },
  )
  if (error) throw new Error(`Could not save the proposals: ${error.message}`)
}

/** The inbox: every proposal from this date, whatever was decided about it. */
export async function readProposals(
  supabase: SupabaseClient,
  date: string,
): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('agent_proposal')
    .select('id, title, body, apps, severity, state')
    .eq('brief_date', date)
    .order('id')

  if (error) throw new Error(`Could not read your inbox: ${error.message}`)
  return (data ?? []) as unknown as Proposal[]
}

/**
 * Record a decision. This is the entire effect of "Accept".
 *
 * `decided_at` moves in lockstep with `state`, which the table's own check
 * constraint also enforces — the two halves of "decided" can never disagree,
 * whichever of them a future caller forgets.
 */
export async function decideProposal(args: {
  supabase: SupabaseClient
  id: string
  state: Exclude<ProposalState, 'pending'>
  now: Date
}): Promise<boolean> {
  const { supabase, id, state, now } = args
  const { data, error } = await supabase
    .from('agent_proposal')
    .update({ state, decided_at: now.toISOString() })
    .eq('id', id)
    .select('id')

  if (error) throw new Error(`Could not record that: ${error.message}`)
  return (data ?? []).length > 0
}
