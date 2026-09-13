import * as React from 'react'

/** Merge classNames without a `clsx` dependency: falsy values drop out. */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export interface StatProps extends React.ComponentPropsWithoutRef<'div'> {
  /** The number (or short string) that is the point of the block. */
  value: React.ReactNode
  /** The eyebrow label above the value — "today's calories", "days left". */
  label: React.ReactNode
  unit?: React.ReactNode
}

/**
 * A number that is the point of its own block. `.stat-value` is already
 * tabular (`font-variant-numeric: tabular-nums`) so a counting value never
 * reflows its own width, and the label sits above it in the same eyebrow
 * voice used across the app.
 */
const Stat = React.forwardRef<HTMLDivElement, StatProps>(function Stat(
  { value, label, unit, className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cx('stat', className)} {...props}>
      <span className="eyebrow">{label}</span>
      <span className="stat-value">
        {value}
        {unit != null ? <span className="stat-unit"> {unit}</span> : null}
      </span>
    </div>
  )
})
Stat.displayName = 'Stat'

export default Stat
