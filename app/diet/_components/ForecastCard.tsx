'use client'

import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import type { ForecastScorecard, WeightForecast } from '@/lib/diet/forecast'
import { kcalText, kgText, dayLabel, signedKg } from '../_lib/format'

/**
 * The forecast, and the forecast's own report card.
 *
 * "A forecast that is never checked is decoration" (spec 5.1.2), so the graded
 * half is not an optional extra below the fold — it is the second half of this
 * card, and it reports the unflattering numbers: mean absolute error in
 * kilograms, and how many kept forecasts could not be scored at all. An
 * unscored forecast is counted as unscored rather than dropped, because
 * silently grading only the weeks somebody happened to weigh in would flatter
 * the model exactly when the data was worst.
 *
 * Confidence propagates. A forecast built on a provisional TDEE has no `kg`
 * field — the same rule as the TDEE it came from — so the `range` branch below
 * renders a band and says why, and there is nothing to cast around.
 */
export interface ForecastCardProps {
  forecast: WeightForecast
  scorecard: ForecastScorecard
  /** The intake the projection assumes, and where that number came from. */
  intakeKcal: number | null
  intakeBasis: string
}

export default function ForecastCard({
  forecast,
  scorecard,
  intakeKcal,
  intakeBasis,
}: ForecastCardProps) {
  return (
    <section className="panel flex flex-col gap-4 p-4" aria-labelledby="forecast-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="forecast-heading" className="eyebrow">
          Where this is heading
        </h2>
        {forecast.kind !== 'unavailable' ? (
          <Tag variant="outline">
            {forecast.basis === 'measured' ? 'From your measured spend' : 'From the formula'}
          </Tag>
        ) : null}
      </div>

      {forecast.kind === 'unavailable' ? (
        <p className="text-sm text-[var(--text-muted)]" data-testid="forecast-value">
          {forecast.reason}
        </p>
      ) : forecast.kind === 'range' ? (
        <div className="flex flex-col gap-2" data-testid="forecast-value">
          <Stat
            label={`By ${dayLabel(forecast.forDate)}`}
            value={`${kgText(forecast.lowKg)}–${kgText(forecast.highKg)}`}
            unit="kg"
          />
          <p className="text-sm text-[var(--text-muted)]">{forecast.warning}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2" data-testid="forecast-value">
          <Stat
            label={`By ${dayLabel(forecast.forDate)}`}
            value={kgText(forecast.kg)}
            unit="kg"
          />
          <p className="readout text-[var(--text-muted)]">
            {kgText(forecast.lowKg)}–{kgText(forecast.highKg)} kg · {signedKg(
              forecast.kg - forecast.startKg,
            )}{' '}
            kg in {forecast.horizonDays} days
          </p>
        </div>
      )}

      {forecast.kind !== 'unavailable' ? (
        <p className="hint">
          Assuming {intakeKcal === null ? 'your current intake' : `${kcalText(intakeKcal)} kcal a day`}{' '}
          ({intakeBasis}), a daily balance of {kcalText(forecast.dailyBalanceKcal)} kcal, and
          7,700 kcal per kilogram. Straight-line on purpose: expenditure does drift as weight
          changes, but a curve over a few weeks implies a precision that is not there.
        </p>
      ) : null}

      <Scorecard scorecard={scorecard} />
    </section>
  )
}

function Scorecard({ scorecard }: { scorecard: ForecastScorecard }) {
  const latest = scorecard.scored[scorecard.scored.length - 1]

  if (!latest && scorecard.unscored === 0) {
    return (
      <p className="hint" data-testid="forecast-scorecard">
        Nothing to grade yet. Today&rsquo;s forecast is kept, and the next time its date comes
        round it gets checked against what actually happened rather than quietly redrawn.
      </p>
    )
  }

  return (
    <div className="surface-solid flex flex-col gap-2 rounded-[var(--radius-sm)] p-3" data-testid="forecast-scorecard">
      <p className="eyebrow">Last forecast, graded</p>
      {latest ? (
        <>
          <p className="text-sm text-[var(--text)]">
            Made on {dayLabel(latest.madeOn)} for {dayLabel(latest.forDate)}:{' '}
            {latest.predictedKg === null
              ? `${kgText(latest.lowKg)}–${kgText(latest.highKg)} kg`
              : `${kgText(latest.predictedKg)} kg`}
            . The trend arrived at {kgText(latest.actualKg)} kg —{' '}
            {latest.withinRange
              ? 'inside the band it gave.'
              : `${latest.verdict === 'heavier' ? 'heavier' : 'lighter'} than the band it gave.`}
          </p>
          <p className="readout text-[var(--text-muted)]">
            {scorecard.meanAbsErrorKg === null
              ? 'No point forecast has been scored yet'
              : `Mean error ${scorecard.meanAbsErrorKg.toFixed(2)} kg`}
            {scorecard.withinRangeShare === null
              ? ''
              : ` · ${Math.round(scorecard.withinRangeShare * 100)}% landed inside the band`}
            {scorecard.unscored > 0 ? ` · ${scorecard.unscored} could not be scored` : ''}
          </p>
        </>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          {scorecard.unscored} kept {scorecard.unscored === 1 ? 'forecast' : 'forecasts'} could not
          be graded — there is no weight reading near the date they were made for. That is counted
          as unscored, not as a pass.
        </p>
      )}
    </div>
  )
}
