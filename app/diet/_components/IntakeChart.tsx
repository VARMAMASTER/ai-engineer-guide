'use client'

import { useMemo, useState } from 'react'
import Skeleton from '@/components/ui/Skeleton'
import type { DayTotals, DietTargets } from '@/lib/diet/types'
import { kcalText, shortDayLabel, NOT_LOGGED } from '../_lib/format'
import { useElementWidth } from '../_lib/useElementWidth'

/**
 * Calories per day against the target, over a fortnight.
 *
 * **The unlogged day is the whole design problem here.** A bar chart's natural
 * answer is a zero-height column, and that is a lie: a day nobody logged is a
 * day nothing is known about, not a day of eating nothing. Drawing it as zero
 * would also make the eye average it in, which is exactly the mistake the
 * arithmetic in `lib/diet/aggregate.ts` refuses to make. So an unlogged day
 * gets no column at all — it gets a hollow outline sitting on the baseline,
 * the shape of an absence, and it is named in the legend.
 *
 * Colour carries no meaning. Over and under target are read off the POSITION
 * of the column relative to the target line and its band, which is a channel
 * that survives colour blindness, greyscale printing and forced-colors mode.
 * One hue, one gray outline, and a legend for the two marks.
 */

export interface IntakeChartProps {
  /** Oldest first. Unlogged days must be present, as `logged: false`. */
  days: DayTotals[]
  targets: DietTargets | undefined
}

const HEIGHT = 190
const PAD_LEFT = 44
const PAD_RIGHT = 10
const PAD_TOP = 14
const PAD_BOTTOM = 26
const MAX_BAR = 24

