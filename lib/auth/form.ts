/**
 * The shape a form action hands back to the form.
 *
 * It lives outside `actions.ts` because a `'use server'` module may only export
 * async functions — a plain constant there is a build error, and the initial
 * state has to come from somewhere both the client form and the tests can read.
 */
export interface AuthFormState {
  error: string | null
  notice: string | null
}

export const EMPTY_FORM_STATE: AuthFormState = { error: null, notice: null }

/** Shortest password the sign-up form accepts. Supabase's own floor is 6. */
export const MIN_PASSWORD = 8
