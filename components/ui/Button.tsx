'use client'

import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'accent' | 'quiet' | 'danger'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  accent: 'btn-accent',
  quiet: 'btn-quiet',
  danger: 'btn-danger',
}

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  /**
   * Marks the button as busy: sets `aria-busy` and forces `disabled`, so a
   * double-click during an in-flight request can't fire the action twice.
   */
  loading?: boolean
}

/**
 * A plain `<button>` in a form defaults to `type="submit"` — that default has
 * bitten people, so this component pins `type="button"` unless the caller
 * opts back into `"submit"` explicitly.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'quiet', loading = false, type = 'button', className, disabled, children, ...rest },
  ref,
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      className={cx('btn', VARIANT_CLASS[variant], className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
        />
      ) : null}
      {children}
    </button>
  )
})

export default Button
