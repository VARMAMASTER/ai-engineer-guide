'use client'

import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Tag from '@/components/ui/Tag'
import type { TrainingSuggestion } from '@/lib/train/progression'
import type { Exercise, LoggedSet } from '@/lib/train/types'
import { EQUIPMENT_LABELS, formatLoad } from '../labels'
import Stepper from './Stepper'

/** The RPE values worth offering. Below 6 nobody logs, and 10 is the ceiling. */
const RPE_CHOICES = [6, 7, 8, 9, 10]

export interface SetDraft {
  reps: number
  load: number
  rpe: number | null
}

export interface ExerciseLoggerProps {
  exercise: Exercise
  /** Today's sets for this exercise, in the order they were logged, with row ids. */
  todaySets: { set: LoggedSet; id: string }[]
  /** What to do today — computed from sessions BEFORE today. */
  target: TrainingSuggestion
  /** What today's work implies for next time. Null until something is logged today. */
  nextTime: TrainingSuggestion | null
  draft: SetDraft
  onDraft: (patch: Partial<SetDraft>) => void
  onLog: () => void
  onRemove: (setId: string) => void
  busy: boolean
}

function suggestionLine(suggestion: TrainingSuggestion): string {
  if (suggestion.kind === 'insufficient_data') return suggestion.message
  return `${suggestion.suggestedReps} reps at ${formatLoad(suggestion.suggestedLoad)}`
}

/**
 * One exercise: what it is, what to do, what you have done, and one button.
 *
 * The suggestion is shown TWICE on purpose once there is work in today's
 * session, and the two are different questions. "Today" is computed from
 * sessions before today — it is the target you walked in with, and it must not
 * move underneath you as you log against it. "Next time" is recomputed
 * including today, so the consequence of the set you just logged is visible
 * immediately rather than at some unobserved midnight. Progressive overload is
 * the entire point of the app; a rule you cannot watch working is a rule you do
 * not trust.
 */
export default function ExerciseLogger({
  exercise,
  todaySets,
  target,
  nextTime,
  draft,
  onDraft,
  onLog,
  onRemove,
  busy,
}: ExerciseLoggerProps) {
  return (
    <li className="panel flex min-w-0 flex-col gap-4 p-4" data-testid={`train-exercise-${exercise.id}`}>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-[family-name:var(--font-display)] text-base">{exercise.name}</h3>
          <Tag variant="outline">{EQUIPMENT_LABELS[exercise.equipment]}</Tag>
          {target.kind === 'deload' ? <Tag variant="accent">Deload</Tag> : null}
        </div>

        <p className="text-sm">
          <span className="text-[var(--text-muted)]">Today: </span>
          <span className="readout" data-testid={`train-target-${exercise.id}`}>
            {suggestionLine(target)}
          </span>
        </p>
        {target.kind !== 'insufficient_data' ? <p className="hint">{target.rationale}</p> : null}
        {nextTime && nextTime.kind !== 'insufficient_data' ? (
          <p className="hint" data-testid={`train-next-${exercise.id}`}>
            Next time, on what you have logged today: {suggestionLine(nextTime)}
          </p>
        ) : null}
      </div>

      {todaySets.length > 0 ? (
        <ul className="flex flex-wrap gap-2" data-testid={`train-sets-${exercise.id}`}>
          {todaySets.map((entry, index) => (
            <li key={entry.id} className="flex items-center">
              <Tag variant="outline" className="readout">
                {entry.set.reps} &times; {formatLoad(entry.set.load)}
                {entry.set.rpe ? ` @${entry.set.rpe}` : ''}
              </Tag>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                disabled={busy}
                className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-faint)] hover:text-[var(--danger)] disabled:opacity-40"
                aria-label={`Remove set ${index + 1}: ${entry.set.reps} reps at ${formatLoad(entry.set.load)}`}
                data-testid={`train-remove-${exercise.id}-${index}`}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Stepper
          label="Reps"
          value={draft.reps}
          step={1}
          min={1}
          max={100}
          onChange={(reps) => onDraft({ reps })}
          testId={`train-reps-${exercise.id}`}
        />
        <Stepper
          label="Load"
          value={draft.load}
          step={2.5}
          min={0}
          max={500}
          unit="kg"
          onChange={(load) => onDraft({ load })}
          testId={`train-load-${exercise.id}`}
        />
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="eyebrow mb-2">RPE — optional</legend>
        <div className="flex flex-wrap gap-2">
          <Chip
            pressed={draft.rpe === null}
            onClick={() => onDraft({ rpe: null })}
            className="min-w-14 justify-center"
            aria-label="No RPE"
          >
            &mdash;
          </Chip>
          {RPE_CHOICES.map((rpe) => (
            <Chip
              key={rpe}
              pressed={draft.rpe === rpe}
              onClick={() => onDraft({ rpe })}
              className="min-w-14 justify-center"
              data-testid={`train-rpe-${exercise.id}-${rpe}`}
            >
              {rpe}
            </Chip>
          ))}
        </div>
      </fieldset>

      <Button
        variant="accent"
        onClick={onLog}
        disabled={busy}
        className="h-16 w-full text-base"
        data-testid={`train-log-${exercise.id}`}
      >
        Log {draft.reps} &times; {formatLoad(draft.load)}
      </Button>
    </li>
  )
}
