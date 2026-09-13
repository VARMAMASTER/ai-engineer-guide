import * as React from 'react'

/** Merge classNames without a `clsx` dependency: falsy values drop out. */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export type SkeletonProps = React.ComponentPropsWithoutRef<'div'>

/**
 * Loading placeholder (`.skeleton`). Decorative, not content, so it is
 * `aria-hidden="true"` by default — a screen reader has nothing useful to
 * say about an empty shimmering box, and announcing one is worse than
 * silence. Pass `aria-hidden={false}` (or a `role`) if a given usage genuinely
 * needs to be exposed. The shimmer itself is defined in `globals.css` and
 * already turns off under reduced motion — nothing to do here.
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, 'aria-hidden': ariaHidden, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden={ariaHidden ?? true}
      className={cx('skeleton', className)}
      {...props}
    />
  )
})
Skeleton.displayName = 'Skeleton'

export default Skeleton
