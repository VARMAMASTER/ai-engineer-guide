'use client'

import { useState } from 'react'
import Chip from '@/components/ui/Chip'
import Field from '@/components/ui/Field'
import NumberInput from '@/components/ui/NumberInput'
import Panel from '@/components/ui/Panel'
import Select from '@/components/ui/Select'
import Switch from '@/components/ui/Switch'
import { occurrenceSeries } from '@/lib/ops/recurrence'
import { weekdayOf, type IsoDate } from '@/lib/ops/date'
import {
  DEFAULT_OVERFLOW_POLICY,
  DEFAULT_RECURRENCE_BASIS,
  type OverflowPolicy,
  type RecurrenceBasis,
  type RecurrenceRule,
} from '@/lib/ops/types'
import {
  describeBasis,
  describeOverflow,
  describeRecurrence,
  formatDate,
  ordinalDay,
  weekdayLabel,
} from './format'

/* ============================================================================
   Recurrence, expressed so it can be read back.

   This is the hardest thing in Ops to put on a screen, and the failure mode is
   not a crash — it is a user who configures "the 31st" in February, gets a
   result they did not predict, and stops trusting the app with anything that
   matters. Three decisions, all of them visible rather than buried:

   1. WHAT YOU JUST SAID, IN WORDS. `describeRecurrence` renders the draft as
      the sentence you would have spoken — "The third Tuesday of each month".
      A form that only reflects its own controls back (a select on "monthly by
      weekday", a spinner on 3) is not confirmation, it is an echo.

   2. WHAT IT ACTUALLY DOES NEXT. The next four dates come from the SAME
      `occurrenceSeries` the app will use, not from a description of it. That is
      what makes February visible: pick the 31st and the preview says 28 Feb
      before you save, not four weeks later.

   3. WHAT HAPPENS WHEN THE DAY DOES NOT EXIST, and which date the next one is
      counted from. Both are per-rule choices with documented defaults (clamp,
      and schedule-based), and both are shown in plain words next to the
      control that sets them — never as a policy the user is assumed to have
      read.

   The one invalid state this form can reach is a weekly rule with no weekday
   selected, and it is made UNREACHABLE rather than validated: the last
   remaining day's chip is disabled, so there is no moment where the preview
   has nothing to show and no error message to write.
   ========================================================================== */

type RecurrenceType = RecurrenceRule['type']

const TYPE_LABELS: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'everyNDays', label: 'Every N days' },
  { value: 'weekly', label: 'Weekly, on chosen days' },
  { value: 'monthlyByDayOfMonth', label: 'Monthly, on a date' },
  { value: 'monthlyByWeekday', label: 'Monthly, on a weekday' },
]

const ORDINALS: { value: 1 | 2 | 3 | 4 | 5 | -1; label: string }[] = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: 5, label: 'Fifth' },
  { value: -1, label: 'Last' },
]

/**
 * Every variant's parameters, held together.
 *
 * One flat draft rather than a union in state, so that switching from "weekly"
 * to "monthly" and back does not throw away the weekdays you had already
 * picked. Only the fields the current `type` needs are read by `toRule`.
 */
interface Draft {
  type: RecurrenceType
  n: number
  weekdays: number[]
  day: number
  ordinal: 1 | 2 | 3 | 4 | 5 | -1
  weekday: number
  overflow: OverflowPolicy
  basis: RecurrenceBasis
}

function toRule(draft: Draft): RecurrenceRule {
  switch (draft.type) {
    case 'daily':
      return { type: 'daily', basis: draft.basis }
    case 'everyNDays':
      return { type: 'everyNDays', n: draft.n, basis: draft.basis }
    case 'weekly':
      return { type: 'weekly', weekdays: draft.weekdays, basis: draft.basis }
    case 'monthlyByDayOfMonth':
      return {
        type: 'monthlyByDayOfMonth',
        day: draft.day,
        overflow: draft.overflow,
        basis: draft.basis,
      }
    case 'monthlyByWeekday':
      return {
        type: 'monthlyByWeekday',
        ordinal: draft.ordinal,
        weekday: draft.weekday,
        overflow: draft.overflow,
        basis: draft.basis,
      }
  }
}

function draftFrom(rule: RecurrenceRule | null, anchor: IsoDate): Draft {
  const base: Draft = {
    type: 'daily',
    n: 3,
    weekdays: [weekdayOf(anchor)],
    day: Number(anchor.slice(8, 10)),
    ordinal: 1,
    weekday: weekdayOf(anchor),
    overflow: DEFAULT_OVERFLOW_POLICY,
    basis: DEFAULT_RECURRENCE_BASIS,
  }
  if (!rule) return base

  const withShared: Draft = { ...base, type: rule.type, basis: rule.basis }
  switch (rule.type) {
    case 'everyNDays':
      return { ...withShared, n: rule.n }
    case 'weekly':
      return { ...withShared, weekdays: [...rule.weekdays] }
    case 'monthlyByDayOfMonth':
      return { ...withShared, day: rule.day, overflow: rule.overflow }
    case 'monthlyByWeekday':
      return {
        ...withShared,
        ordinal: rule.ordinal,
        weekday: rule.weekday,
        overflow: rule.overflow,
      }
    default:
      return withShared
  }
}

export interface RecurrenceEditorProps {
  value: RecurrenceRule | null
  onChange: (rule: RecurrenceRule | null) => void
  /**
   * The date the preview counts forward from — the task's due date, or today
   * when it has none. The same date the app will use, so the preview is the
   * answer rather than an illustration of it.
   */
  anchor: IsoDate
}

