interface Props {
  label: string
  done: number
  target: number
}

/**
 * Accent fill on a recessed track, with the value always spelled out in
 * monospace beside it. A bar on its own is not an answer.
 *
 * The value is tabular so a meter that ticks from 9 to 10 does not shove its
 * own label sideways, and the target is set faint against a solid figure so
 * the eye lands on the number that changed. Track and fill are the shared
 * `.meter-*` classes — every meter in the app is the same object.
 */
export default function Meter({ label, done, target }: Props) {
  const pct = target === 0 ? 0 : Math.min(100, Math.round((done / target) * 100))
  const complete = target > 0 && done >= target

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-[var(--text-muted)]">{label}</span>
        <span
          className="readout shrink-0 font-medium"
          style={{ color: complete ? 'var(--positive)' : 'var(--text)' }}
        >
          {done}
          <span className="text-[var(--text-faint)]">/{target}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={label}
        className="meter-track"
      >
        <div
          className="meter-fill"
          data-complete={complete ? 'true' : 'false'}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
