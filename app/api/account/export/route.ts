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
