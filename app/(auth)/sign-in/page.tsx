import type { Metadata } from 'next'
import AuthForm from '@/components/AuthForm'
import { ACCOUNT_PATH, safeNext } from '@/lib/auth/routes'

export const metadata: Metadata = {
  title: 'Sign in | Unyfide',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>
}) {
  const { next, error } = await searchParams
  const target = safeNext(Array.isArray(next) ? next[0] : next, ACCOUNT_PATH)
  const confirmFailed = (Array.isArray(error) ? error[0] : error) === 'confirm'

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Account</p>
        <h1>Sign in</h1>
        <p className="text-sm text-[var(--text-muted)]">
          An account carries your progress between devices and unlocks Diet, Train and Ops. The
          study sections work signed out, exactly as before.
        </p>
      </div>

      {confirmFailed ? (
        <p role="alert" className="field-error" data-testid="confirm-error">
          That confirmation link has expired or has already been used. Sign in, or create the
          account again.
        </p>
      ) : null}

      <AuthForm mode="sign-in" next={target} />
    </div>
  )
}
