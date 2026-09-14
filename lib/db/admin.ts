import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from './env'

/**
 * A service-role client. It BYPASSES ROW LEVEL SECURITY.
 *
 * There is exactly one legitimate caller in stage 0: deleting an account, which
 * needs `auth.admin.deleteUser` and no user-facing API can do. Everything else
 * — every read, every write, every export — goes through the request-scoped
 * client in `./server` so that RLS is the thing enforcing isolation rather than
 * the correctness of a `where user_id = …` that someone will one day forget.
 *
 * The key is read from a NON-`NEXT_PUBLIC_` variable, so it is never inlined
 * into a browser bundle. Importing this module from a Client Component is a
 * build error in practice (`@supabase/supabase-js` is fine, but the env var
 * resolves to `undefined` there) and a security bug in principle — so the
 * function throws rather than quietly building a powerless client.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !secret) {
    throw new Error(
      'Admin operations need SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) on the server.',
    )
  }

  return createSupabaseClient(SUPABASE_URL, secret, {
    auth: {
      // No session to persist and nothing to refresh: this client is used for a
      // single privileged call and then thrown away.
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
