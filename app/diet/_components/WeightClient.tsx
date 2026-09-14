'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import NumberInput from '@/components/ui/NumberInput'
import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import { useToast } from '@/components/ui/Toast'
import { bmi, type BmiCategory } from '@/lib/diet/energy'
import { addDays } from '@/lib/diet/time'
import { trendChange, trendOn, weightTrend } from '@/lib/diet/trend'
import type { WeightReading } from '@/lib/diet/types'
import { addWeight, newId, removeWeight } from '../_data/mutations'
import { dayLabel, kgText, signedKg } from '../_lib/format'
import { nowLocalTime, useLocalToday } from '../_lib/useLocalToday'
import WeightChart from './WeightChart'

/**
 * The Weight surface.
 *
 * Everything on it reads off the TREND rather than the last reading, because
 * daily weight swings 1-2 kg on water alone and a raw line reads that as
 * failure — which is the commonest reason people stop weighing themselves. The
 * raw points are still shown, next to the trend, so nothing is hidden: the
 * chart's whole argument is "here is the noise, and here is what it means".
 *
 * Several readings on one day are allowed and are averaged rather than
 * overwritten (`lib/diet/trend.ts`), so the morning and evening weigh-in are
 * two samples of one noisy quantity instead of a race.
 */

export interface WeightClientProps {
  userId: string
  serverToday: string
  /** Readings with the row id each can be deleted by. */
  initialRows: { id: string; reading: WeightReading }[]
  /** From the profile, for BMI. Absent means no BMI rather than a guessed one. */
  heightCm: number | null
  loadError: string | null
}

const BMI_LABELS: Record<BmiCategory, string> = {
  underweight: 'Underweight',
  healthy: 'Healthy range',
  overweight: 'Overweight',
  'obese-i': 'Obese, class I',
  'obese-ii': 'Obese, class II',
  'obese-iii': 'Obese, class III',
}

interface Row extends WeightReading {
  id: string
}

export default function WeightClient({
  userId,
  serverToday,
  initialRows,
  heightCm,
  loadError,
}: WeightClientProps) {
  const toast = useToast()
  const today = useLocalToday(serverToday)
  const [rows, setRows] = useState<Row[]>(() =>
    initialRows.map(({ id, reading }) => ({ ...reading, id })),
  )
  const [kg, setKg] = useState<number | null>(null)
  const [date, setDate] = useState(serverToday)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const series = useMemo(() => weightTrend(rows), [rows])
  const now = useMemo(() => trendOn(series, today), [series, today])
  const week = useMemo(() => trendChange(series, addDays(today, -7), today), [series, today])
  const body = useMemo(
    () => (now && heightCm ? bmi(now.trendKg, heightCm) : null),
    [now, heightCm],
  )

  const canSave = kg !== null && kg >= 20 && kg <= 500 && /^\d{4}-\d{2}-\d{2}$/.test(date)

  async function save() {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    const id = newId()
    const reading: WeightReading = { date, kg: kg!, at: `${date}T${nowLocalTime()}` }
    const optimistic: Row = { ...reading, id }
    setRows((current) => [...current, optimistic])
    const { error: message } = await addWeight(userId, id, reading)
    setSaving(false)
    if (message) {
      setRows((current) => current.filter((r) => r.id !== id))
      setError(message)
      return
    }
    setKg(null)
    toast.show({ message: `${kgText(reading.kg)} kg logged.`, tone: 'success' })
  }

  async function remove(row: Row) {
    const snapshot = rows
    setRows((current) => current.filter((r) => r.id !== row.id))
    const { error: message } = await removeWeight(userId, row.id)
    if (message) {
      setRows(snapshot)
      toast.show({ message: `Could not delete: ${message}`, tone: 'error' })
    }
  }

  const recent = [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14)

  return (
    <div className="flex flex-col gap-6">
      {loadError ? (
        <p className="panel p-4 text-sm text-[var(--danger)]" role="alert">
          Your readings could not be loaded ({loadError}). Reload before adding another, so the
          trend is not computed from half a history.
        </p>
      ) : null}

      <section className="panel flex flex-col gap-4 p-4" aria-label="Log a weight">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Weight (kg)">
            <NumberInput
              value={kg}
              onChange={setKg}
              placeholder="72.4"
              data-testid="weight-input"
            />
          </Field>
          <Field label="Day">
            <Input
              type="date"
              value={date}
              max={today}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Button
            variant="accent"
            onClick={save}
            disabled={!canSave}
            loading={saving}
            data-testid="log-weight"
          >
            Log weight
          </Button>
        </div>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="hint">
          Weigh in whenever suits you — more than one reading in a day is averaged, not
          overwritten, because two weigh-ins are two samples of the same noisy number.
        </p>
      </section>

      {series.length === 0 ? (
        <div className="panel p-4">
          <EmptyState
            title="No readings yet."
            description="One reading seeds the trend. It takes a couple of weeks of them before the trend is telling you something a single number cannot."
            action={<span className="hint">Log your first weight above.</span>}
          />
        </div>
      ) : (
        <>
          <section className="panel flex flex-col gap-4 p-4" aria-label="Where the trend is">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Trend now" value={now ? kgText(now.trendKg) : '—'} unit="kg" />
              <Stat
                label="Last reading"
                value={kgText(series[series.length - 1].weightKg)}
                unit="kg"
              />
              <Stat
                label="Change / week"
                value={week ? signedKg(week.kgPerWeek) : '—'}
                unit={week ? 'kg' : undefined}
              />
              <Stat
                label="BMI"
                value={body ? body.bmi.toFixed(1) : '—'}
                unit={body ? BMI_LABELS[body.category] : undefined}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {now && now.staleDays > 2 ? (
                <Tag variant="outline">
                  Last weighed {now.staleDays} {now.staleDays === 1 ? 'day' : 'days'} ago
                </Tag>
              ) : null}
              {!week ? (
                <p className="hint">
                  A weekly rate needs two trend points at least a day apart. One reading is a
                  starting point, not a direction.
                </p>
              ) : null}
              {!heightCm ? (
                <p className="hint">
                  BMI needs your height, which is in Setup. It is not guessed from anything.
                </p>
              ) : null}
            </div>
          </section>

          <section className="panel flex flex-col gap-2 p-4" aria-labelledby="weight-chart-heading">
            <h2 id="weight-chart-heading" className="eyebrow">
              Readings and trend
            </h2>
            <WeightChart series={series} />
          </section>
        </>
      )}

      {recent.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="recent-weights-heading">
          <h2 id="recent-weights-heading" className="eyebrow">
            Recent readings
          </h2>
          <ul className="flex flex-col gap-2">
            {recent.map((row) => (
              <li key={row.id} className="panel flex items-center gap-3 p-3">
                <span className="flex-1 text-sm text-[var(--text)]">{dayLabel(row.date)}</span>
                <span className="readout text-[var(--text-muted)]">{kgText(row.kg)} kg</span>
                <Button
                  onClick={() => void remove(row)}
                  aria-label={`Remove the ${kgText(row.kg)} kilogram reading on ${row.date}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
