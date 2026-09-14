import type { Metadata } from 'next'
import AuthForm from '@/components/AuthForm'
import { ACCOUNT_PATH, safeNext } from '@/lib/auth/routes'

export const metadata: Metadata = {
  title: 'Create an account | Unyfide',
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const { next } = await searchParams
  const target = safeNext(Array.isArray(next) ? next[0] : next, ACCOUNT_PATH)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Account</p>
        <h1>Create an account</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Whatever progress this browser already holds is imported the first time you sign in, and
          nothing local is thrown away until the account copy is confirmed.
        </p>
      </div>

      <AuthForm mode="sign-up" next={target} />
    </div>
  )
}
