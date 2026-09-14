'use client'

import { useMemo, useState } from 'react'
import Skeleton from '@/components/ui/Skeleton'
import { diffDays } from '@/lib/diet/time'
import type { TrendPoint } from '@/lib/diet/trend'
import { kgText, shortDayLabel } from '../_lib/format'
import { useElementWidth } from '../_lib/useElementWidth'

/**
 * Weight: the readings, and the trend through them.
 *
 * FORM. This is an *emphasis* chart, not a two-series categorical one. The
 * trend is the subject — it is what every other number in Diet is computed
 * from — and the raw readings are the context it came out of. So the trend is a
 * 2px line in the accent hue and the readings are recessive gray dots.
 *
 * That choice is also what makes it safe. Run the two obvious series colours
 * (accent and muted text) through the palette validator as a categorical pair
 * and they FAIL: ΔE 11.9 to normal vision, below the 15 floor, because a
 * design system's accent and its muted ink are not built to be told apart as
 * data. Identity here is carried by MARK SHAPE — a continuous line against
 * discrete dots — plus a legend, which is a channel colour vision has nothing
 * to do with.
 *
 * SCALE. Drawn at 1:1 CSS pixels off a measured container rather than through
 * a scaled `viewBox`, so a 10px tick label is 10px at 390px and not 5px. The
 * x axis is by DATE, not by index: a gap of three weeks between two weigh-ins
 * has to look like three weeks, or the trend's own decay (`lib/diet/trend.ts`
 * widens alpha across a gap) reads as a cliff.
 *
 * The numbers are also available as a table beneath, because a chart is not an
 * accessible way to read a value and a screen reader gets nothing from a
 * polyline.
 */

export interface WeightChartProps {
  series: TrendPoint[]
  /** Rendered under the plot as the accessible alternative. */
  showTable?: boolean
}

const HEIGHT = 210
const PAD_LEFT = 38
// Room on the right for the one direct label ("72.4 kg" at 11px) rather than
// clipping it — a label that does not fit is moved, never cropped.
const PAD_RIGHT = 56
const PAD_TOP = 14
const PAD_BOTTOM = 26

