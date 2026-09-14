import { createBrowserClient } from '@supabase/ssr'
import { PUBLISHABLE_KEY, SUPABASE_URL } from './env'

/**
 * The Supabase client for code that runs in the browser.
 *
 * `createBrowserClient` is already a singleton internally, so calling this on
 * every render is free — there is deliberately no module-level instance here,
 * because one would be created during the server render of any file that
 * imports this module.
 *
 * It is given the PUBLISHABLE key, never the secret or service-role key.
 * Anything reachable from a Client Component is shipped to the browser, so a
 * secret imported here is a secret published.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, PUBLISHABLE_KEY)
}
