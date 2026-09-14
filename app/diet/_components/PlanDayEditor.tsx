'use client'

import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import NumberInput from '@/components/ui/NumberInput'
import type { WeightBasis } from '@/lib/diet/types'
import {
  type MealSlot,
  type PlanDayScore,
  type ProteinFix,
  type ResolvedDay,
  type ResolvedMeal,
  type ResolvedPlanItem,
} from '@/lib/diet/plan'
import { kcalText } from '../_lib/format'

/**
 * One day of the plan, editable.
 *
 * The quantity field is offered in the unit a person MEASURES in: grams for
 * rice, chicken and curd, a count for eggs and slices of bread. The plan stores
 * servings, so the conversion happens here — a field labelled "servings" next
 * to 250 g of chicken would be asking the user to do the division, and they
 * would get it wrong in the kitchen at 7am, not in a spreadsheet.
 *
 * Every gram field carries its BASIS in the hint beside it. There is no way to
 * edit a quantity on this screen without being told whether the number means
 * dry, raw or cooked, because that is a factor-of-three error that looks
 * entirely plausible on the screen it produces.
 *
 * The protein fixes sit UNDER the day's own numbers rather than in a separate
 * panel, so the shortfall and the thing that closes it are in the same glance.
 * Each one states its calorie cost next to its protein gain: a fix that adds
 * 18 g by adding 175 kcal takes this day out of its calorie band, and trading
 * one silent miss for another is not a fix.
 */

export interface PlanDayEditorProps {
  day: ResolvedDay
  score: PlanDayScore
  proteinFloorG: number
  fixes: ProteinFix[]
  busy: boolean
  /** Which of this day's meals have already been logged to the current date. */
  loggedSlots: Set<MealSlot>
  /** False on any weekday but the one the user is on. */
  canLog: boolean
  onSetServings: (itemId: string, servings: number) => void
  onRemoveItem: (itemId: string) => void
  onApplyFix: (fix: ProteinFix) => void
  onLogMeal: (slot: MealSlot) => void
}