export default function WeightChart({ series, showTable = true }: WeightChartProps) {
  const [box, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const model = useMemo(() => buildModel(series, width), [series, width])

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div ref={box} className="w-full">
        {width === 0 || !model ? (
          <Skeleton className="h-[210px] w-full" aria-hidden="true" />
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Legend />
              <p className="readout ml-auto text-[var(--text-muted)]" aria-live="polite">
                {hover !== null && model.points[hover]
                  ? `${shortDayLabel(model.points[hover].date)} · reading ${kgText(model.points[hover].weightKg)} kg · trend ${kgText(model.points[hover].trendKg)} kg`
                  : `${model.points.length} readings`}
              </p>
            </div>

            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label={`Weight over ${model.spanDays + 1} days. ${model.points.length} readings between ${kgText(model.minKg)} and ${kgText(model.maxKg)} kilograms, with the smoothed trend ending at ${kgText(model.last.trendKg)} kilograms.`}
              className="block touch-pan-y"
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                setHover(model.nearest(event.clientX - rect.left))
              }}
              onPointerLeave={() => setHover(null)}
            >
              {model.ticks.map((tick) => (
                <g key={tick.kg}>
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
                    {tick.label}
                  </text>
                </g>
              ))}

              {model.dateTicks.map((tick) => (
                <text
                  key={tick.date}
                  x={tick.x}
                  y={HEIGHT - 8}
                  textAnchor={tick.anchor}
                  fontSize={10}
                  fill="var(--text-faint)"
                >
                  {shortDayLabel(tick.date)}
                </text>
              ))}

              {hover !== null && model.points[hover] ? (
                <line
                  x1={model.points[hover].x}
                  x2={model.points[hover].x}
                  y1={PAD_TOP}
                  y2={HEIGHT - PAD_BOTTOM}
                  stroke="var(--accent-line)"
                  strokeWidth={1}
                />
              ) : null}

              {/* The readings: recessive, discrete, and ringed in the surface
                  colour so overlapping days stay countable. */}
              {model.points.map((point, index) => (
                <circle
                  key={`raw-${point.date}`}
                  cx={point.x}
                  cy={point.rawY}
                  r={model.dotRadius}
                  fill="var(--text-faint)"
                  stroke="var(--panel-solid)"
                  strokeWidth={2}
                  opacity={hover === null || hover === index ? 1 : 0.55}
                >
                  <title>{`${point.date}: ${kgText(point.weightKg)} kg`}</title>
                </circle>
              ))}

              {/* The trend: the subject of the chart. */}
              <polyline
                points={model.points.map((p) => `${p.x},${p.trendY}`).join(' ')}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={model.last.x}
                cy={model.last.trendY}
                r={4.5}
                fill="var(--accent)"
                stroke="var(--panel-solid)"
                strokeWidth={2}
              />
              {/* One direct label, on the end point. Never a number on every
                  point — that is chaos and goes unread. */}
              <text
                x={model.last.x + 8}
                y={model.last.trendY + 3}
                textAnchor="start"
                fontSize={11}
                fontWeight={600}
                fill="var(--text)"
              >
                {kgText(model.last.trendKg)} kg
              </text>
            </svg>
          </>
        )}
      </div>

      {showTable && series.length > 0 ? (
        <details className="text-sm">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-[var(--text-muted)]">
            Show the numbers
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Every weight reading and the trend after it</caption>
              <thead>
                <tr className="eyebrow">
                  <th scope="col" className="py-1 pr-3 font-medium">
                    Day
                  </th>
                  <th scope="col" className="py-1 pr-3 font-medium">
                    Reading
                  </th>
                  <th scope="col" className="py-1 font-medium">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="tnum">
                {[...series].reverse().map((point) => (
                  <tr key={point.date} className="border-t border-[var(--panel-border)]">
                    <td className="py-1.5 pr-3 text-[var(--text-muted)]">{point.date}</td>
                    <td className="py-1.5 pr-3 text-[var(--text)]">{kgText(point.weightKg)} kg</td>
                    <td className="py-1.5 text-[var(--text)]">{kgText(point.trendKg)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </figure>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      <li className="flex items-center gap-2">
        <svg width={18} height={10} aria-hidden="true" className="shrink-0">
          <circle cx={9} cy={5} r={3.5} fill="var(--text-faint)" />
        </svg>
        <span className="text-xs text-[var(--text-muted)]">Reading</span>
      </li>
      <li className="flex items-center gap-2">
        <svg width={18} height={10} aria-hidden="true" className="shrink-0">
          <line x1={1} y1={5} x2={17} y2={5} stroke="var(--accent)" strokeWidth={2} />
        </svg>
        <span className="text-xs text-[var(--text-muted)]">Trend (EWMA)</span>
      </li>
    </ul>
  )
}

interface PlotPoint extends TrendPoint {
  x: number
  rawY: number
  trendY: number
}

interface ChartModel {
  points: PlotPoint[]
  last: PlotPoint
  minKg: number
  maxKg: number
  spanDays: number
  dotRadius: number
  ticks: { kg: number; y: number; label: string }[]
  dateTicks: { date: string; x: number; anchor: 'start' | 'middle' | 'end' }[]
  nearest: (x: number) => number
}

function buildModel(series: TrendPoint[], width: number): ChartModel | null {
  if (series.length === 0 || width < 160) return null

  const values = series.flatMap((p) => [p.weightKg, p.trendKg])
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  // A flat week must not fill the plot with noise: pad a degenerate range out
  // to a full kilogram so a 200 g wobble reads as a 200 g wobble.
  const pad = Math.max((rawMax - rawMin) * 0.12, 0.5)
  const minKg = rawMin - pad
  const maxKg = rawMax + pad

  const first = series[0].date
  const lastDate = series[series.length - 1].date
  const spanDays = Math.max(diffDays(first, lastDate), 1)

  const plotWidth = width - PAD_LEFT - PAD_RIGHT
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  const xOf = (date: string) => PAD_LEFT + (diffDays(first, date) / spanDays) * plotWidth
  const yOf = (kg: number) => PAD_TOP + (1 - (kg - minKg) / (maxKg - minKg)) * plotHeight

  const points: PlotPoint[] = series.map((p) => ({
    ...p,
    x: xOf(p.date),
    rawY: yOf(p.weightKg),
    trendY: yOf(p.trendKg),
  }))

  const ticks = [0, 0.5, 1].map((share) => {
    const kg = minKg + share * (maxKg - minKg)
    return { kg, y: yOf(kg), label: kgText(kg) }
  })

  const dateTicks: ChartModel['dateTicks'] =
    series.length === 1
      ? [{ date: first, x: xOf(first), anchor: 'middle' as const }]
      : [
          { date: first, x: PAD_LEFT, anchor: 'start' as const },
          { date: lastDate, x: width - PAD_RIGHT, anchor: 'end' as const },
        ]

  return {
    points,
    last: points[points.length - 1],
    minKg: rawMin,
    maxKg: rawMax,
    spanDays,
    // Many readings crowd: shrink the dot rather than let the plot turn into a
    // solid band. The 2px surface ring keeps them countable either way.
    dotRadius: series.length > 45 ? 2.5 : 4,
    ticks,
    dateTicks,
    nearest: (x: number) => {
      let best = 0
      let bestDistance = Infinity
      for (let i = 0; i < points.length; i += 1) {
        const distance = Math.abs(points[i].x - x)
        if (distance < bestDistance) {
          bestDistance = distance
          best = i
        }
      }
      return best
    },
  }
}
