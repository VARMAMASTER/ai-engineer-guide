'use client'

import { useId, useState } from 'react'
import Button from '@/components/ui/Button'
import Divider from '@/components/ui/Divider'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import NumberInput from '@/components/ui/NumberInput'
import Sheet from '@/components/ui/Sheet'
import Switch from '@/components/ui/Switch'
import Tag from '@/components/ui/Tag'
import { isTimeInWindow } from '@/lib/diet/window'
import type { EatingWindow, FoodItem } from '@/lib/diet/types'
import { kcalText } from '../_lib/format'

/**
 * Adding one entry by hand — the fallback path, and the one that has to be
 * complete.
 *
 * Two decisions here are about friction rather than features.
 *
 * **Energy is asked for PER SERVING, with a live total underneath.** "Calories"
 * on a form with a servings box is ambiguous, and the ambiguity is expensive in
 * both directions: two servings of a 420-kcal total logs 840, and half a
 * serving of a 420-kcal serving logs 210. The running total says which reading
 * the form took before the entry is saved, so there is nothing to discover
 * later from a day that reads 4,000 kcal.
 *
 * **The window is shown, not enforced.** Typing a time outside the eating
 * window marks the entry — right here, before saving, as a fact — and the
 * button still says "Log it". A tracker that refuses the entry gets a fake
 * time typed into it, and a tracker that scolds gets deleted.
 */

export interface EntryDraft {
  name: string
  servingLabel: string
  servings: number
  kcalPerServing: number
  proteinPerServing: number
  /** Local `YYYY-MM-DDTHH:MM`. */
  at: string
  saveToLibrary: boolean
  /** Set when the draft came from the library or a lookup. */
  foodId?: string
}

export interface AddEntrySheetProps {
  open: boolean
  onClose: () => void
  /** The day being logged into — not necessarily today. */
  date: string
  /** Wall-clock `HH:MM` the time field starts on. */
  defaultTime: string
  window: EatingWindow
  library: FoodItem[]
  onSubmit: (draft: EntryDraft) => Promise<string | null>
}

interface SearchState {
  status: 'idle' | 'searching' | 'done'
  foods: FoodItem[]
  error: string | null
}

const EMPTY_SEARCH: SearchState = { status: 'idle', foods: [], error: null }