export default function RecurrenceEditor({ value, onChange, anchor }: RecurrenceEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(value, anchor))
  const on = value !== null

  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (on) onChange(toRule(next))
  }

  function toggleRepeat(checked: boolean) {
    onChange(checked ? toRule(draft) : null)
  }

  function toggleWeekday(weekday: number) {
    const has = draft.weekdays.includes(weekday)
    // The last selected day cannot be removed — see the header. Its chip is
    // disabled too, so this guard is the belt to that braces.
    if (has && draft.weekdays.length === 1) return
    update({
      weekdays: has
        ? draft.weekdays.filter((d) => d !== weekday)
        : [...draft.weekdays, weekday].sort((a, b) => a - b),
    })
  }

  const rule = on ? toRule(draft) : null
  // Not memoised: four iterations of calendar arithmetic, recomputed on a
  // keystroke. A `useMemo` here would cost more in dependency bookkeeping than
  // the work it skips, and a stale preview is the one bug this panel must not
  // have — it is the only thing standing between the user and a rule they
  // misread.
  const preview = rule ? occurrenceSeries(rule, anchor, 4) : []

  const overflowMatters =
    (draft.type === 'monthlyByDayOfMonth' && draft.day > 28) ||
    (draft.type === 'monthlyByWeekday' && draft.ordinal === 5)

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Repeats</p>
          <p className="text-xs text-[var(--text-muted)]">
            A recurring task spawns its next occurrence when you complete it.
          </p>
        </div>
        <Switch checked={on} onCheckedChange={toggleRepeat} aria-label="Repeats" />
      </div>

      {on && rule ? (
        <>
          <Field label="Pattern">
            <Select
              value={draft.type}
              onChange={(e) => update({ type: e.target.value as RecurrenceType })}
            >
              {TYPE_LABELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {draft.type === 'everyNDays' ? (
            <Field label="Every how many days?">
              <NumberInput
                value={draft.n}
                onChange={(n) => {
                  // An emptied field is a keystroke on the way somewhere, not a
                  // request for "every zero days". The last valid interval is
                  // kept until a new one arrives, so the preview below never
                  // shows a rule the user did not ask for.
                  if (n === null) return
                  update({ n: Math.max(1, Math.round(n)) })
                }}
                aria-label="Number of days between occurrences"
              />
            </Field>
          ) : null}

          {draft.type === 'weekly' ? (
            <fieldset className="field">
              <legend className="label">On these days</legend>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((weekday) => {
                  const selected = draft.weekdays.includes(weekday)
                  const onlyOne = selected && draft.weekdays.length === 1
                  return (
                    <Chip
                      key={weekday}
                      pressed={selected}
                      disabled={onlyOne}
                      onClick={() => toggleWeekday(weekday)}
                      aria-label={weekdayLabel(weekday)}
                    >
                      {weekdayLabel(weekday).slice(0, 3)}
                    </Chip>
                  )
                })}
              </div>
              <p className="hint">A rule needs at least one day, so the last one cannot be removed.</p>
            </fieldset>
          ) : null}

          {draft.type === 'monthlyByDayOfMonth' ? (
            // A select, not a number field: the domain is exactly 1-31, every
            // option is a valid rule, and there is no half-typed state ("3" on
            // the way to "31") for the preview underneath to flicker through.
            <Field label="Day of the month">
              <Select
                value={String(draft.day)}
                onChange={(e) => update({ day: Number(e.target.value) })}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={String(day)}>
                    The {ordinalDay(day)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {draft.type === 'monthlyByWeekday' ? (
            <div className="flex flex-col gap-3 md:flex-row">
              <Field label="Which one" className="min-w-0 flex-1">
                <Select
                  value={String(draft.ordinal)}
                  onChange={(e) => update({ ordinal: Number(e.target.value) as Draft['ordinal'] })}
                >
                  {ORDINALS.map((option) => (
                    <option key={option.value} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Weekday" className="min-w-0 flex-1">
                <Select
                  value={String(draft.weekday)}
                  onChange={(e) => update({ weekday: Number(e.target.value) })}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
                    <option key={weekday} value={String(weekday)}>
                      {weekdayLabel(weekday)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}

          {overflowMatters ? (
            <Field
              label="When that day does not exist"
              hint={describeOverflow(rule) ?? undefined}
            >
              <Select
                value={draft.overflow}
                onChange={(e) => update({ overflow: e.target.value as OverflowPolicy })}
              >
                <option value="clamp">Use the closest earlier day</option>
                <option value="skip">Skip that month</option>
              </Select>
            </Field>
          ) : null}

          <Field label="Count the next one from" hint={describeBasis(rule)}>
            <Select
              value={draft.basis}
              onChange={(e) => update({ basis: e.target.value as RecurrenceBasis })}
            >
              <option value="schedule">The scheduled date</option>
              <option value="completion">The day I complete it</option>
            </Select>
          </Field>

          {/* Solid, not glass: this sits inside a `raised` dialog, and the blur
              budget is two stacked layers. */}
          <Panel tier="solid" className="p-3" data-testid="recurrence-preview">
            <p className="text-sm font-medium" data-testid="recurrence-sentence">
              {describeRecurrence(rule)}
            </p>
            <p className="eyebrow mt-3">Next four, counting from {formatDate(anchor)}</p>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm text-[var(--text-muted)]">
              {preview.map((date) => (
                <li key={date} className="tnum">
                  {formatDate(date)}
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : null}
    </div>
  )
}
