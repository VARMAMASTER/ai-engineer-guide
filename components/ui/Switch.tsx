'use client'

import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { cx } from './cx'

export interface SwitchProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'onClick' | 'type' | 'role' | 'children'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/**
 * A real `<button type="button" role="switch">`. Space, Enter, and click are
 * never reimplemented — they are native button activation, which is what a
 * real button gives for free and a `<div onClick>` never fully does.
 *
 * The button itself is the 44px hit area (`h-11 w-11`); the visible track is
 * smaller and centered inside it, so the tap target is bigger than the paint.
 * Every colour comes from the existing tokens — there is no new palette here.
 */
const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, className, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-pill)] transition-colors duration-[var(--dur)] ease-[var(--ease)] disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cx(
          'relative h-6 w-10 rounded-[var(--radius-pill)] border transition-colors duration-[var(--dur)] ease-[var(--ease)]',
          checked ? 'border-[var(--accent-line)] bg-[var(--accent)]' : 'border-[var(--panel-border)] bg-[var(--track)]',
        )}
      >
        <span
          className={cx(
            'absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[var(--panel-solid)] shadow-sm transition-transform duration-[var(--dur)] ease-[var(--ease)]',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  )
})

export default Switch
