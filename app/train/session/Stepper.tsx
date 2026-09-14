'use client'

import Button from '@/components/ui/Button'
import NumberInput from '@/components/ui/NumberInput'

export interface StepperProps {
  label: string
  value: number
  step: number
  min?: number
  max?: number
  unit?: string
  onChange: (value: number) => void
  /** Prefix for the test handles on the three controls. */
  testId: string
}

/**
 * Minus / value / plus, sized for a gym rather than a desk.
 *
 * The design system's floor is 44px. These are 56px, deliberately above it:
 * this control is used one-handed, standing, between sets, often with chalk or
 * sweat on the thumb, and 44px is the minimum at which a seated user with a
 * mouse-grade pointer succeeds. The +/- buttons carry the whole job — the
 * common case is "the suggestion, unchanged" or "half a plate either way" — and
 * they are what a person uses without looking.
 *
 * The value in the middle is still a real `NumberInput`, because the first
 * session of a new exercise starts at zero and stepping from 0 to 100kg in
 * 2.5kg taps is a punishment. It reports `number | null`, so a cleared field is
 * held as empty rather than silently becoming 0, and `inputMode="decimal"`
 * brings up the numeric keypad instead of a qwerty keyboard.
 *
 * Not a `<input type="range">`: a slider cannot express 42.5 reliably with a
 * thumb, and cannot be read at a glance from arm's length.
 */
export default function Stepper({
  label,
  value,
  step,
  min = 0,
  max = 999,
  unit,
  onChange,
  testId,
}: StepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 100) / 100))

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="eyebrow" id={`${testId}-label`}>
        {label}
      </span>
      <div className="flex items-stretch gap-2">
        <Button
          variant="quiet"
          className="h-14 w-14 shrink-0 text-xl"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label={`${label}: down ${step}${unit ? ` ${unit}` : ''}`}
          data-testid={`${testId}-down`}
        >
          <span aria-hidden="true">&minus;</span>
        </Button>
        <NumberInput
          value={value}
          onChange={(next) => onChange(clamp(next ?? min))}
          aria-labelledby={`${testId}-label`}
          className="h-14 min-w-0 flex-1 text-center text-xl"
          data-testid={`${testId}-value`}
        />
        <Button
          variant="quiet"
          className="h-14 w-14 shrink-0 text-xl"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label={`${label}: up ${step}${unit ? ` ${unit}` : ''}`}
          data-testid={`${testId}-up`}
        >
          <span aria-hidden="true">+</span>
        </Button>
      </div>
    </div>
  )
}
