import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ACCOUNT_PATH, isProtectedPath, isSignedOutOnlyPath, signInUrlFor } from '@/lib/auth/routes'
import { DB_CONFIGURED, PUBLISHABLE_KEY, SUPABASE_URL } from './env'

/**
 * Refresh the auth token, and decide whether this request may proceed.
 *
 * Run from `proxy.ts` at the project root. Server Components cannot write
 * cookies, so this is the only place a refreshed token can be handed to both
 * the browser (`response.cookies`) and the rest of this render
 * (`request.cookies`). Without it, users get logged out at random when a token
 * expires mid-navigation.
 *
 * `getClaims()` — not `getUser()`, and never `getSession()` — is what verifies
 * identity here. The project signs with an asymmetric key, so `getClaims()`
 * validates the JWT signature against the published JWKS locally, with no round
 * trip to the Auth server on the happy path. `getSession()` would hand back
 * whatever the cookie claimed, and the cookie is attacker-controlled.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl
  const protectedPath = isProtectedPath(pathname)

  // No backend configured (a fork, a preview with no env): the learning half
  // must still serve. Private routes fail closed.
  if (!DB_CONFIGURED) {
    if (protectedPath) return NextResponse.redirect(new URL(signInUrlFor(pathname, search), request.url))
    return NextResponse.next({ request })
  }

  // Fast path for the overwhelming majority of traffic: a signed-out visitor on
  // a public learning route. There is no token to refresh, so creating a client
  // would only burn latency — and, more importantly, returning the untouched
  // response keeps those pages free of the `Cache-Control: no-store` that an
  // auth cookie write forces. The learning half stays exactly as cacheable,
  // and as offline-capable, as it was before accounts existed.
  if (!hasAuthCookie(request)) {
    if (protectedPath) return NextResponse.redirect(new URL(signInUrlFor(pathname, search), request.url))
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        // Responses that carry a Set-Cookie for the session must never be
        // cached by a CDN, or one visitor's token is served to the next.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      },
    },
  })

  // Nothing between createServerClient and getClaims(). Anything that can throw
  // or return early in here shows up later as users being logged out at random,
  // which is close to undebuggable from the symptom.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)

  if (!signedIn && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL(signInUrlFor(pathname, search), request.url))
  }

  if (signedIn && isSignedOutOnlyPath(pathname)) {
    return NextResponse.redirect(new URL(ACCOUNT_PATH, request.url))
  }

  // Return this exact response. Building a fresh one here drops the refreshed
  // cookies and desynchronises the browser from the server.
  return response
}

/**
 * Does this request carry a Supabase auth cookie at all?
 *
 * The cookie is `sb-<project_ref>-auth-token`, and it is split into
 * `.0`/`.1` chunks once it outgrows the 4KB per-cookie limit, so this matches
 * on the stable middle rather than an exact name.
 */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'))
}
