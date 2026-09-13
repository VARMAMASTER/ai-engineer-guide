import * as React from 'react'

/** Merge classNames without a `clsx` dependency: falsy values drop out. */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export interface EmptyStateProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  /**
   * The CTA slot — a `Chip`, a `<Link>`, a `<button>`, whatever gets the
   * viewer unstuck. Required: an empty state that only says "nothing here"
   * is a dead end, so this component always renders something next to say
   * what to do about it.
   */
  action: React.ReactNode
  /** Decorative glyph/illustration above the title. */
  icon?: React.ReactNode
}

/**
 * Empty state (`.empty`). Always pairs the "there's nothing here" message
 * with a way out.
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { title, description, action, icon, className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cx('empty', className)} {...props}>
      {icon ? (
        <div aria-hidden="true" className="text-2xl">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      {description ? <p className="text-sm text-[var(--text-muted)]">{description}</p> : null}
      <div className="mt-1">{action}</div>
    </div>
  )
})
EmptyState.displayName = 'EmptyState'

export default EmptyState
