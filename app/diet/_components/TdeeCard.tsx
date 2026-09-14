'use client'

import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import Meter from '@/components/ui/Meter'
import { describeTdeeBasis, type TdeeEstimate } from '@/lib/diet/energy'
import { kcalText } from '../_lib/format'

/**
 * What your body actually spends, and how much of that is known.
 *
 * `TdeeEstimate` is a discriminated union and this component is a switch over
 * it rather than a set of `?.` reads, which is the point of the union. Under
 * 70% coverage the variant is `provisional` and it declares `kcal?: never` —
 * so the branch that would render a confident number from patchy logging does
 * not compile. There is no cast here to get around that, deliberately: the
 * compile error IS the feature, and every workaround for it ends with somebody
 * being told 2,412 kcal when the honest answer is "somewhere between 2,050 and
 * 2,780, and you have logged nine days of the last twenty-eight".
 *
 * Every variant says which basis it is on, in a sentence written by the domain
 * (`describeTdeeBasis`) rather than paraphrased here — the spec asks for the
 * basis to be stated plainly, and paraphrasing is how "population estimate"
 * quietly becomes "your TDEE".
 */
export default function TdeeCard({ estimate }: { estimate: TdeeEstimate }) {
  return (
    <section className="panel flex flex-col gap-4 p-4" aria-labelledby="tdee-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="tdee-heading" className="eyebrow">
          What you spend
        </h2>
        <Tag variant={estimate.kind === 'measured' ? 'accent' : 'outline'}>
          {BASIS_TAG[estimate.kind]}
        </Tag>
      </div>

      <Body estimate={estimate} />

      <p className="hint" data-testid="tdee-basis">
        {describeTdeeBasis(estimate)}
      </p>

      <Coverage estimate={estimate} />
    </section>
  )
}

const BASIS_TAG: Record<TdeeEstimate['kind'], string> = {
  unavailable: 'Not enough data',
  formula: 'Population formula',
  provisional: 'Range only',
  measured: 'Measured from your data',
}

function Body({ estimate }: { estimate: TdeeEstimate }) {
  switch (estimate.kind) {
    case 'unavailable':
      return (
        <p className="text-sm text-[var(--text-muted)]" data-testid="tdee-value">
          No number yet.{' '}
          {estimate.daysNeeded > 0
            ? `About ${estimate.daysNeeded} more ${estimate.daysNeeded === 1 ? 'day' : 'days'} of logging both food and weight, or fill in your height, age and activity in Setup for the formula in the meantime.`
            : 'Fill in your height, age and activity in Setup for the formula in the meantime.'}
        </p>
      )

    case 'provisional':
      // No `estimate.kcal` exists on this variant. The range IS the answer.
      return (
        <div className="flex flex-col gap-2" data-testid="tdee-value">
          <Stat
            label="Somewhere between"
            value={`${kcalText(estimate.lowKcal)}–${kcalText(estimate.highKcal)}`}
            unit="kcal/day"
          />
          <p className="text-sm text-[var(--text-muted)]">
            Not a single number, because the logging is too thin to support one. The range narrows
            as the gaps fill in.
          </p>
        </div>
      )

    case 'formula':
    case 'measured':
      return (
        <div className="flex flex-col gap-2" data-testid="tdee-value">
          <Stat label="Around" value={kcalText(estimate.kcal)} unit="kcal/day" />
          <p className="readout text-[var(--text-muted)]">
            {kcalText(estimate.lowKcal)}–{kcalText(estimate.highKcal)} kcal/day
          </p>
        </div>
      )
  }
}

/**
 * How much of the window was actually logged.
 *
 * Shown for every variant, because coverage is the thing that decides which
 * variant you got — hiding it would leave "range only" looking like a quirk of
 * the app rather than a consequence of nine blank days.
 */
function Coverage({ estimate }: { estimate: TdeeEstimate }) {
  return (
    <div className="flex flex-col gap-2">
      <Meter
        label="Days of the window with both food and weight logged"
        value={estimate.coverage * 100}
        showValue
      />
      <p className="hint">
        {estimate.daysOfIntake} of {estimate.windowDays} days logged food, {estimate.daysOfWeight}{' '}
        logged a weight. Measuring needs 14 of each; a single number rather than a range needs 70%
        of the window.
      </p>
    </div>
  )
}
