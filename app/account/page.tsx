import type { Metadata } from 'next'
import AccountActions from '@/components/AccountActions'
import { requireUser } from '@/lib/auth/user'
import { ACCOUNT_PATH } from '@/lib/auth/routes'

export const metadata: Metadata = {
  title: 'Account | Unyfide',
}

/**
 * The account itself: who you are, how to take your data out, and how to leave.
 *
 * `requireUser()` here as well as in the proxy. Belt and braces on purpose —
 * the proxy's matcher is a regular expression, and a regular expression is
 * exactly the kind of thing that stops matching one day without telling anyone.
 */
export default async function AccountPage() {
  const user = await requireUser(ACCOUNT_PATH)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Account</p>
        <h1>Account</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Signed in as <span className="readout text-[var(--text)]">{user.email ?? user.id}</span>.
        </p>
      </div>

      <div className="panel flex flex-col gap-3 p-5">
        <h2>Export your data</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Everything the account holds, as one JSON file. It is read with your own permissions, so
          it contains your rows and nobody else&rsquo;s.
        </p>
        <p>
          <a href="/api/account/export" className="chip" download data-testid="export-link">
            Download export
          </a>
        </p>
      </div>

      <AccountActions email={user.email} />
    </div>
  )
}
