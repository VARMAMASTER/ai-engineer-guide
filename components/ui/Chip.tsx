import * as React from 'react'

/** Merge classNames without a `clsx` dependency: falsy values drop out. */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export interface ChipProps extends React.ComponentPropsWithoutRef<'button'> {
  /**
   * Omit this for a plain action chip (e.g. "Clear filters"). Set it to
   * drive the toggle/selected state — `true`/`false` set BOTH `aria-pressed`
   * and `data-active` from the same value in the same render, so the
   * announced state and the painted state (`.chip[aria-pressed="true"]`,
   * `.chip[data-active="true"]`) can never drift apart.
   */
  pressed?: boolean
}

/**
 * A filter or a mode switch. 44px tall, pressable, and — unlike `Tag` — a
 * real `<button>` so it is keyboard reachable and gets Enter/Space for free.
 */
const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { pressed, className, type = 'button', ...props },
  ref,
) {
  const isToggle = pressed !== undefined
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={isToggle ? pressed : undefined}
      data-active={isToggle ? (pressed ? 'true' : 'false') : undefined}
      className={cx('chip', className)}
      {...props}
    />
  )
})
Chip.displayName = 'Chip'

export default Chip
