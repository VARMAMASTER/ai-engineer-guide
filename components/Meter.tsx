interface Props {
  label: string
  done: number
  target: number
}

/**
 * Accent fill on a low-contrast track, with the value always spelled out in
 * monospace beside it. A bar on its own is not an answer.
 */
export default function Meter({ label, done, target }: Props) {
  const pct = target === 0 ? 0 : Math.min(100, Math.round((done / target) * 100))
  const complete = target > 0 && done >= target

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm text-[var(--text-muted)]">{label}</span>
        <span
          className="readout shrink-0"
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
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--track)]"
      >
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: complete ? 'var(--positive)' : 'var(--accent)',
          }}
        />
      </div>
    </div>
  )
}