export default function IntakeChart({ days, targets }: IntakeChartProps) {
  const [box, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const model = useMemo(() => buildModel(days, targets, width), [days, targets, width])
  const hovered = hover !== null ? model?.bars[hover] : undefined

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div ref={box} className="w-full">
        {width === 0 || !model ? (
          <Skeleton className="h-[190px] w-full" aria-hidden="true" />
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Legend hasTarget={Boolean(targets)} />
              <p className="readout ml-auto text-[var(--text-muted)]" aria-live="polite">
                {hovered
                  ? `${shortDayLabel(hovered.date)} · ${hovered.kcal === null ? NOT_LOGGED : `${kcalText(hovered.kcal)} kcal`}`
                  : `${model.loggedCount} of ${model.bars.length} days logged`}
              </p>
            </div>

            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label={ariaLabel(model, targets)}
              className="block touch-pan-y"
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                setHover(model.nearest(event.clientX - rect.left))
              }}
              onPointerLeave={() => setHover(null)}
            >
              {model.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={PAD_LEFT}
                    x2={width - PAD_RIGHT}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="var(--panel-border)"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD_LEFT - 6}
                    y={tick.y + 3}
                    textAnchor="end"
                    fontSize={10}
                    fill="var(--text-faint)"
                  >
                    {kcalText(tick.value)}
                  </text>
                </g>
              ))}

              {model.band ? (
                <rect
                  x={PAD_LEFT}
                  y={model.band.y}
                  width={Math.max(0, width - PAD_LEFT - PAD_RIGHT)}
                  height={model.band.height}
                  fill="var(--accent-soft)"
                />
              ) : null}
              {model.targetY !== null ? (
                <line
                  x1={PAD_LEFT}
                  x2={width - PAD_RIGHT}
                  y1={model.targetY}
                  y2={model.targetY}
                  stroke="var(--text-muted)"
                  strokeWidth={1}
                />
              ) : null}

              {model.bars.map((bar, index) => (
                <g key={bar.date} opacity={hover === null || hover === index ? 1 : 0.6}>
                  {bar.kcal === null ? (
                    // An absence, drawn as one: a hollow footprint on the
                    // baseline. Never a zero-height column.
                    <rect
                      x={bar.x}
                      y={model.baseline - 7}
                      width={bar.width}
                      height={7}
                      rx={2}
                      fill="none"
                      stroke="var(--text-faint)"
                      strokeWidth={1.5}
                    >
                      <title>{`${bar.date}: ${NOT_LOGGED}`}</title>
                    </rect>
                  ) : (
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={Math.max(2, model.baseline - bar.y)}
                      rx={4}
                      fill="var(--accent)"
                    >
                      <title>{`${bar.date}: ${kcalText(bar.kcal)} kcal`}</title>
                    </rect>
                  )}
                </g>
              ))}

              <line
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={model.baseline}
                y2={model.baseline}
                stroke="var(--panel-border)"
                strokeWidth={1}
              />

              <text x={PAD_LEFT} y={HEIGHT - 8} fontSize={10} fill="var(--text-faint)">
                {shortDayLabel(model.bars[0].date)}
              </text>
              <text
                x={width - PAD_RIGHT}
                y={HEIGHT - 8}
                textAnchor="end"
                fontSize={10}
                fill="var(--text-faint)"
              >
                {shortDayLabel(model.bars[model.bars.length - 1].date)}
              </text>
            </svg>
          </>
        )}
      </div>

      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-[var(--text-muted)]">
          Show the numbers
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Calories and protein per day, with unlogged days named</caption>
            <thead>
              <tr className="eyebrow">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Day
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Calories
                </th>
                <th scope="col" className="py-1 font-medium">
                  Protein
                </th>
              </tr>
            </thead>
            <tbody className="tnum">
              {[...days].reverse().map((day) => (
                <tr key={day.date} className="border-t border-[var(--panel-border)]">
                  <td className="py-1.5 pr-3 text-[var(--text-muted)]">{day.date}</td>
                  <td className="py-1.5 pr-3 text-[var(--text)]">
                    {day.logged ? `${kcalText(day.kcal)} kcal` : NOT_LOGGED}
                  </td>
                  <td className="py-1.5 text-[var(--text)]">
                    {day.logged ? `${Math.round(day.proteinG)} g` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

function Legend({ hasTarget }: { hasTarget: boolean }) {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      <li className="flex items-center gap-2">
        <svg width={14} height={12} aria-hidden="true" className="shrink-0">
          <rect x={3} y={1} width={8} height={11} rx={3} fill="var(--accent)" />
        </svg>
        <span className="text-xs text-[var(--text-muted)]">Logged</span>
      </li>
      <li className="flex items-center gap-2">
        <svg width={14} height={12} aria-hidden="true" className="shrink-0">
          <rect
            x={3}
            y={5}
            width={8}
            height={7}
            rx={2}
            fill="none"
            stroke="var(--text-faint)"
            strokeWidth={1.5}
          />
        </svg>
        <span className="text-xs text-[var(--text-muted)]">{NOT_LOGGED}</span>
      </li>
      {hasTarget ? (
        <li className="flex items-center gap-2">
          <svg width={14} height={12} aria-hidden="true" className="shrink-0">
            <rect x={0} y={3} width={14} height={6} fill="var(--accent-soft)" />
            <line x1={0} y1={6} x2={14} y2={6} stroke="var(--text-muted)" strokeWidth={1} />
          </svg>
          <span className="text-xs text-[var(--text-muted)]">Target band</span>
        </li>
      ) : null}
    </ul>
  )
}

interface Bar {
  date: string
  kcal: number | null
  x: number
  y: number
  width: number
}

interface Model {
  bars: Bar[]
  baseline: number
  targetY: number | null
  band: { y: number; height: number } | null
  ticks: { value: number; y: number }[]
  loggedCount: number
  maxKcal: number
  nearest: (x: number) => number
}

function buildModel(
  days: DayTotals[],
  targets: DietTargets | undefined,
  width: number,
): Model | null {
  if (days.length === 0 || width < 160) return null

  const logged = days.filter((d): d is Extract<DayTotals, { logged: true }> => d.logged)
  const maxLogged = logged.length > 0 ? Math.max(...logged.map((d) => d.kcal)) : 0
  // Headroom above whichever is taller, so a target line never sits on the
  // ceiling and a big day never runs off the top.
  const top = Math.max(maxLogged, targets?.kcal ?? 0) * 1.15 || 2000

  const plotWidth = width - PAD_LEFT - PAD_RIGHT
  const baseline = HEIGHT - PAD_BOTTOM
  const plotHeight = baseline - PAD_TOP
  const slot = plotWidth / days.length
  // A 2px surface gap between neighbours, and never a bar wider than 24px —
  // the leftover is air, not fill.
  const barWidth = Math.max(3, Math.min(MAX_BAR, slot - 2))
  const yOf = (kcal: number) => baseline - (Math.min(kcal, top) / top) * plotHeight

  const bars: Bar[] = days.map((day, index) => ({
    date: day.date,
    kcal: day.logged ? day.kcal : null,
    x: PAD_LEFT + index * slot + (slot - barWidth) / 2,
    y: day.logged ? yOf(day.kcal) : baseline,
    width: barWidth,
  }))

  const ticks = [0.5, 1].map((share) => {
    const value = Math.round((share * top) / 250) * 250
    return { value, y: yOf(value) }
  })

  return {
    bars,
    baseline,
    targetY: targets ? yOf(targets.kcal) : null,
    band: targets
      ? {
          y: yOf(targets.kcal + targets.kcalBand),
          height: Math.max(2, yOf(targets.kcal - targets.kcalBand) - yOf(targets.kcal + targets.kcalBand)),
        }
      : null,
    ticks,
    loggedCount: logged.length,
    maxKcal: maxLogged,
    nearest: (x: number) => {
      const index = Math.floor((x - PAD_LEFT) / slot)
      return Math.max(0, Math.min(days.length - 1, index))
    },
  }
}

function ariaLabel(model: Model, targets: DietTargets | undefined): string {
  const target = targets ? ` The target is ${kcalText(targets.kcal)} kcal.` : ''
  return (
    `Calories per day over the last ${model.bars.length} days. ` +
    `${model.loggedCount} days were logged and ${model.bars.length - model.loggedCount} were not, ` +
    `and unlogged days are shown as gaps rather than zeroes.${target} ` +
    `The highest logged day was ${kcalText(model.maxKcal)} kcal. The numbers are in the table below.`
  )
}
