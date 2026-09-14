import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/user'
import { loadDietSnapshot } from '@/app/diet/_data/queries'
import { buildBrief } from '@/lib/agent/brief'
import { collectTimelines } from '@/lib/agent/collect'
import { synthesise } from '@/lib/agent/model'
import { checkRateLimit } from '@/lib/agent/rate-limit'
import { insertProposals, proposalsFor, readBrief, writeBrief } from '@/lib/agent/store'

/**
 * The brief: GET reads today's, POST writes a new one.
 *
 * The split is not REST pedantry, it is the cost model. GET is free — it reads
 * a stored row and spends nothing — so the Today page can render the brief on
 * every visit without touching a model. POST is the only thing in this
 * application that costs real money, so it is the only thing rate limited, and
 * it is a POST precisely so it can never be triggered by a prefetch, a crawler
 * or a service worker warming the cache.
 *
 * SCOPING. The request-scoped client throughout, so RLS does the work. The
 * service-role key is not involved and must not be: this is a route a browser
 * reaches.
 *
 * NOTHING HERE WRITES TO A MINI-APP. The agent's two tables are the only ones
 * this handler can write, which is the whole of "advisory only" expressed as
 * code rather than as a promise.
 */

/** `YYYY-MM-DD`, supplied by the client because only it knows the local date. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * How far the client's "today" may be from the server's before we refuse it.
 *
 * The date has to come from the browser — the server's clock is not the user's,
 * and a brief filed under the wrong day is a brief nobody sees. But it is also
 * the primary key, so an unchecked date lets one account create a row (and burn
 * a daily allowance) for every day in history. One day either side covers every
 * real timezone and nothing else.
 */
const MAX_DATE_DRIFT_DAYS = 1

function serverDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function withinDrift(date: string): boolean {
  const asked = Date.parse(`${date}T00:00:00Z`)
  const here = Date.parse(`${serverDate()}T00:00:00Z`)
  if (Number.isNaN(asked)) return false
  return Math.abs(asked - here) <= MAX_DATE_DRIFT_DAYS * 86_400_000
}

function readDate(value: unknown): string | null {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null
  return withinDrift(value) ? value : null
}

/** Personal, and computed per request. Never let anything hold a copy. */
const PRIVATE = { 'cache-control': 'private, no-store' }

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401, headers: PRIVATE })

  const date = readDate(new URL(request.url).searchParams.get('date')) ?? serverDate()
  const supabase = await createClient()

  try {
    const stored = await readBrief(supabase, date)
    const brief = stored.brief
      ? { ...stored.brief, proposals: await proposalsFor(supabase, stored.brief) }
      : null
    return NextResponse.json({ date, brief }, { headers: PRIVATE })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: PRIVATE })
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401, headers: PRIVATE })

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    // An empty body is fine; the server's date is a reasonable default.
  }
  const asked = (body as { date?: unknown })?.date
  if (asked !== undefined && readDate(asked) === null) {
    return NextResponse.json(
      { error: 'That date is not a local date close enough to now to be one of yours.' },
      { status: 400, headers: PRIVATE },
    )
  }
  const date = readDate(asked) ?? serverDate()

  const supabase = await createClient()
  const now = new Date()

  try {
    const stored = await readBrief(supabase, date)

    // Rate limiting BEFORE anything expensive. Signup is open, so the first
    // thing a stranger's request meets is the limit, not the model.
    const decision = checkRateLimit(stored.limit, now)
    if (!decision.allowed) {
      return NextResponse.json(
        { error: decision.message, reason: decision.reason },
        {
          status: 429,
          headers: { ...PRIVATE, 'retry-after': String(decision.retryAfterSeconds) },
        },
      )
    }

    // Diet is read through its own query module, which owns the shape of a
    // Diet snapshot. A failure there costs the Diet card, not the brief.
    let diet = null
    let dietError: string | null = null
    try {
      const loaded = await loadDietSnapshot('/today')
      diet = loaded.error ? null : loaded.snapshot
      dietError = loaded.error
    } catch (error) {
      dietError = String(error).slice(0, 200)
    }

    const { timelines } = await collectTimelines({ supabase, today: date, diet, dietError })

    const brief = await buildBrief({
      timelines,
      today: date,
      synthesise: (args) => synthesise(args),
    })

    await writeBrief({ supabase, userId: user.id, brief, previousCount: stored.limit.count, now })
    await insertProposals({ supabase, userId: user.id, proposals: brief.proposals, date })

    // Re-read the inbox so a proposal decided earlier today comes back decided
    // rather than reset to pending by the object we just built in memory.
    const proposals = await proposalsFor(supabase, brief)

    return NextResponse.json({ date, brief: { ...brief, proposals } }, { headers: PRIVATE })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: PRIVATE })
  }
}
