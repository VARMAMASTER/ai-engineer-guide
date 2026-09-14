import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { DB_CONFIGURED } from '@/lib/db/env'
import { SIGN_IN_PATH, signInUrlFor } from './routes'

/**
 * Who is signed in, on the server.
 *
 * The shape is deliberately tiny. Feature code needs an id to scope by and an
 * address to show; anything richer invites reading authorisation facts out of
 * the token, and the one place that is genuinely unsafe is `user_metadata`,
 * which the user can edit themselves. It is not exposed here at all.
 */
export interface CurrentUser {
  id: string
  email: string | null
}

/**
 * The verified current user, or null.
 *
 * `getClaims()` verifies the JWT signature — against the project's published
 * JWKS, in process, no network call on the happy path. `getSession()` would be
 * faster still and completely wrong: it returns whatever the cookie says, and
 * the cookie is under the caller's control.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!DB_CONFIGURED) return null

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null

  const { sub, email } = data.claims
  if (typeof sub !== 'string' || sub === '') return null

  return { id: sub, email: typeof email === 'string' ? email : null }
}

/**
 * The current user, or a redirect to sign-in. The contract for every server
 * component, server action and route handler that touches personal data.
 *
 * `next` is optional because a Server Component cannot read its own URL. Pass
 * it when you have it so the user lands back where they were; the proxy already
 * does this for whole routes, so this is mostly for actions and API handlers.
 */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (user) return user
  redirect(next ? signInUrlFor(next) : SIGN_IN_PATH)
}
