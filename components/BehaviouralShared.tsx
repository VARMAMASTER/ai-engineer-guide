'use client'

import type { BehaviouralPrinciple } from '@/lib/content/schema'

export type PrincipleCompany = BehaviouralPrinciple['company']

/**
 * Rail order for the four principle groups.
 *
 * Amazon first because it is the only loop that scores a named principle in
 * every single round, and `general` last because it is the catch-all rather
 * than a company.
 */
export const COMPANY_ORDER: readonly PrincipleCompany[] = ['amazon', 'google', 'meta', 'general']

export const COMPANY_LABEL: Record<PrincipleCompany, string> = {
  amazon: 'Amazon',
  google: 'Google',
  meta: 'Meta',
  general: 'General',
}

/** Full-sentence lists, capped to a readable measure. Same rule as the LLD pages. */
export function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex min-w-0 max-w-[78ch] flex-col gap-1.5 pl-5 text-sm">
      {items.map((item) => (
        <li key={item} className="list-disc marker:text-[var(--text-faint)]">
          {item}
        </li>
      ))}
    </ul>
  )
}

/** A static label pill. Solid, never glass — these sit inside panels. */
export function Pill({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode
  tone?: 'muted' | 'accent'
}) {
  return (
    <span
      className="readout rounded-full px-2 py-0.5"
      style={
        tone === 'accent'
          ? { backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }
          : { backgroundColor: 'var(--track)', color: 'var(--text-muted)' }
      }
    >
      {children}
    </span>
  )
}

export interface FilterOption<T extends string> {
  value: T
  label: string
  count?: number
}

/**
 * A single-select chip row.
 *
 * Chips rather than a `<select>` because the option set is small and the
 * counts matter: "Amazon 16" tells you how much of the bank you are about to
 * look at, which a collapsed dropdown cannot.
 */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly FilterOption<T>[]
  value: T
  onChange: (next: T) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <div role="group" aria-label={label} className="flex min-w-0 flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              data-active={active ? 'true' : 'false'}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors data-[active=false]:border-[var(--panel-border)] data-[active=false]:text-[var(--text-muted)] data-[active=false]:hover:border-[var(--accent-line)] data-[active=false]:hover:text-[var(--text)] data-[active=true]:border-[var(--accent-line)] data-[active=true]:bg-[var(--accent-soft)] data-[active=true]:text-[var(--accent)]"
            >
              {o.label}
              {o.count === undefined ? null : (
                <span className="readout text-[var(--text-faint)]">{o.count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