export default function PlanDayEditor({
  day,
  score,
  proteinFloorG,
  fixes,
  busy,
  loggedSlots,
  canLog,
  onSetServings,
  onRemoveItem,
  onApplyFix,
  onLogMeal,
}: PlanDayEditorProps) {
  return (
    <div className="flex flex-col gap-5" data-testid="plan-day-editor" data-day={day.day}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="readout text-[var(--text)]" data-testid="plan-day-kcal">
          {kcalText(day.kcal)} kcal
        </p>
        <p className="readout text-[var(--text)]" data-testid="plan-day-protein">
          {Math.round(day.proteinG)} g protein
        </p>
        <p className="readout text-[var(--text-muted)]">
          {Math.round(day.carbG)} g carbs · {Math.round(day.fatG)} g fat
          {day.macrosComplete ? '' : ' (partial)'}
        </p>
        <p className="readout text-[var(--text-muted)]">
          {kcalText(score.deficitKcal)} kcal deficit
        </p>
      </div>

      {day.meals.map((meal) => (
        <MealBlock
          key={meal.slot}
          meal={meal}
          busy={busy}
          logged={loggedSlots.has(meal.slot)}
          canLog={canLog}
          onSetServings={onSetServings}
          onRemoveItem={onRemoveItem}
          onLogMeal={onLogMeal}
        />
      ))}

      {score.proteinShortfallG !== null ? (
        <section
          className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--track)] p-3"
          aria-labelledby={`fixes-${day.day}`}
          data-testid="plan-day-fixes"
        >
          <div className="flex flex-col gap-1">
            <h4 id={`fixes-${day.day}`} className="eyebrow">
              Closing the {score.proteinShortfallG} g gap
            </h4>
            <p className="hint">
              One tap each. Each one recomputes this day&rsquo;s calories and deficit, so you can
              see what it costs before you keep it.
            </p>
          </div>
          {fixes.length === 0 ? (
            <p className="hint">
              Every suggested addition is already in this day, and it is still{' '}
              {score.proteinShortfallG} g short of {Math.round(proteinFloorG)} g. Closing the rest
              means a change to the plan itself rather than an addition to it.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {fixes.map((fix) => (
                <li key={fix.id} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="quiet"
                      disabled={busy}
                      onClick={() => onApplyFix(fix)}
                      data-testid="plan-fix"
                      data-fix={fix.id}
                    >
                      {fix.label}
                    </Button>
                    <span className="readout text-[var(--positive)]">
                      +{fix.deltaProteinG} g protein
                    </span>
                    <span className="readout text-[var(--text-muted)]">
                      {fix.deltaKcal === 0 ? 'no extra calories' : `+${fix.deltaKcal} kcal`}
                    </span>
                  </div>
                  <p className="hint">{fix.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}

function MealBlock({
  meal,
  busy,
  logged,
  canLog,
  onSetServings,
  onRemoveItem,
  onLogMeal,
}: {
  meal: ResolvedMeal
  busy: boolean
  logged: boolean
  canLog: boolean
  onSetServings: (itemId: string, servings: number) => void
  onRemoveItem: (itemId: string) => void
  onLogMeal: (slot: MealSlot) => void
}) {
  return (
    <section className="flex flex-col gap-2" aria-label={meal.label}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h4 className="eyebrow">{meal.label}</h4>
          <span className="readout text-[var(--text-muted)]">
            {kcalText(meal.kcal)} kcal · {Math.round(meal.proteinG)} g protein
          </span>
        </div>
        {/* Meals tick off one at a time: breakfast happens at 8am and dinner at
            8pm, and a single button for the whole day would mean logging
            dinner before eating it. */}
        <Chip
          onClick={() => onLogMeal(meal.slot)}
          disabled={busy || !canLog || meal.items.length === 0}
          pressed={logged}
          data-testid="plan-log-meal"
          data-slot={meal.slot}
          title={
            canLog
              ? `Log ${meal.label.toLowerCase()} from the plan`
              : 'Only today’s plan can be logged — a past day would need a time for a meal nobody recorded.'
          }
        >
          {logged ? `${meal.label} logged` : `Log ${meal.label.toLowerCase()}`}
        </Chip>
      </div>

      {meal.items.length === 0 ? (
        <p className="hint">Nothing planned for this meal.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {meal.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              busy={busy}
              onSetServings={onSetServings}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

/** The hint under a quantity field — the basis, spelled out. */
function basisHint(basis: WeightBasis | undefined): string {
  switch (basis) {
    case 'dry':
      return 'grams DRY, weighed before cooking'
    case 'raw':
      return 'grams RAW, weighed before cooking'
    case 'cooked':
      return 'grams COOKED, weighed after cooking'
    default:
      return 'grams as served'
  }
}

function ItemRow({
  item,
  busy,
  onSetServings,
  onRemoveItem,
}: {
  item: ResolvedPlanItem
  busy: boolean
  onSetServings: (itemId: string, servings: number) => void
  onRemoveItem: (itemId: string) => void
}) {
  const byWeight = item.servingGrams !== undefined && item.servingGrams > 0
  const value = byWeight ? (item.grams ?? 0) : item.servings
  const fieldId = `qty-${item.id}`

  return (
    <li
      className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--panel-border)] p-2"
      data-testid="plan-item"
      data-food={item.foodId}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={fieldId} className="truncate text-sm text-[var(--text)]">
          {item.name}
        </label>
        <span className="hint" data-testid="plan-item-readout">
          {kcalText(item.kcal)} kcal · {Math.round(item.proteinG)} g protein
          {item.carbG !== undefined ? ` · ${item.carbG} g carbs` : ''}
          {item.fatG !== undefined ? ` · ${item.fatG} g fat` : ''}
          {item.known ? '' : ' · not in your library, so it counts for nothing'}
        </span>
      </span>

      <span className="flex items-center gap-2">
        <NumberInput
          id={fieldId}
          value={value}
          disabled={busy}
          className="w-20"
          aria-describedby={`${fieldId}-unit`}
          onChange={(next) => {
            if (next === null || next <= 0) return
            onSetServings(item.id, byWeight ? next / (item.servingGrams as number) : next)
          }}
        />
        <span id={`${fieldId}-unit`} className="hint w-24 shrink-0">
          {byWeight ? basisHint(item.weightBasis) : item.servingLabel}
        </span>
      </span>

      <Button
        variant="quiet"
        disabled={busy}
        onClick={() => onRemoveItem(item.id)}
        aria-label={`Remove ${item.name} from this meal`}
      >
        Remove
      </Button>
    </li>
  )
}
