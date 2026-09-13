import * as React from 'react'

/** Merge classNames without a `clsx` dependency: falsy values drop out. */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export interface MeterProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'role'> {
  value: number
  min?: number
  max?: number
  /**
   * The accessible name, required. Read by `role="progressbar"` via
   * `aria-label` — this is the string an e2e test finds the meter by
   * (`getByRole('progressbar', { name })`).
   */
  label: string
  /** Show a `n%` readout above the track. Off by default. */
  showValue?: boolean
}

/**
 * A general-purpose accessible progress bar over the shared `.meter-track` /
 * `.meter-fill` classes.
 *
 * Clamping decision: `value` is clamped to `[min, max]` for BOTH the
 * announced `aria-valuenow` and the painted fill width — never just one of
 * the two. The WAI-ARIA spec requires `aria-valuenow` to sit within
 * `aria-valuemin`/`aria-valuemax`; a screen reader given 120 on a 0–100 meter
 * would be reporting a state the widget cannot actually represent. So out-of
 * range input is clamped rather than rejected: 120 on a 0–100 meter reads
 * (and paints) as 100, and -5 reads (and paints) as 0.
 *
 * This is `components/ui/Meter.tsx`, the general primitive — it is
 * intentionally NOT `components/Meter.tsx` (the existing done/target meter
 * used by pages today), which is left untouched.
 */
const Meter = React.forwardRef<HTMLDivElement, MeterProps>(function Meter(
  { value, min = 0, max = 100, label, showValue = false, className, ...props },
  ref,
) {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const clamped = Math.min(hi, Math.max(lo, value))
  const pct = hi === lo ? 0 : ((clamped - lo) / (hi - lo)) * 100
  const complete = hi > lo && clamped >= hi

  return (
    <div ref={ref} className={cx('flex w-full flex-col gap-1.5', className)} {...props}>
      {showValue ? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="eyebrow">{label}</span>
          <span
            className="readout font-medium"
            style={{ color: complete ? 'var(--positive)' : 'var(--text)' }}
          >
            {Math.round(pct)}%
          </span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={lo}
        aria-valuemax={hi}
        aria-label={label}
        data-complete={complete ? 'true' : 'false'}
        className="meter-track"
      >
        <div className="meter-fill" data-complete={complete ? 'true' : 'false'} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
})
Meter.displayName = 'Meter'

export default Meter
