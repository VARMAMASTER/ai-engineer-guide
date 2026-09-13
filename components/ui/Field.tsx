'use client'

import { cloneElement, isValidElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

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

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

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
