'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import Button from './ui/Button'
import Field from './ui/Field'
import Input from './ui/Input'
import { signInAction, signUpAction } from '@/lib/auth/actions'
import { EMPTY_FORM_STATE, MIN_PASSWORD, type AuthFormState } from '@/lib/auth/form'
import { SIGN_IN_PATH, SIGN_UP_PATH } from '@/lib/auth/routes'

export interface AuthFormProps {
  mode: 'sign-in' | 'sign-up'
  /** Where to land afterwards, already sanitised by the page. */
  next: string
}

/**
 * One form for both halves of email auth.
 *
 * A server action rather than a client-side `signInWithPassword`, because the
 * session has to arrive as an HTTP-only cookie the server can read on the very
 * next request. Setting it from the browser means the first render after
 * sign-in is still signed out, which shows up as a flash of the wrong page.
 */
export default function AuthForm({ mode, next }: AuthFormProps) {
  const signingIn = mode === 'sign-in'
  const action = signingIn ? signInAction : signUpAction
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    EMPTY_FORM_STATE,
  )

  return (
    <form action={formAction} className="panel flex flex-col gap-4 p-5">
      <input type="hidden" name="next" value={next} />

      <Field label="Email">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          required
          autoCapitalize="none"
          spellCheck={false}
        />
      </Field>

      <Field
        label="Password"
        hint={signingIn ? undefined : `At least ${MIN_PASSWORD} characters.`}
      >
        <Input
          type="password"
          name="password"
          autoComplete={signingIn ? 'current-password' : 'new-password'}
          required
          minLength={signingIn ? undefined : MIN_PASSWORD}
        />
      </Field>

      {state.error ? (
        <p role="alert" className="field-error" data-testid="auth-error">
          {state.error}
        </p>
      ) : null}

      {state.notice ? (
        <p role="status" className="text-sm text-[var(--text-muted)]" data-testid="auth-notice">
          {state.notice}
        </p>
      ) : null}

      <Button type="submit" variant="accent" loading={pending}>
        {signingIn ? 'Sign in' : 'Create account'}
      </Button>

      <p className="text-sm text-[var(--text-muted)]">
        {signingIn ? 'No account yet? ' : 'Already have an account? '}
        <Link
          href={signingIn ? SIGN_UP_PATH : SIGN_IN_PATH}
          className="underline underline-offset-2"
        >
          {signingIn ? 'Create one' : 'Sign in'}
        </Link>
        .
      </p>
    </form>
  )
}
