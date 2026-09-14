'use client'

import { usePathname } from 'next/navigation'
import { isSignedOutOnlyPath } from '@/lib/auth/routes'

/**
 * True on the sign-in and sign-up pages, where the app's chrome is wrong.
 *
 * The root layout wraps every route in `Shell`, so the auth pages were getting
 * the full frame: five app tabs, the workspace switcher, and the study-progress
 * readouts. The owner noticed and asked why — reasonably, because it is worse
 * than clutter. Tapping Diet from the sign-in page goes to `/diet`, whose
 * interior needs a session, which sends you back to sign-in. The nav advertises
 * destinations that return you to where you are.
 *
 * The progress readouts are wrong there for a second reason: DAY 022 / 180 and
 * a streak belong to a person, and nobody is identified yet.
 *
 * Deleting the chrome outright would be the other mistake. Installed as a PWA
 * there is no browser back button, so a bare sign-in page is a dead end — the
 * exact trap that up-navigation was added to fix. So the auth layout renders
 * its own minimal header with a way back into the public half of the app, and
 * this hook is how the full chrome stands aside for it.
 *
 * It reuses `isSignedOutOnlyPath` rather than listing the auth routes again:
 * that predicate is already the authority for "signed-in visitors do not belong
 * here", and a second copy of the same list is a second thing to forget.
 */
export function useBareChrome(): boolean {
  const pathname = usePathname() ?? ''
  return isSignedOutOnlyPath(pathname)
}
