import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/user'

/**
 * Everything this account holds, as one JSON file.
 *
 * A stage-0 obligation rather than a later feature: signup is open, other
 * people's health data is going to live here, and an export is what makes the
 * account leavable. It reads through the REQUEST-SCOPED client, so RLS is doing
 * the scoping — the service-role key is not involved, and a bug here cannot
 * return somebody else's rows even if the query is wrong.
 *
 * Mini-app agents: add your tables to `SOURCES` when you add them. An export
 * that silently omits a table is worse than no export.
 */
const SOURCES = [
  { table: 'learn_profile', columns: 'start_date, theme, progress_imported_at, created_at' },
  { table: 'learn_completion', columns: 'item_id, completed_on' },
  { table: 'learn_revision', columns: 'card_id, rating, rated_at' },
  { table: 'learn_hours', columns: 'day, hours' },
  {
    table: 'diet_profile',
    columns:
      'sex, age_years, height_cm, activity, goal, target_kcal, target_protein_g, kcal_band, window_start, window_end, window_enabled, created_at',
  },
  {
    table: 'diet_food',
    columns:
      'id, name, serving_label, serving_grams, kcal_per_serving, protein_g_per_serving, source, use_count, last_used_at, created_at',
  },
  {
    table: 'diet_entry',
    columns: 'id, food_id, name, servings, kcal, protein_g, at_local, entry_date, logged_at',
  },
  { table: 'diet_weight', columns: 'id, reading_date, kg, at_local, created_at' },
  {
    table: 'diet_forecast',
    columns: 'id, made_on, for_date, horizon_days, kg, low_kg, high_kg, basis, confidence, created_at',
  },
  {
    table: 'train_profile',
    columns: 'goal, experience, available_days, equipment, injuries, plan, created_at, updated_at',
  },
  { table: 'train_session', columns: 'session_id, session_date, day_label, created_at' },
  {
    table: 'train_set',
    columns: 'set_id, session_id, exercise_id, reps, load_kg, rpe, performed_at',
  },
  {
    table: 'ops_task',
    columns:
      'id, title, notes, due_date, due_time, priority, tags, completed, completed_on, recurrence, created_on, created_at',
  },
  {
    table: 'ops_goal',
    columns:
      'id, title, target, unit, current_value, start_date, deadline, linked_task_ids, created_at',
  },
  { table: 'ops_reminder', columns: 'id, task_id, offset_minutes, created_at' },
  // Web push. The endpoint and keys are included because they are this
  // account's own rows and an export that omits a table is worse than no
  // export — but they are a capability to wake this person's devices, so the
  // file they land in is the one the response already marks `private, no-store`.
  {
    table: 'push_subscription',
    columns: 'endpoint, p256dh, auth, timezone, created_at, updated_at',
  },
  { table: 'push_delivery', columns: 'delivery_key, created_at, sent_at, outcome' },
  // The advisory agent. `payload` is the whole brief — what it observed, what
  // it proposed, and the sentence the model wrote — because an export whose
  // point is that the account is leavable cannot omit the one part of the app
  // that formed an opinion about you.
  {
    table: 'agent_brief',
    columns: 'brief_date, payload, generation_count, generated_at, model, created_at',
  },
  {
    table: 'agent_proposal',
    columns: 'id, brief_date, title, body, apps, severity, state, decided_at, created_at',
  },
] as const

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const supabase = await createClient()
  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email },
  }

  for (const source of SOURCES) {
    const { data: rows, error } = await supabase.from(source.table).select(source.columns)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    data[source.table] = rows ?? []
  }

  const stamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="unyfide-export-${stamp}.json"`,
      // Never let a CDN or the service worker hold a copy of somebody's data.
      'cache-control': 'private, no-store',
    },
  })
}
