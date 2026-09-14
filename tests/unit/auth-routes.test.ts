import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createContext, runInNewContext } from 'node:vm'
import {
  ACCOUNT_PATH,
  APP_ROOTS,
  SIGN_IN_PATH,
  isProtectedPath,
  isSignedOutOnlyPath,
  safeNext,
  signInUrlFor,
} from '@/lib/auth/routes'
import { LEARN_SECTIONS, NAV_DESTINATIONS } from '@/lib/nav'

/**
 * The public/private split, asserted from both ends.
 *
 * The failure this is written against is a quiet one: a path rule that drifts
 * so that either the learning half starts demanding a session (a regression
 * nobody reports, they just stop using it) or an account route stops demanding
 * one (a leak nobody notices at all).
 */

describe('the learning half stays public', () => {
  it('never asks for a session on any study section', () => {
    for (const section of LEARN_SECTIONS) {
      expect(isProtectedPath(section.href), `${section.href} must stay login-free`).toBe(false)
    }
  })

  it('leaves every nav destination reachable signed out', () => {
    // Derived from the nav model rather than listed here, so a new tab cannot
    // ship silently gated. The mini-app landing pages are part of this: the tab
    // bar is a permanent promise, and a tab that bounces to a login form keeps
    // that promise no better than one that 404s.
    for (const href of NAV_DESTINATIONS) {
      expect(isProtectedPath(href), `${href} is in the nav and must render signed out`).toBe(false)
    }
  })

  it('leaves the deep study routes public too', () => {
    for (const path of ['/dsa/arrays-hashing', '/revise/sheets', '/companies/google', '/offline']) {
      expect(isProtectedPath(path)).toBe(false)
    }
  })
})

describe('the private half is gated', () => {
  it('protects the account and its API', () => {
    expect(isProtectedPath(ACCOUNT_PATH)).toBe(true)
    expect(isProtectedPath('/account/')).toBe(true)
    expect(isProtectedPath('/account/danger')).toBe(true)
    expect(isProtectedPath('/api/account/export')).toBe(true)
  })

  it('protects everything inside a mini-app but not its landing page', () => {
    for (const root of APP_ROOTS) {
      expect(isProtectedPath(root), `${root} is the public gate`).toBe(false)
      expect(isProtectedPath(`${root}/`), 'a trailing slash is the same page').toBe(false)
      expect(isProtectedPath(`${root}/log`)).toBe(true)
      expect(isProtectedPath(`${root}/log/2026-09-14`)).toBe(true)
    }
  })

  it('is not fooled by a prefix that merely starts the same way', () => {
    expect(isProtectedPath('/dietary')).toBe(false)
    expect(isProtectedPath('/training')).toBe(false)
    expect(isProtectedPath('/opsec')).toBe(false)
    expect(isProtectedPath('/accounts')).toBe(false)
  })
})

describe('signed-out-only routes', () => {
  it('covers sign-in and sign-up', () => {
    expect(isSignedOutOnlyPath('/sign-in')).toBe(true)
    expect(isSignedOutOnlyPath('/sign-up')).toBe(true)
    expect(isSignedOutOnlyPath('/today')).toBe(false)
  })
})

describe('carrying the destination through sign-in', () => {
  it('encodes where the visitor was going', () => {
    expect(signInUrlFor('/diet/log')).toBe(`${SIGN_IN_PATH}?next=%2Fdiet%2Flog`)
    expect(signInUrlFor('/diet/log', '?day=2026-09-14')).toBe(
      `${SIGN_IN_PATH}?next=%2Fdiet%2Flog%3Fday%3D2026-09-14`,
    )
  })

  it('does not loop back to itself', () => {
    expect(signInUrlFor(SIGN_IN_PATH)).toBe(SIGN_IN_PATH)
    expect(signInUrlFor('/')).toBe(SIGN_IN_PATH)
  })
})

describe('safeNext is an open-redirect guard, not a tidy-up', () => {
  it('keeps ordinary paths', () => {
    expect(safeNext('/diet/log')).toBe('/diet/log')
    expect(safeNext('/today?x=1')).toBe('/today?x=1')
  })

  it('rejects anything a browser would treat as absolute', () => {
    // `//evil.com` and `/\evil.com` are both protocol-relative to a browser.
    // A check that only looked at the first character would pass both.
    for (const hostile of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
      '',
    ]) {
      expect(safeNext(hostile), `${hostile} must not survive`).toBe('/today')
    }
    expect(safeNext(null)).toBe('/today')
    expect(safeNext(undefined)).toBe('/today')
  })

  it('never sends a freshly signed-in user back to the sign-in form', () => {
    expect(safeNext('/sign-in')).toBe('/today')
    expect(safeNext('/sign-up')).toBe('/today')
  })
})

/* -------------------------------------------------------------------------
 * The service worker holds a SECOND copy of this rule, because `public/sw.js`
 * is a classic script evaluated in a worker and cannot import a TypeScript
 * module. Two copies of a security rule is one copy too many unless something
 * checks they agree, so this does.
 * ---------------------------------------------------------------------- */

function loadIsPrivatePath(): (path: string) => boolean {
  const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')
  const box = { exports: {} as { isPrivatePath: (path: string) => boolean } }
  const context = createContext({
    self: {
      location: new URL('https://guide.example/sw.js'),
      addEventListener: () => {},
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    caches: {},
    fetch: () => Promise.reject(new Error('not used')),
    module: box,
    URL,
    console,
  })
  runInNewContext(source, context)
  return box.exports.isPrivatePath
}

describe('the service worker agrees about what is private', () => {
  const isPrivatePath = loadIsPrivatePath()

  it('never caches a protected path', () => {
    for (const path of [
      '/account',
      '/account/',
      '/api/account/export',
      '/diet/log',
      '/train/session/1',
      '/ops/todos',
    ]) {
      expect(isProtectedPath(path), path).toBe(true)
      expect(isPrivatePath(path), `sw.js must refuse to cache ${path}`).toBe(true)
    }
  })

  it('also refuses to cache the auth pages, which are not "protected" but are personal', () => {
    for (const path of ['/sign-in', '/sign-up', '/auth/confirm']) {
      expect(isPrivatePath(path), path).toBe(true)
    }
  })

  it('still caches every public page', () => {
    for (const href of [...NAV_DESTINATIONS, '/dsa/arrays-hashing', '/offline', '/kit']) {
      expect(isPrivatePath(href), `${href} must stay offline-capable`).toBe(false)
    }
  })
})
