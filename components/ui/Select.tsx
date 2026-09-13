'use client'

import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export type SelectProps = ComponentPropsWithoutRef<'select'>

/**
 * A thin wrapper around `<select>` that applies the `.select` token class
 * and merges `className` rather than replacing it. `children` is passed
 * through untouched so callers write plain `<option>` elements.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cx('select', className)} {...rest}>
      {children}
    </select>
  )
})

export default Select
