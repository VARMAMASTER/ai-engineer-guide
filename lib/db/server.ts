import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PUBLISHABLE_KEY, SUPABASE_URL } from './env'

/**
 * The Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * A NEW client per request, always. It is essentially a configured `fetch`, and
 * the configuration is this request's cookies — a module-level instance would
 * serve one visitor's session to the next, which under Fluid compute means a
 * real cross-user leak rather than a stale render.
 *
 * This module imports `next/headers` and therefore must never be pulled into a
 * Client Component. That is why `lib/db` has no barrel that re-exports it: the
 * browser and server clients keep separate import paths on purpose.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      // The second argument the library passes — the cache headers — is
      // deliberately not taken: a Server Component cannot set response headers
      // either. The proxy applies them.
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component, which cannot write cookies. Safe to
          // ignore: `proxy.ts` refreshes the session on every request, so the
          // refreshed token is already on its way to the browser. The cache
          // headers `setAll` also carries cannot be applied here either, which
          // is the other half of why the proxy has to exist.
        }
      },
    },
  })
}
