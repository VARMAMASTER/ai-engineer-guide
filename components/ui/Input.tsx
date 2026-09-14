'use client'

import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { cx } from './cx'

export type InputProps = ComponentPropsWithoutRef<'input'>

/**
 * A thin wrapper around `<input>` that applies the `.input` token class and
 * merges `className` rather than replacing it. Every other prop — `ref`,
 * `onChange`, `name`, `required`, `aria-*` — passes straight through.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx('input', className)} {...rest} />
})

export default Input
