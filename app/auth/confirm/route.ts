import type { EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/db/server'
import { ACCOUNT_PATH, SIGN_IN_PATH, safeNext } from '@/lib/auth/routes'

/**
 * Where the link in a confirmation email lands.
 *
 * Two shapes arrive here and both are handled, because which one you get
 * depends on a dashboard setting rather than on this code:
 *
 *  - `?token_hash=…&type=email` — what the email template sends when it is
 *    written the way the current docs recommend:
 *    `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`
 *  - `?code=…` — what Supabase's DEFAULT template produces, because
 *    `{{ .ConfirmationURL }}` goes via the Auth server's own `/verify`
 *    endpoint, which then bounces to `emailRedirectTo` with a PKCE code.
 *
 * Handling only the first would mean a project on the stock template has a
 * confirmation link that lands on a page which quietly does nothing.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const next = safeNext(searchParams.get('next'), ACCOUNT_PATH)

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) redirect(next)
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) redirect(next)
  }

  redirect(`${SIGN_IN_PATH}?error=confirm`)
}
