'use client'

import { useId, useState, type ReactNode } from 'react'

/* ============================================================================
   Tabs — tablist / tab / tabpanel with a roving tabindex.
   ----------------------------------------------------------------------------
   Activation is AUTOMATIC by default: an arrow key moves focus and selects in
   the same stroke. Every panel is already mounted (see below), so following
   focus costs nothing and the user hears the panel they landed on without a
   second keystroke — which is what the ARIA practices recommend whenever
   showing a panel is cheap.

   `activation="manual"` is there for the case that makes automatic wrong: a
   panel that fetches, or one heavy enough that arrowing past it would kick off
   work nobody asked for. In manual mode the arrows move focus only and Enter
   or Space selects — and because tabs are real <button>s, that comes from the
   platform rather than from a key handler.

   Roving tabindex: exactly one tab is in the page's tab order at a time, so
   Tab moves INTO the tablist, then straight OUT of it to the panel, rather
   than walking through sixteen section tabs on the way down the page.

   Every panel stays mounted, inactive ones with `hidden`. Two reasons: an
   `aria-controls` that points at an element which is not in the document is a
   dangling reference, and panel state (a scroll position, a half-typed note)
   survives a trip to another tab.
   ========================================================================== */

export interface TabItem {
  /** Stable id — also the value reported by `onChange`. */
  id: string
  label: ReactNode
  content: ReactNode
  /** Skipped by the arrow keys and not activatable. */
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  /** Accessible name for the tablist. Required — an unnamed tablist is noise. */
  label: string
  /** Controlled selection. Omit to let Tabs own it. */
  value?: string
  /** Initial selection when uncontrolled. Defaults to the first enabled tab. */
  defaultValue?: string
  onChange?: (id: string) => void
  /** See the note above. Default `automatic`. */
  activation?: 'automatic' | 'manual'
  className?: string
  'data-testid'?: string
}

export default function Tabs({
  items,
  label,
  value,
  defaultValue,
  onChange,
  activation = 'automatic',
  className,
  'data-testid': testId,
}: TabsProps) {
  const base = useId()
  const firstEnabled = items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? ''

  const [ownValue, setOwnValue] = useState(defaultValue ?? firstEnabled)
  const selected = value ?? ownValue

  // The tab that holds the single tabindex="0". It follows selection, and in
  // manual mode it also follows focus. Synced during render rather than in an
  // effect so the tab order is never wrong for a frame — the same shape
  // BottomNav uses to close itself on navigation.
  const [roving, setRoving] = useState(selected)
  const [lastSelected, setLastSelected] = useState(selected)
  if (lastSelected !== selected) {
    setLastSelected(selected)
    setRoving(selected)
  }
  const rovingId = items.some((item) => item.id === roving) ? roving : selected

  const tabId = (id: string) => `${base}-tab-${id}`
  const panelId = (id: string) => `${base}-panel-${id}`

  function select(id: string) {
    if (value === undefined) setOwnValue(id)
    setRoving(id)
    if (id !== selected) onChange?.(id)
  }

  function focusTab(id: string) {
    setRoving(id)
    // `useId` values contain characters a CSS selector would have to escape, so
    // this looks the element up by id rather than through querySelector.
    document.getElementById(tabId(id))?.focus()
    if (activation === 'automatic') select(id)
  }

  function move(from: string, step: number) {
    const enabled = items.filter((item) => !item.disabled)
    if (enabled.length === 0) return
    const at = Math.max(
      0,
      enabled.findIndex((item) => item.id === from),
    )
    // A wrap, not a clamp: the ends of a tablist are joined.
    const next = (at + step + enabled.length) % enabled.length
    focusTab(enabled[next].id)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, id: string) {
    const enabled = items.filter((item) => !item.disabled)
    switch (event.key) {
      // Horizontal tablist: Left/Right only. Up/Down are left to the page so
      // arrowing a tab strip can never swallow a scroll.
      case 'ArrowRight':
        event.preventDefault()
        move(id, 1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        move(id, -1)
        break
      case 'Home':
        event.preventDefault()
        if (enabled[0]) focusTab(enabled[0].id)
        break
      case 'End':
        event.preventDefault()
        if (enabled.length > 0) focusTab(enabled[enabled.length - 1].id)
        break
      default:
        break
    }
  }

  return (
    <div className={['min-w-0', className ?? ''].join(' ').trim()} data-testid={testId}>
      <div
        role="tablist"
        aria-label={label}
        // Horizontal scroll rather than a wrap: at 390px a six-tab strip that
        // wraps to three rows pushes the panel below the fold.
        className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {items.map((item) => {
          const isSelected = item.id === selected
          return (
            <button
              key={item.id}
              type="button"
              id={tabId(item.id)}
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId(item.id)}
              tabIndex={item.id === rovingId ? 0 : -1}
              disabled={item.disabled}
              data-active={isSelected}
              onClick={() => select(item.id)}
              onKeyDown={(event) => onKeyDown(event, item.id)}
              className="chip shrink-0"
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          id={panelId(item.id)}
          role="tabpanel"
          aria-labelledby={tabId(item.id)}
          hidden={item.id !== selected}
          // A panel whose content is plain text is otherwise unreachable: a
          // keyboard user could not scroll it. tabindex="0" makes it a stop.
          tabIndex={0}
          className="mt-3 min-w-0 focus-visible:outline-2"
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
