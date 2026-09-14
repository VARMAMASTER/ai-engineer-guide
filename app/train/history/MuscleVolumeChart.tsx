import { muscleGroupSchema, type MuscleGroup } from '@/lib/train/types'
import { MUSCLE_LABELS } from '../labels'

/**
 * The lower bound most commonly cited for hypertrophy: roughly ten hard sets
 * per muscle group per week. Deliberately drawn as a reference line rather than
 * used to colour the bars — a bar that turns red at nine sets states a
 * threshold as a verdict, and the evidence behind the number is a range, not a
 * line in the sand.
 */
const REFERENCE_SETS = 10

export interface MuscleVolumeChartProps {
  counts: Record<MuscleGroup, number>
  weekStart: string
}

/**
 * Weekly sets per muscle group — the number that actually drives hypertrophy.
 *
 * Horizontal bars, because the categories are ten named things of varying name
 * length and this is a magnitude comparison. ONE series, so one colour for
 * every bar and no legend: colouring each bar by its own value would
 * double-encode the length as hue and spend the only free channel on
 * information the chart already carries.
 *
 * Every value is also text beside its bar, so nothing here is readable only by
 * eye, only in colour, or only on hover — which is also what makes it survive a
 * screen reader, a greyscale print and `forced-colors`.
 *
 * Server-rendered markup, no chart library, no client JavaScript: it is a row
 * of divs whose widths are percentages.
 */
export default function MuscleVolumeChart({ counts, weekStart }: MuscleVolumeChartProps) {
  const groups = muscleGroupSchema.options
  const max = Math.max(REFERENCE_SETS + 2, ...groups.map((group) => counts[group]))
  const referenceLeft = (REFERENCE_SETS / max) * 100

  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="train-muscle-volume">
      <figcaption className="flex min-w-0 flex-col gap-1">
        <h2 className="eyebrow">Sets per muscle group</h2>
        <p className="hint">
          Week beginning {weekStart}. The hairline sits at {REFERENCE_SETS} sets, the usual lower
          bound for growth — a reference, not a pass mark.
        </p>
      </figcaption>

      <ul className="flex flex-col gap-2">
        {groups.map((group) => {
          const value = counts[group]
          const width = max === 0 ? 0 : (value / max) * 100
          return (
            <li key={group} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2">
              <span className="truncate text-sm text-[var(--text-muted)]">{MUSCLE_LABELS[group]}</span>
              <span className="relative block h-2.5 rounded-[var(--radius-pill)] bg-[var(--track)]">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px] bg-[var(--accent)]"
                  style={{ width: `${width}%` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-y-[-3px] w-px bg-[var(--text-faint)]"
                  style={{ left: `${referenceLeft}%` }}
                />
              </span>
              <span className="readout text-right text-sm tabular-nums">{value}</span>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
