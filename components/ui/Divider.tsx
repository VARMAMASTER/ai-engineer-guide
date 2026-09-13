import * as React from 'react'

/** Merge classNames without a `clsx` dependency: falsy values drop out. */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export type DividerProps = React.ComponentPropsWithoutRef<'hr'>

/**
 * A 1px rule between sections (`.divider`). A real `<hr>`, not a styled
 * `<div>`, so it carries the implicit `role="separator"` for free.
 */
const Divider = React.forwardRef<HTMLHRElement, DividerProps>(function Divider(
  { className, ...props },
  ref,
) {
  return <hr ref={ref} className={cx('divider', className)} {...props} />
})
Divider.displayName = 'Divider'

export default Divider
