'use client'

import Tag from '@/components/ui/Tag'
import {
  MEAL_SLOTS,
  WEEK_DAY_SHORT,
  type MealSlot,
  type PlanDayScore,
  type ResolvedDay,
  type WeekDay,
} from '@/lib/diet/plan'
import { kcalText } from '../_lib/format'

/**
 * The plan as the owner writes it down: day, four meals, and what the day
 * comes to.
 *
 * TEN COLUMNS ON A 390px PHONE. The table is the one thing on this screen
 * allowed to be wider than the viewport, and it gets its own
 * `overflow-x-auto` container so the PAGE never scrolls sideways — the
 * distinction matters, because a horizontally scrolling page moves the nav and
 * the heading off screen and looks broken, while a horizontally scrolling table
 * is a table you drag.
 *
 * Every meal cell shows the quantity WITH its weight basis ("50 g dry", "250 g
 * raw"). That is the whole reason this is a table of quantities rather than a
 * table of names: "brown rice" tells a person nothing they can weigh, and
 * "100 g" without "dry" tells them something wrong.
 *
 * The protein column is the point of the table. It carries a tag when the day
 * is under the floor, on every such day, rather than a single warning at the
 * bottom — the shortfall is a property of each day and three of the seven miss
 * it by a different amount.
 */

export interface PlanWeekTableProps {
  days: ResolvedDay[]
  scores: Map<WeekDay, PlanDayScore>
  proteinFloorG: number
  /** The weekday the user is on, highlighted. */
  today: WeekDay
  onOpenDay: (day: WeekDay) => void
}

const COLUMN_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
}

export default function PlanWeekTable({
  days,
  scores,
  proteinFloorG,
  today,
  onOpenDay,
}: PlanWeekTableProps) {
  return (
    <div
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
      data-testid="plan-week-scroller"
      tabIndex={0}
      role="region"
      aria-label="The week, scrollable sideways"
    >
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          The weekly plan: each day&rsquo;s four meals, its calories against maintenance, the
          deficit that leaves, and its total protein.
        </caption>
        <thead>
          <tr className="border-b border-[var(--panel-border)]">
            <Th>Day</Th>
            {MEAL_SLOTS.map((slot) => (
              <Th key={slot}>{COLUMN_LABEL[slot]}</Th>
            ))}
            <Th align="right">kcal</Th>
            <Th align="right">Maintenance</Th>
            <Th align="right">Deficit</Th>
            <Th align="right">Protein</Th>
            <Th>Notes</Th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const score = scores.get(day.day)
            const short = score?.proteinShortfallG ?? null
            return (
              <tr
                key={day.day}
                className="border-b border-[var(--panel-border)] align-top"
                data-testid="plan-week-row"
                data-day={day.day}
                data-today={day.day === today ? 'true' : undefined}
              >
                <td className="px-2 py-3">
                  <button
                    type="button"
                    onClick={() => onOpenDay(day.day)}
                    className="min-h-[44px] text-left font-medium text-[var(--accent)] underline decoration-[var(--accent-line)] underline-offset-4"
                  >
                    {WEEK_DAY_SHORT[day.day]}
                  </button>
                  {day.day === today ? (
                    <span className="hint block">today</span>
                  ) : null}
                </td>

                {MEAL_SLOTS.map((slot) => {
                  const meal = day.meals.find((m) => m.slot === slot)
                  return (
                    <td key={slot} className="px-2 py-3 text-[var(--text-muted)]">
                      {!meal || meal.items.length === 0 ? (
                        <span className="text-[var(--text-faint)]">—</span>
                      ) : (
                        <ul className="flex flex-col gap-0.5">
                          {meal.items.map((item) => (
                            <li key={item.id}>
                              <span className="text-[var(--text)]">{item.name}</span>{' '}
                              <span className="readout whitespace-nowrap">
                                {item.quantityLabel}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  )
                })}

                <td className="readout px-2 py-3 text-right text-[var(--text)]">
                  {kcalText(day.kcal)}
                </td>
                <td className="readout px-2 py-3 text-right text-[var(--text-muted)]">
                  {score ? kcalText(score.maintenanceKcal) : '—'}
                </td>
                <td className="readout px-2 py-3 text-right text-[var(--text)]">
                  {score ? kcalText(score.deficitKcal) : '—'}
                </td>
                <td className="px-2 py-3 text-right">
                  <span className="readout text-[var(--text)]">
                    {Math.round(day.proteinG)} g
                  </span>
                  {short !== null ? (
                    <Tag variant="outline" className="mt-1 block w-fit">
                      {short} g under {Math.round(proteinFloorG)}
                    </Tag>
                  ) : null}
                </td>
                <td className="px-2 py-3 text-[var(--text-muted)]">{day.note ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      scope="col"
      className={`eyebrow px-2 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  )
}
