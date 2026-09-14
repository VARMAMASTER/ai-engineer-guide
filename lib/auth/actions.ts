'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { DB_CONFIGURED } from '@/lib/db/env'
import { getCurrentUser } from './user'
import { MIN_PASSWORD, type AuthFormState } from './form'
import { ACCOUNT_PATH, safeNext } from './routes'

/**
 * Email sign-in, sign-up, sign-out and account deletion. Deliberately small.
 *
 * No OAuth, no magic links, no org invites: the owner asked for the least auth
 * that works, and every provider added here is a redirect allow-list entry, a
 * set of secrets and a failure mode to maintain for a single-person app.
 */

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!DB_CONFIGURED) return unavailable()

  const email = str(formData.get('email'))
  const password = str(formData.get('password'))
  if (!email || !password) return { error: 'Enter your email and password.', notice: null }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message, notice: null }

  revalidatePath('/', 'layout')
  redirect(safeNext(str(formData.get('next')), ACCOUNT_PATH))
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!DB_CONFIGURED) return unavailable()

  const email = str(formData.get('email'))
  const password = str(formData.get('password'))
  if (!email || !password) return { error: 'Enter an email and a password.', notice: null }
  if (password.length < MIN_PASSWORD) {
    return { error: `Use at least ${MIN_PASSWORD} characters.`, notice: null }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm` },
  })
  if (error) return { error: error.message, notice: null }

  // With email confirmation on, signUp returns a user but no session. Saying so
  // beats a silent redirect to a page that then bounces straight back here.
  if (!data.session) {
    return { error: null, notice: `Check ${email} for a confirmation link, then sign in.` }
  }

  revalidatePath('/', 'layout')
  redirect(safeNext(str(formData.get('next')), ACCOUNT_PATH))
}

/**
 * Sign out everywhere, not just here.
 *
 * `scope: 'global'` revokes the refresh tokens for every session this user has,
 * server-side, so the cookie this browser is about to drop cannot be replayed
 * from a copy someone took. The default `local` scope only clears this device,
 * which is not what "sign out" means to the person clicking it.
 */
export async function signOutAction(): Promise<void> {
  if (DB_CONFIGURED) {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: 'global' })
  }
  revalidatePath('/', 'layout')
  redirect('/today')
}

/**
 * Delete the account and everything in it.
 *
 * Order matters, and it is the order the Supabase security notes call for:
 * REVOKE SESSIONS FIRST, THEN DELETE. Deleting a user does not invalidate
 * access tokens that are already issued — they stay valid until they expire —
 * so delete-then-forget leaves a token that can still read rows for up to an
 * hour. Signing out globally revokes the sessions and refresh tokens first.
 *
 * The rows themselves go via `on delete cascade` on every `user_id` foreign
 * key. That is why the schema contract insists on it: there is no per-table
 * cleanup list here to fall out of date as the mini-apps add tables.
 */
export async function deleteAccountAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!DB_CONFIGURED) return unavailable()

  const user = await getCurrentUser()
  if (!user) return { error: 'You are not signed in.', notice: null }

  const confirm = str(formData.get('confirm')).trim().toLowerCase()
  if (confirm === '' || confirm !== (user.email ?? '').toLowerCase()) {
    return { error: 'Type your email address exactly to confirm.', notice: null }
  }

  const supabase = await createClient()
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })
  if (signOutError) return { error: signOutError.message, notice: null }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message, notice: null }

  revalidatePath('/', 'layout')
  redirect('/today')
}

function str(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : ''
}

function unavailable(): AuthFormState {
  return { error: 'Accounts are not configured for this deployment.', notice: null }
}

/** Where this deployment lives, for the confirmation link in the signup email. */
async function siteOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
