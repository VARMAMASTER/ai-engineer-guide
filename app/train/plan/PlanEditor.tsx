'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Field from '@/components/ui/Field'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import { createClient } from '@/lib/db/client'
import { exerciseById } from '@/lib/train/exercises'
import { generatePlan } from '@/lib/train/plan'
import { saveProfileAndPlan } from '@/lib/train/data'
import {
  equipmentSchema,
  experienceLevelSchema,
  goalSchema,
  injurySchema,
  RESTRICTED_PATTERNS,
  type Equipment,
  type ExperienceLevel,
  type Goal,
  type Injury,
  type MovementPattern,
  type Plan,
  type TrainingProfile,
} from '@/lib/train/types'
import {
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  INJURY_LABELS,
  PATTERN_LABELS,
  SPLIT_LABELS,
} from '../labels'

/** The day counts the picker offers. */
const DAY_CHOICES = [1, 2, 3, 4, 5, 6, 7]

const DEFAULT_PROFILE: TrainingProfile = {
  goal: 'hypertrophy',
  experience: 'beginner',
  availableDays: 3,
  equipment: ['bodyweight'],
  injuries: [],
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

export interface PlanEditorProps {
  userId: string
  initialProfile: TrainingProfile | null
  initialPlan: Plan | null
  hasSessions: boolean
}

/**
 * The plan form, with a LIVE preview rather than a Generate button.
 *
 * `generatePlan` is pure, synchronous and instant, so making the user press a
 * button to see the consequence of a tick is a round trip for nothing. Every
 * change re-plans; Save is the only thing that writes. That also makes the
 * injury rule legible — tick "Shoulder" and the overhead press leaves the
 * preview in front of you, which is a far better explanation than a sentence
 * about movement patterns.
 *
 * `plan.notes` is rendered first, above the days. The generator never throws on
 * an over-constrained profile — it returns a short plan and says why in the
 * notes — so a UI that hides them turns a deliberate, explained gap into a
 * silently wrong plan.
 */
export default function PlanEditor({ userId, initialProfile, initialPlan, hasSessions }: PlanEditorProps) {
  const [profile, setProfile] = useState<TrainingProfile>(initialProfile ?? DEFAULT_PROFILE)
  const [savedPlan, setSavedPlan] = useState<Plan | null>(initialPlan)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const plan = useMemo(() => generatePlan(profile), [profile])

  const excluded = useMemo(() => {
    const out = new Set<MovementPattern>()
    for (const injury of profile.injuries) {
      for (const pattern of RESTRICTED_PATTERNS[injury]) out.add(pattern)
    }
    return [...out]
  }, [profile.injuries])

  const dirty = JSON.stringify(savedPlan) !== JSON.stringify(plan)

  function update(patch: Partial<TrainingProfile>) {
    setProfile((current) => ({ ...current, ...patch }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveProfileAndPlan(createClient(), userId, profile, plan)
      setSavedPlan(plan)
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the plan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="panel flex flex-col gap-5 p-4" aria-labelledby="train-plan-inputs">
        <h2 id="train-plan-inputs" className="eyebrow">
          Your constraints
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Goal">
            <Select
              value={profile.goal}
              onChange={(event) => update({ goal: event.target.value as Goal })}
              data-testid="train-goal"
            >
              {goalSchema.options.map((goal) => (
                <option key={goal} value={goal}>
                  {GOAL_LABELS[goal]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Experience" hint="Recorded with the plan; the generator keeps the split honest either way.">
            <Select
              value={profile.experience}
              onChange={(event) => update({ experience: event.target.value as ExperienceLevel })}
              data-testid="train-experience"
            >
              {experienceLevelSchema.options.map((level) => (
                <option key={level} value={level}>
                  {EXPERIENCE_LABELS[level]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="eyebrow mb-2">Days a week</legend>
          <div className="flex flex-wrap gap-2">
            {DAY_CHOICES.map((days) => (
              <Chip
                key={days}
                pressed={profile.availableDays === days}
                onClick={() => update({ availableDays: days })}
                className="min-w-14 justify-center"
                data-testid={`train-days-${days}`}
              >
                {days}
              </Chip>
            ))}
          </div>
          <p className="hint">Anything outside 2–6 is clamped, and the plan says so in its notes.</p>
        </fieldset>

        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="eyebrow mb-2">Equipment</legend>
          <div className="flex flex-wrap gap-2">
            {equipmentSchema.options.map((item) => (
              <Chip
                key={item}
                pressed={profile.equipment.includes(item)}
                onClick={() => update({ equipment: toggle(profile.equipment, item) as Equipment[] })}
                data-testid={`train-equipment-${item}`}
              >
                {EQUIPMENT_LABELS[item]}
              </Chip>
            ))}
          </div>
          <p className="hint">
            Tick nothing and the plan is built from bodyweight alone — you always have that, so it is
            a real week rather than an error.
          </p>
        </fieldset>

        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="eyebrow mb-2">Injuries to work around</legend>
          <div className="flex flex-wrap gap-2">
            {injurySchema.options.map((item) => (
              <Chip
                key={item}
                pressed={profile.injuries.includes(item)}
                onClick={() => update({ injuries: toggle(profile.injuries, item) as Injury[] })}
                data-testid={`train-injury-${item}`}
              >
                {INJURY_LABELS[item]}
              </Chip>
            ))}
          </div>
          <p className="hint">
            {excluded.length > 0
              ? `Off the table: ${excluded.map((pattern) => PATTERN_LABELS[pattern]).join(', ')}. A whole movement goes, not one named exercise.`
              : 'An injury removes a movement pattern, not a single exercise — a bad shoulder rules out every overhead press.'}
          </p>
        </fieldset>
      </section>

      {plan.notes.length > 0 ? (
        <section
          className="surface-solid flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--panel-border)] p-4"
          aria-labelledby="train-plan-notes"
          data-testid="train-plan-notes"
        >
          <h2 id="train-plan-notes" className="text-base">
            What the generator could not do
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            These are decisions, not errors. The plan is still usable — it is just shorter than the
            template, and this is where it went.
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {plan.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--warning)]">
                  !
                </span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3" aria-labelledby="train-plan-preview">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="train-plan-preview" className="eyebrow">
            The week
          </h2>
          <Tag variant="outline">{SPLIT_LABELS[plan.split]}</Tag>
          <Tag>
            {plan.daysPerWeek} day{plan.daysPerWeek === 1 ? '' : 's'}
          </Tag>
          {dirty ? <Tag variant="accent">Unsaved</Tag> : null}
        </div>

        <ul className="grid gap-3 md:grid-cols-2" data-testid="train-plan-days">
          {plan.days.map((day, index) => (
            <li key={`${day.label}-${index}`} className="panel flex min-w-0 flex-col gap-2 p-4">
              <p className="font-[family-name:var(--font-display)] text-base">{day.label}</p>
              {day.exerciseIds.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Nothing could be selected for this day under the current constraints.
                </p>
              ) : (
                <ol className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                  {day.exerciseIds.map((id) => (
                    <li key={id}>{exerciseById(id)?.name ?? id}</li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={save} loading={saving} disabled={saving} data-testid="train-save-plan">
            {savedPlan ? 'Save this plan' : 'Start with this plan'}
          </Button>
          <p className="text-sm text-[var(--text-muted)]" role="status">
            {saved && !dirty ? 'Saved. The session page is planning from this now.' : null}
          </p>
        </div>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        {hasSessions && dirty ? (
          <p className="hint">
            Saving replaces the plan, not your history. Logged sets stay exactly where they are, and
            every suggestion still reads from them.
          </p>
        ) : null}
      </div>
    </div>
  )
}
