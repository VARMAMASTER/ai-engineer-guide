import * as React from 'react'
import { cx } from './cx'

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
