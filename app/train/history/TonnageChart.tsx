import { formatKg } from '../labels'

export interface WeekRow {
  weekStart: string
  tonnage: number
  sessionCount: number
  plannedDays: number
}

/** `2026-09-08` -> `8 Sep`. Short enough for eight x-labels at 390px. */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${Number(day)} ${months[Number(month) - 1] ?? month}`
}

/**
 * Tonnage — load times reps, summed — over the last eight weeks.
 *
 * Columns rather than a line: the weeks are discrete buckets, and a line
 * between them implies a value on Wednesday that nobody measured. One series,
 * one colour, so no legend; only the current week is direct-labelled, because a
 * number on every column is the chaos that makes direct labels stop working.
 * The rest are in the table underneath, which is the chart's WCAG-clean twin
 * rather than a fallback — no value here is reachable only by looking.
 *
 * Tonnage is shown BESIDE set counts, never instead of them: it moves whenever
 * load moves, so it flatters a heavy low-volume week and punishes a deload.
 * It is a workload number, not a progress number, and the caption says so.
 */
export default function TonnageChart({ weeks }: { weeks: WeekRow[] }) {
  const max = Math.max(1, ...weeks.map((week) => week.tonnage))
  const current = weeks[weeks.length - 1]

  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="train-tonnage">
      <figcaption className="flex min-w-0 flex-col gap-1">
        <h2 className="eyebrow">Weekly tonnage</h2>
        <p className="hint">
          Load &times; reps, summed. A workload number rather than a progress one — it rises with
          heavier work and falls on a deload, both of which can be the right week.
        </p>
      </figcaption>

      <div className="flex items-end gap-1.5" role="presentation">
        {weeks.map((week) => {
          const height = (week.tonnage / max) * 100
          const isCurrent = week.weekStart === current?.weekStart
          return (
            <div key={week.weekStart} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="readout h-4 text-[0.6875rem] text-[var(--text-muted)] tabular-nums">
                {isCurrent && week.tonnage > 0 ? Math.round(week.tonnage).toLocaleString('en-GB') : ''}
              </span>
              <span className="flex h-24 w-full max-w-6 items-end">
                <span
                  className="w-full rounded-t-[4px] bg-[var(--accent)]"
                  style={{ height: `${Math.max(week.tonnage > 0 ? 2 : 0, height)}%` }}
                  title={`${shortDate(week.weekStart)}: ${formatKg(week.tonnage)}`}
                />
              </span>
              <span className="truncate text-[0.6875rem] text-[var(--text-faint)]">
                {shortDate(week.weekStart)}
              </span>
            </div>
          )
        })}
      </div>

      <details className="text-sm">
        <summary className="chip inline-flex cursor-pointer">Table view</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--text-muted)]">
              <tr>
                <th scope="col" className="py-1 pr-4 font-normal">
                  Week beginning
                </th>
                <th scope="col" className="py-1 pr-4 font-normal">
                  Sessions
                </th>
                <th scope="col" className="py-1 font-normal">
                  Tonnage
                </th>
              </tr>
            </thead>
            <tbody className="readout tabular-nums">
              {weeks.map((week) => (
                <tr key={week.weekStart} className="border-t border-[var(--panel-border)]">
                  <td className="py-1 pr-4">{week.weekStart}</td>
                  <td className="py-1 pr-4">
                    {week.sessionCount} / {week.plannedDays}
                  </td>
                  <td className="py-1">{formatKg(week.tonnage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
