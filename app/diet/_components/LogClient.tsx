'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import Meter from '@/components/ui/Meter'
import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import { useToast } from '@/components/ui/Toast'
import { dayTotals } from '@/lib/diet/aggregate'
import {
  planDayToEntries,
  resolvePlanDay,
  weekDayOf,
  WEEK_DAY_LABEL,
  type WeeklyPlan,
} from '@/lib/diet/plan'
import { addDays, formatSpan } from '@/lib/diet/time'
import { dailyWindowSummaries, entryWindowStatus } from '@/lib/diet/window'
import type { DietTargets, EatingWindow, FoodItem, LogEntry } from '@/lib/diet/types'
import { addEntries, addEntry, newId, removeEntry, upsertFood } from '../_data/mutations'
import { dayLabel, kcalText, timeLabel } from '../_lib/format'
import { nowLocalTime, useLocalToday } from '../_lib/useLocalToday'
import AddEntrySheet, { type EntryDraft } from './AddEntrySheet'

/**
 * The Log surface — the screen this whole app lives or dies on.
 *
 * The ordering of what is on it is the design. Food logging dies at friction,
 * and people eat twenty or thirty things on repeat, so the first thing under
 * the day's totals is a row of one-tap chips for the foods this user actually
 * eats, and the second is a button that re-logs yesterday wholesale. The form
 * is third, and search is inside it. That ordering is the spec's "library and
 * 'log yesterday again' are the primary path; search is secondary", laid out
 * top to bottom.
 *
 * **Quick-log chips are disabled on any day but today, deliberately.** The
 * eating window makes an entry's timestamp load-bearing, and a chip logging
 * into a past day would have to invent a time for a meal it knows nothing
 * about. Inventing 12:00 would silently move meals into the window and inflate
 * adherence, so the chips step aside and the form — which asks for the time —
 * takes over.
 *
 * Writes are optimistic: the row is in the list before the request comes back,
 * and a failure removes it again and says so in a toast. Logging a meal has to
 * feel like a tap.
 */

export interface LogClientProps {
  userId: string
  /** Today as the SERVER has it; corrected to the browser's date on mount. */
  serverToday: string
  initialEntries: LogEntry[]
  initialFoods: FoodItem[]
  targets: DietTargets | undefined
  window: EatingWindow
  /** The weekly plan, when there is one. `undefined` hides the one-tap day. */
  plan: WeeklyPlan | undefined
  loadError: string | null
}

const QUICK_LOG_LIMIT = 8

