'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import NumberInput from '@/components/ui/NumberInput'
import Select from '@/components/ui/Select'
import Switch from '@/components/ui/Switch'
import Tag from '@/components/ui/Tag'
import { useToast } from '@/components/ui/Toast'
import { ACTIVITY_MULTIPLIERS, type FoodItem } from '@/lib/diet/types'
import type { DietProfileRow } from '@/lib/diet/data'
import { newId, removeFood, saveProfile, upsertFood } from '../_data/mutations'
import { kcalText } from '../_lib/format'

/**
 * Setup: the inputs every other screen reads, and the library that makes
 * logging a tap.
 *
 * Nothing here is required to start logging, and that is deliberate — a
 * tracker that opens on a form asking for your body fat percentage gets closed.
 * A blank profile means the analytics say "not enough to say" rather than
 * guessing; a blank target means the Log screen shows counts instead of a
 * score. Both are honest states, and both are reachable from an empty account.
 *
 * Weight is NOT on this form. It is recorded on the Weight screen, repeatedly,
 * with a trend over it — a second copy here would go stale the first time
 * somebody weighed themselves without revisiting their settings, and the
 * formula would then be run on last month's body.
 */

export interface SetupClientProps {
  userId: string
  profile: DietProfileRow | null
  foods: FoodItem[]
}

const ACTIVITY_LABELS: Record<keyof typeof ACTIVITY_MULTIPLIERS, string> = {
  sedentary: 'Sedentary — desk job, little exercise',
  light: 'Light — 1 to 3 sessions a week',
  moderate: 'Moderate — 3 to 5 sessions a week',
  active: 'Active — 6 or 7 sessions a week',
  'very-active': 'Very active — twice a day, or physical work',
}

const GOAL_LABELS = {
  lose: 'Lose weight',
  maintain: 'Maintain',
  gain: 'Gain weight',
} as const

function numberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default function SetupClient({ userId, profile, foods: initialFoods }: SetupClientProps) {
  const toast = useToast()

  const [sex, setSex] = useState(profile?.sex ?? '')
  const [age, setAge] = useState<number | null>(numberOrNull(profile?.age_years))
  const [height, setHeight] = useState<number | null>(numberOrNull(profile?.height_cm))
  const [activity, setActivity] = useState(profile?.activity ?? '')
  const [goal, setGoal] = useState(profile?.goal ?? '')
  const [targetKcal, setTargetKcal] = useState<number | null>(numberOrNull(profile?.target_kcal))
  const [targetProtein, setTargetProtein] = useState<number | null>(
    numberOrNull(profile?.target_protein_g),
  )
  const [band, setBand] = useState<number | null>(numberOrNull(profile?.kcal_band) ?? 150)
  const [windowStart, setWindowStart] = useState(profile?.window_start ?? '12:00')
  const [windowEnd, setWindowEnd] = useState(profile?.window_end ?? '18:00')
  const [windowEnabled, setWindowEnabled] = useState(profile?.window_enabled ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [foods, setFoods] = useState<FoodItem[]>(initialFoods)
  const [foodName, setFoodName] = useState('')
  const [foodServing, setFoodServing] = useState('1 serving')
  const [foodKcal, setFoodKcal] = useState<number | null>(null)
  const [foodProtein, setFoodProtein] = useState<number | null>(null)
  const [addingFood, setAddingFood] = useState(false)

  // Targets are all-or-nothing: a calorie target with no protein target would
  // read as a protein target of zero, which every logged day then "meets".
  const targetsPartial =
    (targetKcal === null) !== (targetProtein === null)

  async function save() {
    if (saving) return
    setSaving(true)
    setError(null)
    const { error: message } = await saveProfile(userId, {
      sex: sex === '' ? null : sex,
      age_years: age,
      height_cm: height,
      activity: activity === '' ? null : activity,
      goal: goal === '' ? null : goal,
      target_kcal: targetsPartial ? null : targetKcal,
      target_protein_g: targetsPartial ? null : targetProtein,
      kcal_band: band ?? 150,
      window_start: windowStart,
      window_end: windowEnd,
      window_enabled: windowEnabled,
    })
    setSaving(false)
    if (message) {
      setError(message)
      return
    }
    toast.show({ message: 'Saved.', tone: 'success' })
  }

  async function addFood() {
    if (!foodName.trim() || foodKcal === null || addingFood) return
    setAddingFood(true)
    const food: FoodItem = {
      id: newId(),
      name: foodName.trim(),
      servingLabel: foodServing.trim() || '1 serving',
      kcalPerServing: foodKcal,
      proteinGPerServing: foodProtein ?? 0,
      source: 'custom',
    }
    const { error: message } = await upsertFood(userId, food)
    setAddingFood(false)
    if (message) {
      toast.show({ message: `Could not save: ${message}`, tone: 'error' })
      return
    }
    setFoods((current) => [food, ...current])
    setFoodName('')
    setFoodServing('1 serving')
    setFoodKcal(null)
    setFoodProtein(null)
    toast.show({ message: `${food.name} added to your library.`, tone: 'success' })
  }

  async function deleteFood(food: FoodItem) {
    const snapshot = foods
    setFoods((current) => current.filter((f) => f.id !== food.id))
    const { error: message } = await removeFood(userId, food.id)
    if (message) {
      setFoods(snapshot)
      toast.show({ message: `Could not delete: ${message}`, tone: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="panel flex flex-col gap-4 p-4" aria-labelledby="body-heading">
        <div className="flex flex-col gap-1">
          <h2 id="body-heading" className="eyebrow">
            You
          </h2>
          <p className="hint">
            Mifflin-St Jeor takes these four. It is a population regression carrying about ±15% for
            an individual, which is why it is replaced by a measurement as soon as there are two
            weeks of food and weight to solve one from. Leave any of it blank and the analytics say
            so rather than guessing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Sex" hint="The term the equation takes. There is no validated form without one.">
            <Select value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">Not set</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </Select>
          </Field>
          <Field label="Age (years)">
            <NumberInput value={age} onChange={setAge} placeholder="29" />
          </Field>
          <Field label="Height (cm)">
            <NumberInput value={height} onChange={setHeight} placeholder="174" />
          </Field>
          <Field label="Goal">
            <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">Not set</option>
              {(Object.keys(GOAL_LABELS) as (keyof typeof GOAL_LABELS)[]).map((key) => (
                <option key={key} value={key}>
                  {GOAL_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            className="md:col-span-2"
            label="Activity"
            hint="Only used until a measured expenditure takes over."
          >
            <Select value={activity} onChange={(e) => setActivity(e.target.value)}>
              <option value="">Not set</option>
              {(Object.keys(ACTIVITY_LABELS) as (keyof typeof ACTIVITY_LABELS)[]).map((key) => (
                <option key={key} value={key}>
                  {ACTIVITY_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="hint">
          Your weight is not asked for here — it lives on the Weight screen, where it has a trend
          through it. A copy here would be out of date by the next weigh-in.
        </p>
      </section>

      <section className="panel flex flex-col gap-4 p-4" aria-labelledby="targets-heading">
        <div className="flex flex-col gap-1">
          <h2 id="targets-heading" className="eyebrow">
            Targets
          </h2>
          <p className="hint">
            The band is two-sided on purpose: a day 900 kcal under target is a miss too, and a
            one-sided band would score it as a success.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Calories a day">
            <NumberInput value={targetKcal} onChange={setTargetKcal} placeholder="2050" />
          </Field>
          <Field label="Protein a day (g)">
            <NumberInput value={targetProtein} onChange={setTargetProtein} placeholder="140" />
          </Field>
          <Field label="Band either side (kcal)">
            <NumberInput value={band} onChange={setBand} placeholder="150" />
          </Field>
        </div>
        {targetsPartial ? (
          <p className="field-error" role="alert">
            Set both a calorie and a protein target, or neither. Half a pair would be stored as a
            protein target of zero, which every day you log would then “meet”.
          </p>
        ) : null}
      </section>

      <section className="panel flex flex-col gap-4 p-4" aria-labelledby="window-setup-heading">
        <div className="flex flex-col gap-1">
          <h2 id="window-setup-heading" className="eyebrow">
            Eating window
          </h2>
          <p className="hint">
            Entries outside it are marked, never blocked. A window whose start is later than its
            end is fine — 20:00 to 04:00 crosses midnight and is handled as such.
          </p>
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-sm font-medium text-[var(--text)]">Mark entries against a window</span>
          <Switch checked={windowEnabled} onCheckedChange={setWindowEnabled} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens">
            <Input
              type="time"
              value={windowStart}
              disabled={!windowEnabled}
              onChange={(e) => setWindowStart(e.target.value)}
            />
          </Field>
          <Field label="Closes">
            <Input
              type="time"
              value={windowEnd}
              disabled={!windowEnabled}
              onChange={(e) => setWindowEnd(e.target.value)}
            />
          </Field>
        </div>
        {!windowEnabled ? (
          <p className="hint">
            Switched off, nothing is marked at all — which is not the same as everything being
            inside. Window adherence simply stops being reported.
          </p>
        ) : null}
      </section>

      <div className="flex items-center gap-3">
        <Button variant="accent" onClick={save} loading={saving} data-testid="save-setup">
          Save
        </Button>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="library-heading">
        <div className="flex flex-col gap-1">
          <h2 id="library-heading" className="eyebrow">
            Your food library
          </h2>
          <p className="hint">
            Per-serving numbers. Editing one of these does not rewrite meals you have already
            logged — those keep the numbers they were logged with, so a correction here cannot
            silently rewrite the history a measured expenditure was solved from.
          </p>
        </div>

        <div className="panel flex flex-col gap-3 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Food">
              <Input
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="Dal (one bowl)"
                autoComplete="off"
              />
            </Field>
            <Field label="Serving">
              <Input
                value={foodServing}
                onChange={(e) => setFoodServing(e.target.value)}
                placeholder="1 bowl"
                autoComplete="off"
              />
            </Field>
            <Field label="kcal per serving">
              <NumberInput value={foodKcal} onChange={setFoodKcal} placeholder="180" />
            </Field>
            <Field label="Protein per serving (g)">
              <NumberInput value={foodProtein} onChange={setFoodProtein} placeholder="9" />
            </Field>
          </div>
          <div>
            <Button
              onClick={addFood}
              loading={addingFood}
              disabled={!foodName.trim() || foodKcal === null}
              data-testid="add-food"
            >
              Add to library
            </Button>
          </div>
        </div>

        {foods.length === 0 ? (
          <div className="panel p-4">
            <EmptyState
              title="Nothing in the library yet."
              description="Anything you log with “Keep in my library” switched on lands here, and turns into a one-tap chip on the Log screen."
              action={<span className="hint">Add the five things you eat most and you are done.</span>}
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="food-library">
            {foods.map((food) => (
              <li key={food.id} className="panel flex items-center gap-3 p-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-[var(--text)]">{food.name}</span>
                  <span className="hint">
                    {kcalText(food.kcalPerServing)} kcal · {Math.round(food.proteinGPerServing)} g
                    protein · {food.servingLabel}
                  </span>
                </span>
                {food.source === 'openfoodfacts' ? (
                  <Tag variant="outline" className="shrink-0">
                    Open Food Facts
                  </Tag>
                ) : null}
                <Button onClick={() => void deleteFood(food)} aria-label={`Remove ${food.name}`}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
