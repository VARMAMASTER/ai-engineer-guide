/**
 * Which URLs need a session, as a pure function.
 *
 * This is the load-bearing half of the public/private split, so it is a plain
 * string predicate with no imports: `proxy.ts` calls it on every request, the
 * account pages call it, and `tests/unit/auth-routes.test.ts` calls it without
 * a browser, a database or a running server.
 *
 * THE RULE, and why it is shaped this way.
 *
 * The fifteen learning routes stay public and login-free. That half of the app
 * is meant to be shareable, it works offline, and it worked for six months with
 * no backend at all; putting it behind a session would be a regression, not a
 * feature. So the default is PUBLIC and the protected set is enumerated.
 *
 * The three mini-app LANDING pages — `/diet`, `/train`, `/ops` — are public
 * too, and this is deliberate. The bottom tab bar is a permanent promise about
 * the shape of the system (see `components/AppPlaceholder.tsx`), and a tab that
 * bounces to a login form keeps that promise no better than a tab that 404s.
 * Signed out, they render their own gate: the app's name, what it is for, and
 * a way in. They hold no data, so there is nothing there to leak.
 *
 * Everything INSIDE a mini-app is protected — `/diet/log`, `/train/session`,
 * `/ops/todos` — along with `/account` and the account API. That is where the
 * data lives, and a redirect there is impossible for a feature author to
 * forget, which a `requireUser()` call at the top of a page is not.
 */

export const SIGN_IN_PATH = '/sign-in'
export const SIGN_UP_PATH = '/sign-up'
export const ACCOUNT_PATH = '/account'

/** The mini-apps whose landing page is public but whose interior is not. */
export const APP_ROOTS = ['/diet', '/train', '/ops'] as const

/** Protected wherever they appear, landing page included. */
const ALWAYS_PROTECTED = [ACCOUNT_PATH, '/api/account'] as const

/** Reachable only while signed OUT; a signed-in visitor is sent to /account. */
const SIGNED_OUT_ONLY = [SIGN_IN_PATH, SIGN_UP_PATH] as const

function normalise(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** True when this URL must not be served without a verified session. */
export function isProtectedPath(pathname: string): boolean {
  const path = normalise(pathname)

  for (const prefix of ALWAYS_PROTECTED) {
    if (isUnder(path, prefix)) return true
  }

  // Inside a mini-app, but not its landing page.
  for (const root of APP_ROOTS) {
    if (path !== root && isUnder(path, root)) return true
  }

  return false
}

/** True when a signed-in visitor has no business being here. */
export function isSignedOutOnlyPath(pathname: string): boolean {
  const path = normalise(pathname)
  return SIGNED_OUT_ONLY.some((prefix) => isUnder(path, prefix))
}

/**
 * Where to send someone who has to sign in first, carrying where they were
 * going. The destination is kept as a path only — an absolute URL here is an
 * open-redirect, and `safeNext` below is the other half of that guard.
 */
export function signInUrlFor(pathname: string, search = ''): string {
  const next = `${pathname}${search}`
  if (next === '/' || next === SIGN_IN_PATH) return SIGN_IN_PATH
  return `${SIGN_IN_PATH}?next=${encodeURIComponent(next)}`
}

/**
 * Sanitise a `?next=` value before redirecting to it.
 *
 * Anything that is not a single-slash-rooted path is thrown away. `//evil.com`
 * and `/\evil.com` are both browser-absolute, which is the classic way this
 * check gets bypassed, so the second character is checked too.
 */
export function safeNext(next: string | null | undefined, fallback = '/today'): string {
  if (!next) return fallback
  if (!next.startsWith('/')) return fallback
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback
  if (isSignedOutOnlyPath(next)) return fallback
  return next
}
