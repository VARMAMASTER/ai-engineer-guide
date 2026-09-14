'use client'

import { useActionState } from 'react'
import Button from './ui/Button'
import Field from './ui/Field'
import Input from './ui/Input'
import { deleteAccountAction, signOutAction } from '@/lib/auth/actions'
import { EMPTY_FORM_STATE, type AuthFormState } from '@/lib/auth/form'

export interface AccountActionsProps {
  email: string | null
}

/**
 * Sign out, and the one irreversible button in the app.
 *
 * Deletion is gated behind typing the account's own email rather than a
 * confirm dialog. A dialog is one keystroke away from being dismissed by
 * muscle memory; retyping the address takes long enough to notice what you are
 * doing, and it cannot be triggered by a stray click at all.
 */
export default function AccountActions({ email }: AccountActionsProps) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    deleteAccountAction,
    EMPTY_FORM_STATE,
  )

  return (
    <div className="flex flex-col gap-6">
      <form action={signOutAction}>
        <Button type="submit" variant="quiet" data-testid="sign-out">
          Sign out
        </Button>
      </form>

      <div className="panel flex flex-col gap-4 p-5">
        <div>
          <h2>Delete this account</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Removes the account and every row belonging to it, immediately and for good. Export
            first if you want a copy. Existing sessions are revoked before the account goes.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <Field
            label="Type your email address to confirm"
            hint={email ?? undefined}
            error={state.error ?? undefined}
          >
            <Input
              type="email"
              name="confirm"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              data-testid="delete-confirm"
            />
          </Field>

          <Button type="submit" variant="danger" loading={pending} data-testid="delete-account">
            Delete account
          </Button>
        </form>
      </div>
    </div>
  )
}