export default function AddEntrySheet({
  open,
  onClose,
  date,
  defaultTime,
  window: eatingWindow,
  library,
  onSubmit,
}: AddEntrySheetProps) {
  const resultsId = useId()
  // Every field starts from its initial value and STAYS until the component is
  // remounted. There is no "reset when reopened" effect: the parent gives this
  // component a fresh `key` each time it opens the sheet, so React discards the
  // old instance and these initialisers run again. That is one line in the
  // parent instead of ten `setX(...)` calls in an effect, and it cannot blank a
  // half-typed entry when some unrelated prop happens to change.
  const [name, setName] = useState('')
  const [servingLabel, setServingLabel] = useState('1 serving')
  const [servings, setServings] = useState<number | null>(1)
  const [kcal, setKcal] = useState<number | null>(null)
  const [protein, setProtein] = useState<number | null>(null)
  const [time, setTime] = useState(defaultTime)
  const [saveToLibrary, setSaveToLibrary] = useState(true)
  const [foodId, setFoodId] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchState>(EMPTY_SEARCH)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const localMatches =
    query.trim().length >= 2
      ? library
          .filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, 5)
      : []

  const totalKcal = (kcal ?? 0) * (servings ?? 0)
  const totalProtein = (protein ?? 0) * (servings ?? 0)
  const timeValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  const inWindow = timeValid && eatingWindow.enabled ? isTimeInWindow(time, eatingWindow) : null
  const canSubmit =
    name.trim().length > 0 && kcal !== null && kcal >= 0 && servings !== null && servings > 0 && timeValid

  function fillFrom(food: FoodItem) {
    setName(food.name)
    setServingLabel(food.servingLabel)
    setKcal(food.kcalPerServing)
    setProtein(food.proteinGPerServing)
    setServings(1)
    setFoodId(food.source === 'openfoodfacts' ? undefined : food.id)
    setSaveToLibrary(food.source !== 'library')
  }

  async function runSearch() {
    const q = query.trim()
    if (q.length < 2) return
    setSearch({ status: 'searching', foods: [], error: null })
    try {
      const response = await fetch(`/diet/api/foods?q=${encodeURIComponent(q)}`)
      const body = (await response.json()) as { foods?: FoodItem[]; error?: string }
      setSearch({ status: 'done', foods: body.foods ?? [], error: body.error ?? null })
    } catch {
      setSearch({
        status: 'done',
        foods: [],
        error: 'Could not reach the food database. Type the numbers in below instead.',
      })
    }
  }

  async function submit() {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    const message = await onSubmit({
      name: name.trim(),
      servingLabel: servingLabel.trim() || '1 serving',
      servings: servings!,
      kcalPerServing: kcal!,
      proteinPerServing: protein ?? 0,
      at: `${date}T${time}`,
      saveToLibrary,
      foodId,
    })
    setSaving(false)
    if (message) setError(message)
    else onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add an entry"
      description="Per-serving numbers, so the serving count multiplies cleanly."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="readout text-[var(--text-muted)]">
            {kcalText(totalKcal)} kcal · {Math.round(totalProtein)} g protein
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="accent" onClick={submit} disabled={!canSubmit} loading={saving}>
              Log it
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3" aria-labelledby={`${resultsId}-heading`}>
          <div className="flex flex-col gap-1">
            <p id={`${resultsId}-heading`} className="eyebrow">
              Find a packaged food
            </p>
            <p className="hint">
              Open Food Facts, no account and no key. It knows packets; it does not know your dal,
              so type that one in below and keep it.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void runSearch()
                }
              }}
              placeholder="Peanut butter"
              aria-label="Search packaged foods"
            />
            <Button
              onClick={runSearch}
              disabled={query.trim().length < 2}
              loading={search.status === 'searching'}
              className="shrink-0"
            >
              Search
            </Button>
          </div>

          {localMatches.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {localMatches.map((food) => (
                <li key={`lib-${food.id}`}>
                  <ResultRow food={food} badge="Your library" onPick={() => fillFrom(food)} />
                </li>
              ))}
            </ul>
          ) : null}

          {search.error ? <p className="hint text-[var(--warning)]">{search.error}</p> : null}
          {search.status === 'done' && search.foods.length === 0 && !search.error ? (
            <p className="hint">
              Nothing matched. Type it in below — an entry you keep is worth more than a search
              result you do not.
            </p>
          ) : null}
          {search.foods.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {search.foods.map((food) => (
                <li key={food.id}>
                  <ResultRow food={food} badge="Open Food Facts" onPick={() => fillFrom(food)} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <Divider />

        <div className="flex flex-col gap-4">
          <Field label="What did you eat?">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dal and two rotis"
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Serving" hint="How much one serving is.">
              <Input
                value={servingLabel}
                onChange={(e) => setServingLabel(e.target.value)}
                placeholder="1 bowl"
                autoComplete="off"
              />
            </Field>
            <Field label="Servings">
              <NumberInput value={servings} onChange={setServings} placeholder="1" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="kcal per serving">
              <NumberInput value={kcal} onChange={setKcal} placeholder="420" />
            </Field>
            <Field label="Protein per serving (g)">
              <NumberInput value={protein} onChange={setProtein} placeholder="18" />
            </Field>
          </div>

          <Field
            label="Time of the meal"
            hint="The meal's time, not the time you are typing. Back-dating lunch at 23:00 should say 13:00."
          >
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>

          {inWindow === false ? (
            <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Tag variant="outline">Outside window</Tag>
              <span>
                That is outside {eatingWindow.start}–{eatingWindow.end}. It will be marked, and
                logged exactly as you entered it.
              </span>
            </p>
          ) : null}

          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-sm font-medium text-[var(--text)]">Keep in my library</span>
              <span className="hint">So next time it is one tap.</span>
            </span>
            <Switch checked={saveToLibrary} onCheckedChange={setSaveToLibrary} />
          </label>

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Sheet>
  )
}

function ResultRow({
  food,
  badge,
  onPick,
}: {
  food: FoodItem
  badge: string
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="surface-solid flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left"
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-[var(--text)]">{food.name}</span>
        <span className="hint">
          {kcalText(food.kcalPerServing)} kcal · {Math.round(food.proteinGPerServing)} g ·{' '}
          {food.servingLabel}
        </span>
      </span>
      <Tag variant="outline" className="shrink-0">
        {badge}
      </Tag>
    </button>
  )
}