export default function LogClient({
  userId,
  serverToday,
  initialEntries,
  initialFoods,
  targets,
  window: eatingWindow,
  plan,
  loadError,
}: LogClientProps) {
  const toast = useToast()
  const today = useLocalToday(serverToday)
  const [offset, setOffset] = useState(0)
  const [entries, setEntries] = useState<LogEntry[]>(initialEntries)
  const [foods, setFoods] = useState<FoodItem[]>(initialFoods)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTime, setSheetTime] = useState('12:00')
  // Bumped every time the sheet opens, and used as the sheet's `key`. That is
  // what gives it a fresh form: React discards the previous instance rather
  // than an effect inside it clearing ten fields one at a time.
  const [sheetKey, setSheetKey] = useState(0)
  const [busy, setBusy] = useState(false)

  const date = addDays(today, offset)
  const isToday = offset === 0

  const totals = useMemo(() => dayTotals(entries, date), [entries, date])
  const day = useMemo(
    () => dailyWindowSummaries(entries, [date], eatingWindow)[0],
    [entries, date, eatingWindow],
  )
  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === date).sort((a, b) => a.at.localeCompare(b.at)),
    [entries, date],
  )
  const previousDayEntries = useMemo(() => {
    const previous = addDays(date, -1)
    return entries.filter((e) => e.date === previous)
  }, [entries, date])

  const quickFoods = foods.slice(0, QUICK_LOG_LIMIT)

  /**
   * The plan for the day being viewed, resolved against the library.
   *
   * Resolved here rather than passed in already resolved, because a quantity
   * the user just edited on the Plan screen has to be reflected the next time
   * this page loads, and the resolution is the cheap half of that.
   */
  const planForDay = useMemo(() => {
    if (!plan) return null
    const day = plan[weekDayOf(date)]
    return day ? resolvePlanDay(day, foods) : null
  }, [plan, date, foods])

  async function commit(
    optimistic: LogEntry[],
    write: () => Promise<{ error: string | null }>,
    successMessage: string,
  ) {
    const ids = new Set(optimistic.map((e) => e.id))
    setEntries((current) => [...current, ...optimistic])
    setBusy(true)
    const { error } = await write()
    setBusy(false)
    if (error) {
      setEntries((current) => current.filter((e) => !ids.has(e.id)))
      toast.show({ message: `Could not save: ${error}`, tone: 'error' })
      return
    }
    toast.show({ message: successMessage, tone: 'success' })
  }

  async function quickLog(food: FoodItem) {
    const entry: LogEntry = {
      id: newId(),
      foodId: food.id,
      name: food.name,
      servings: 1,
      kcal: food.kcalPerServing,
      proteinG: food.proteinGPerServing,
      at: `${date}T${nowLocalTime()}`,
      date,
    }
    await commit([entry], () => addEntry(userId, entry), `${food.name} logged.`)

    // Move the food to the front of the quick row, so the list orders itself
    // by what this person actually eats rather than by what they typed first.
    setFoods((current) => [food, ...current.filter((f) => f.id !== food.id)])
    void upsertFood(userId, food, { used: true })
  }

  /**
   * The whole of the day's plan, in one tap.
   *
   * On the Log screen and not only on the Plan screen, deliberately: this is
   * the page the user opens, and a plan whose logging lives one navigation away
   * is a plan that gets logged by hand. The plan itself is edited elsewhere.
   */
  async function logPlannedDay() {
    if (!planForDay) return
    const copies = planDayToEntries(planForDay, { date, nextId: newId })
    await commit(
      copies,
      () => addEntries(userId, copies),
      `${WEEK_DAY_LABEL[planForDay.day]}’s plan logged: ${copies.length} entries, ` +
        `${kcalText(planForDay.kcal)} kcal, ${Math.round(planForDay.proteinG)} g protein.`,
    )
  }

  async function repeatPreviousDay() {
    const copies: LogEntry[] = previousDayEntries.map((entry) => ({
      ...entry,
      id: newId(),
      // Same wall-clock time, this day's date. The meal is the same meal; the
      // day is the only thing that changed.
      at: `${date}T${timeLabel(entry.at)}`,
      date,
    }))
    await commit(
      copies,
      () => addEntries(userId, copies),
      `${copies.length} ${copies.length === 1 ? 'entry' : 'entries'} copied over.`,
    )
  }

  async function deleteEntry(entry: LogEntry) {
    const snapshot = entries
    setEntries((current) => current.filter((e) => e.id !== entry.id))
    const { error } = await removeEntry(userId, entry.id)
    if (error) {
      setEntries(snapshot)
      toast.show({ message: `Could not delete: ${error}`, tone: 'error' })
      return
    }
    toast.show({ message: `${entry.name} removed.`, tone: 'info' })
  }

  async function submitDraft(draft: EntryDraft): Promise<string | null> {
    const entry: LogEntry = {
      id: newId(),
      foodId: draft.foodId,
      name: draft.name,
      servings: draft.servings,
      kcal: draft.kcalPerServing * draft.servings,
      proteinG: draft.proteinPerServing * draft.servings,
      at: draft.at,
      date: draft.at.slice(0, 10),
    }

    setEntries((current) => [...current, entry])
    const { error } = await addEntry(userId, entry)
    if (error) {
      setEntries((current) => current.filter((e) => e.id !== entry.id))
      return error
    }

    if (draft.saveToLibrary) {
      const food: FoodItem = {
        id: draft.foodId ?? newId(),
        name: draft.name,
        servingLabel: draft.servingLabel,
        kcalPerServing: draft.kcalPerServing,
        proteinGPerServing: draft.proteinPerServing,
        source: 'custom',
      }
      setFoods((current) => [food, ...current.filter((f) => f.id !== food.id)])
      const saved = await upsertFood(userId, food, { used: true })
      if (saved.error) {
        // The ENTRY is already safe. Failing to keep the library copy is a
        // smaller problem than losing the meal, so it is reported and the
        // sheet still closes.
        toast.show({ message: `Logged, but not kept in the library: ${saved.error}`, tone: 'error' })
        return null
      }
    }

    toast.show({ message: `${entry.name} logged.`, tone: 'success' })
    return null
  }

  function openSheet() {
    setSheetTime(isToday ? nowLocalTime() : eatingWindow.enabled ? eatingWindow.start : '12:00')
    setSheetKey((n) => n + 1)
    setSheetOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      {loadError ? (
        <p className="panel p-4 text-sm text-[var(--danger)]" role="alert">
          Your log could not be loaded ({loadError}). Nothing has been lost — reload before adding
          anything, so you are not logging on top of a half-read day.
        </p>
      ) : null}

      <DayNav
        date={date}
        isToday={isToday}
        onStep={(step) => setOffset((n) => Math.min(0, n + step))}
        onToday={() => setOffset(0)}
      />

      <section className="panel flex flex-col gap-4 p-4" aria-label="Totals for this day">
        {totals.logged ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Calories" value={kcalText(totals.kcal)} unit="kcal" />
              <Stat label="Protein" value={Math.round(totals.proteinG)} unit="g" />
            </div>
            {targets ? (
              <div className="flex flex-col gap-3">
                <Meter
                  label={`Calories against your ${kcalText(targets.kcal)} kcal target`}
                  value={totals.kcal}
                  max={targets.kcal}
                  showValue
                />
                <Meter
                  label={`Protein against your ${Math.round(targets.proteinG)} g target`}
                  value={totals.proteinG}
                  max={targets.proteinG}
                  showValue
                />
                <p className="hint">
                  {describeAgainstTarget(totals.kcal, targets)} Protein and calories are separate
                  numbers; hitting one says nothing about the other.
                </p>
                {/* Said in words, not left to a bar that is nearly full. A day
                    inside its calorie band and under its protein floor is the
                    commonest way a plan fails, and the bar above renders it as
                    "almost there". */}
                {totals.proteinG < targets.proteinG - 0.05 ? (
                  <p
                    className="text-sm text-[var(--warning)]"
                    role="status"
                    data-testid="log-protein-warning"
                  >
                    {Math.round(targets.proteinG - totals.proteinG)} g under your{' '}
                    {Math.round(targets.proteinG)} g protein floor
                    {Math.abs(totals.kcal - targets.kcal) <= targets.kcalBand
                      ? ', with the calories on target'
                      : ''}
                    . The Plan screen quantifies what closes it.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="hint">
                No targets set yet, so these are counts rather than a score. Set them in Setup.
              </p>
            )}
            <DayClock day={day} window={eatingWindow} />
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Nothing logged</p>
            <p className="text-sm text-[var(--text-muted)]">
              This day is blank, which is not the same as a day of eating nothing. It stays out of
              every average on the Trends page until something is logged against it.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="quick-log-heading">
        <div className="flex flex-col gap-1">
          <h2 id="quick-log-heading" className="eyebrow">
            Log again
          </h2>
          <p className="hint">
            {isToday
              ? 'One tap, logged at the current time.'
              : 'Quick chips log at the current time, so they only apply to today. Use “Add an entry” to set a time on another day.'}
          </p>
        </div>

        {/* First in the section, and full width on a phone. The kitchen at 7am
            is the whole design brief for this button: one thumb-sized tap from
            opening the app writes the day. */}
        {planForDay && planForDay.kcal > 0 ? (
          <Button
            variant="accent"
            className="w-full md:w-auto"
            onClick={() => void logPlannedDay()}
            disabled={busy}
            data-testid="log-planned-day"
          >
            {isToday ? 'Log today’s plan' : `Log ${WEEK_DAY_LABEL[planForDay.day]}’s plan`} ·{' '}
            {kcalText(planForDay.kcal)} kcal, {Math.round(planForDay.proteinG)} g protein
          </Button>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {quickFoods.map((food) => (
            <Chip
              key={food.id}
              disabled={!isToday || busy}
              onClick={() => void quickLog(food)}
              title={`${kcalText(food.kcalPerServing)} kcal, ${Math.round(food.proteinGPerServing)} g protein per ${food.servingLabel}`}
            >
              <span className="truncate">{food.name}</span>
              <span className="readout text-[var(--text-faint)]">
                {kcalText(food.kcalPerServing)}
              </span>
            </Chip>
          ))}
          {previousDayEntries.length > 0 ? (
            <Chip
              onClick={() => void repeatPreviousDay()}
              disabled={busy}
              data-testid="repeat-previous-day"
            >
              Repeat {isToday ? 'yesterday' : 'the day before'} ({previousDayEntries.length})
            </Chip>
          ) : null}
          <Button variant="accent" onClick={openSheet} data-testid="add-entry">
            Add an entry
          </Button>
        </div>

        {quickFoods.length === 0 ? (
          <p className="hint">
            Your library is empty. Anything you log with “Keep in my library” switched on turns up
            here as a one-tap chip.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="entries-heading">
        <h2 id="entries-heading" className="eyebrow">
          {dayLabel(date)}
        </h2>
        {dayEntries.length === 0 ? (
          <div className="panel p-4">
            <EmptyState
              title="No entries on this day."
              description="Log the first thing you ate and the day starts counting."
              action={
                <Chip onClick={openSheet}>Add an entry</Chip>
              }
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="entry-list">
            {dayEntries.map((entry) => {
              const status = entryWindowStatus(entry, eatingWindow)
              return (
                <li
                  key={entry.id}
                  className="panel flex items-center gap-3 p-3"
                  data-testid="entry-row"
                  data-window={status}
                >
                  <span className="readout w-12 shrink-0 text-[var(--text-muted)]">
                    {timeLabel(entry.at)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-[var(--text)]">{entry.name}</span>
                    <span className="hint">
                      {kcalText(entry.kcal)} kcal · {Math.round(entry.proteinG)} g protein
                      {entry.servings !== 1 ? ` · ${entry.servings} servings` : ''}
                    </span>
                  </span>
                  {status === 'outside' ? (
                    <Tag variant="outline" className="shrink-0">
                      Outside window
                    </Tag>
                  ) : null}
                  <Button
                    variant="quiet"
                    onClick={() => void deleteEntry(entry)}
                    aria-label={`Remove ${entry.name}`}
                    className="shrink-0"
                  >
                    Remove
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <AddEntrySheet
        key={sheetKey}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={date}
        defaultTime={sheetTime}
        window={eatingWindow}
        library={foods}
        onSubmit={submitDraft}
      />
    </div>
  )
}

function DayNav({
  date,
  isToday,
  onStep,
  onToday,
}: {
  date: string
  isToday: boolean
  onStep: (step: number) => void
  onToday: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => onStep(-1)} aria-label="Previous day">
        ←
      </Button>
      <span className="flex-1 text-sm font-medium text-[var(--text)]" data-testid="log-day">
        {dayLabel(date)}
        {isToday ? <span className="ml-2 text-[var(--text-muted)]">today</span> : null}
      </span>
      {/* No forward past today: a day that has not happened cannot be logged
          into, and an empty tomorrow looks exactly like a missed day. */}
      <Button onClick={() => onStep(1)} disabled={isToday} aria-label="Next day">
        →
      </Button>
      <Button onClick={onToday} disabled={isToday}>
        Today
      </Button>
    </div>
  )
}

/**
 * The day's clock facts: when eating started and stopped, and the fast before
 * it. `fastingUnknownReason` is rendered rather than hidden — a blank yesterday
 * means the fast is unknown, not enormous, and reporting a 38-hour fast because
 * somebody forgot to log lunch would be a lie with a number attached.
 */
function DayClock({
  day,
  window: eatingWindow,
}: {
  day: ReturnType<typeof dailyWindowSummaries>[number]
  window: EatingWindow
}) {
  if (!day.logged) return null

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <div className="flex flex-col">
        <dt className="eyebrow">First / last</dt>
        <dd className="readout text-[var(--text)]">
          {day.firstEntryAt ? timeLabel(day.firstEntryAt) : '—'} →{' '}
          {day.lastEntryAt ? timeLabel(day.lastEntryAt) : '—'}
        </dd>
      </div>
      <div className="flex flex-col">
        <dt className="eyebrow">Eating span</dt>
        <dd className="readout text-[var(--text)]">
          {day.eatingSpanMinutes === null ? '—' : formatSpan(day.eatingSpanMinutes)}
        </dd>
      </div>
      <div className="flex flex-col">
        <dt className="eyebrow">Fast before it</dt>
        <dd className="readout text-[var(--text)]">
          {day.fastingSpanMinutes === null ? 'Unknown' : formatSpan(day.fastingSpanMinutes)}
        </dd>
      </div>
      {day.fastingUnknownReason ? (
        <p className="hint w-full">{day.fastingUnknownReason}</p>
      ) : null}
      {eatingWindow.enabled && day.entriesOutsideWindow > 0 ? (
        <p className="hint w-full">
          {day.entriesOutsideWindow} of {day.entryCount} entries fell outside{' '}
          {eatingWindow.start}–{eatingWindow.end}. That is a fact about timing, not about the
          calories — those are scored separately.
        </p>
      ) : null}
    </dl>
  )
}

function describeAgainstTarget(kcal: number, targets: DietTargets): string {
  const delta = kcal - targets.kcal
  if (Math.abs(delta) <= targets.kcalBand) {
    return `Inside your ${kcalText(targets.kcalBand)} kcal band.`
  }
  if (delta > 0) return `${kcalText(delta)} kcal over target.`
  return `${kcalText(-delta)} kcal left.`
}
