/**
 * The two public Supabase settings, read once and in one place.
 *
 * `process.env.NEXT_PUBLIC_*` is inlined at build time, so these have to be
 * written out as full static property accesses — a computed lookup such as
 * `process.env[name]` is NOT replaced by the bundler and arrives as
 * `undefined` in the browser.
 *
 * Nothing secret may appear in this file. It is imported by browser code.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/**
 * The publishable key. The legacy `anon` key is accepted as a fallback because
 * the project still has one provisioned; new code should not rely on it.
 */
export const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ''

/**
 * Whether the app has a database to talk to at all.
 *
 * The learning half must keep working with no backend configured — that is the
 * property section 3 of the spec is protecting — so every auth surface checks
 * this instead of assuming the environment is complete. A missing key becomes
 * "accounts are unavailable", not a stack trace on `/dsa`.
 */
export const DB_CONFIGURED = SUPABASE_URL !== '' && PUBLISHABLE_KEY !== ''
