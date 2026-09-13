'use client'

import { forwardRef, useEffect, useRef, useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

/** A bare sign, a bare dot, or a dot-terminated number — a number mid-type. */
function isIncomplete(raw: string): boolean {
  return raw === '-' || raw === '.' || raw === '-.' || raw.endsWith('.')
}

export interface NumberInputProps
  extends Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'type'> {
  /**
   * `null` is an empty field; `0` is a typed zero. A diet or workout logger
   * that can't tell "not entered yet" from "zero" is a real bug, so this
   * component never coerces one into the other.
   */
  value: number | null
  onChange: (value: number | null) => void
}

/**
 * A numeric field that reports `number | null`, never a silently-coerced
 * zero. It renders as `type="text"` with `inputMode="decimal"` rather than
 * `type="number"` — a native number input already mangles "-", "1.", and
 * leading zeros as you type, which is exactly the intermediate state this
 * component needs to hold onto.
 *
 * Keystrokes are only forwarded to `onChange` once they parse to a finite
 * number, or once the field is fully cleared (which reports `null`). An
 * in-progress "-", ".", or "12." is kept in the field's own text so typing
 * isn't fought, but the caller's state never sees `NaN` or a truncated
 * value. The field re-syncs its local text from `value` whenever the prop
 * changes to something other than what this component itself last reported
 * (e.g. an external reset), so a mid-edit "12." isn't stomped by its own echo.
 */
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, className, ...rest },
  ref,
) {
  const [text, setText] = useState(() => (value === null ? '' : String(value)))
  const lastReported = useRef<number | null>(value)

  useEffect(() => {
    if (value !== lastReported.current) {
      lastReported.current = value
      setText(value === null ? '' : String(value))
    }
  }, [value])

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      className={cx('input', 'input-num', className)}
      value={text}
      onChange={(event) => {
        const raw = event.target.value

        // Reject anything that isn't the shape of a signed decimal in
        // progress — keeps stray letters from ever reaching local state.
        if (!/^-?\d*\.?\d*$/.test(raw)) return

        setText(raw)

        if (raw === '') {
          lastReported.current = null
          onChange(null)
          return
        }

        if (isIncomplete(raw)) return

        const parsed = Number(raw)
        if (Number.isFinite(parsed)) {
          lastReported.current = parsed
          onChange(parsed)
        }
      }}
      {...rest}
    />
  )
})

export default NumberInput
