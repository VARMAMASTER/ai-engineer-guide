'use client'

import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export type TextareaProps = ComponentPropsWithoutRef<'textarea'>

/**
 * A thin wrapper around `<textarea>` that applies the `.textarea` token
 * class and merges `className` rather than replacing it.
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cx('textarea', className)} {...rest} />
})

export default Textarea
