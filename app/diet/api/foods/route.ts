import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { offProductToFood, type OffProduct } from '@/lib/diet/data'

/**
 * Packaged-food lookup, through Open Food Facts.
 *
 * **Keyless, and that is a constraint rather than a convenience.** Open Food
 * Facts takes no API key and none is ever sent; nothing here reads an
 * environment variable, so there is no key to leak, rotate or forget to set in
 * a preview. It covers packaged goods and it does not cover home cooking, which
 * is why search is the SECONDARY path in this app: no API knows dal properly,
 * so the user's own library covers that and this covers the biscuit packet.
 *
 * Why a route handler rather than a `fetch` from the browser:
 *
 *  - Open Food Facts asks callers to identify themselves in a User-Agent. A
 *    browser will not let a page set that header, so the request would go out
 *    anonymous.
 *  - The response is cached here for an hour, shared across everybody who looks
 *    up the same thing, instead of once per user per tab.
 *  - The upstream shape (a crowd-sourced record with every field optional) is
 *    normalised once, by `offProductToFood`, which is unit-tested against real
 *    product payloads. The client only ever sees a `FoodItem`.
 *
 * It requires a session — the proxy already enforces that for everything under
 * `/diet/` that is not the landing page, and the check is repeated here because
 * this handler is also an open proxy to a third party if it is not.
 */

/**
 * Open Food Facts' search service, not the legacy `/cgi/search.pl`.
 *
 * The old CGI endpoint answers a curl and then serves a 503 "page temporarily
 * unavailable" to the same query from a server runtime — it is throttled, and
 * Open Food Facts have moved free-text search here. Found by probing both: the
 * CGI one returned 200 to curl and 503 to the app, which is exactly the kind of
 * difference that looks like a bug in the app.
 */
const OFF_SEARCH = 'https://search.openfoodfacts.org/search'
const USER_AGENT = 'Unyfide/0.1 (https://github.com/unyfide) diet food lookup'
const TIMEOUT_MS = 8000

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const query = (request.nextUrl.searchParams.get('q') ?? '').trim()
  if (query.length < 2) return NextResponse.json({ foods: [] })

  const url = new URL(OFF_SEARCH)
  url.searchParams.set('q', query.slice(0, 80))
  url.searchParams.set('page_size', '16')
  url.searchParams.set(
    'fields',
    'code,product_name,product_name_en,brands,serving_size,nutriments',
  )

  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // An hour. Product energy values do not change on a shorter timescale
      // than that, and the alternative is hammering a volunteer-run service.
      next: { revalidate: 3600 },
    })
    if (!response.ok) {
      return NextResponse.json(
        { foods: [], error: 'Open Food Facts is not answering right now. Add the food by hand.' },
        { status: 200 },
      )
    }
    const body = (await response.json()) as { hits?: OffProduct[] }
    // Products with no energy at all are dropped by the mapper, and the
    // database is full of them — hence asking for more hits than are shown.
    const foods = (body.hits ?? [])
      .map(offProductToFood)
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .slice(0, 10)

    return NextResponse.json({ foods })
  } catch {
    // A timeout or a network failure is not an error the user can act on, and
    // it must not look like "no such food" either — the message says which.
    return NextResponse.json(
      { foods: [], error: 'Could not reach Open Food Facts. Add the food by hand.' },
      { status: 200 },
    )
  }
}
