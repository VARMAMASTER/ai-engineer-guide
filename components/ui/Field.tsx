'use client'

import { cloneElement, isValidElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  className?: string
  /** The single form control — Input, Textarea, Select, NumberInput, Switch. */
  children: ReactElement
}

/**
 * Composes a label with a single control, a hint, and an error, and wires
 * the accessibility plumbing between them so no page has to get it right by
 * hand:
 *
 * - `useId` mints a stable id for the control (or reuses one the control
 *   already carries), and `htmlFor` on the label points at it.
 * - `aria-describedby` on the control lists the hint id, the error id, or
 *   both (space-separated) when both are present — never neither when at
 *   least one exists.
 * - `aria-invalid="true"` is set on the control whenever `error` is passed,
 *   and the error text renders with `role="alert"` so it's announced.
 */
export default function Field({ label, hint, error, className, children }: FieldProps) {
  const baseId = useId()
  const existingId = isValidElement(children) ? (children.props as { id?: string }).id : undefined
  const controlId = existingId || `${baseId}-control`
  const hintId = `${baseId}-hint`
  const errorId = `${baseId}-error`

  // The consumer's own aria-describedby is KEPT and appended to, not replaced.
  // Overwriting it silently drops whatever else described the control — the
  // kind of accessibility bug that never shows up visually and never fails a
  // render test.
  const ownDescribedBy = isValidElement(children)
    ? (children.props as { 'aria-describedby'?: string })['aria-describedby']
    : undefined

  const describedBy =
    [ownDescribedBy, hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined

  if (process.env.NODE_ENV !== 'production' && !isValidElement(children)) {
    // Loud in development, because the failure is otherwise silent: the label's
    // htmlFor would point at an id that no element carries, so clicking the
    // label does nothing and a screen reader announces an unlabelled control.
    console.error(
      'Field expects a single React element as its child — the form control it labels.',
    )
  }

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      } as Record<string, unknown>)
    : children

  return (
    <div className={cx('field', className)}>
      <label htmlFor={controlId} className="label">
        {label}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
