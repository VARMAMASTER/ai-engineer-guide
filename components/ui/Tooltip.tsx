'use client'

import { Children, cloneElement, useEffect, useId, useState, type ReactElement } from 'react'

/* ============================================================================
   Tooltip — supplementary text on hover AND on keyboard focus.
   ----------------------------------------------------------------------------
   A tooltip is never the only place information lives.

   It cannot be reached by touch, it cannot be reached by anyone reading with
   the pointer parked elsewhere, and it disappears the moment attention moves.
   So: put the meaning in the label, the hint text, or the row itself, and use
   a tooltip for the extra sentence that is nice to have. If removing the
   tooltip would make the control unusable, the tooltip is the bug.

   In particular, this sets `aria-describedby`, not `aria-labelledby`: it
   DESCRIBES a control that already has a name. An icon-only button still needs
   its own `aria-label` — the tooltip does not supply one, because a screen
   reader user who never triggers hover or focus on that control would
   otherwise meet an unnamed button.

   The three behaviours the WAI practices require of a tooltip, and where each
   one is:
     - keyboard triggerable  `onFocus` on the wrapper (focusin bubbles)
     - dismissible           Escape, without moving focus off the trigger
     - hoverable             the bubble sits inside the wrapper and the gap
                             above the trigger is the bubble's own padding, so
                             the pointer never crosses a dead zone on the way
                             there and the tooltip does not vanish mid-read
   ========================================================================== */

export interface TooltipProps {
  /** The supplementary text. Keep it to a sentence. */
  label: string
  /** Exactly one focusable element — the trigger. */
  children: ReactElement
  /** Which side of the trigger the bubble sits on. Default `top`. */
  placement?: 'top' | 'bottom'
}

export default function Tooltip({ label, children, placement = 'top' }: TooltipProps) {
  const tipId = useId()
  const [open, setOpen] = useState(false)
  // Escape means "I have read it, go away" — and it has to stay away while the
  // trigger is still focused, or the next render simply puts it back.
  const [dismissed, setDismissed] = useState(false)
  const shown = open && !dismissed

  useEffect(() => {
    if (!shown) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      // Not `preventDefault`: a tooltip inside a dialog must let Escape keep
      // travelling if there is nothing to dismiss, and the dialog's own
      // handler runs on the same event. Dismissing the tooltip first is the
      // shallower action, which is the one Escape should reach first.
      event.stopPropagation()
      setDismissed(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [shown])

  const child = Children.only(children) as ReactElement<{ 'aria-describedby'?: string }>
  const trigger = cloneElement(child, {
    'aria-describedby': shown ? tipId : child.props['aria-describedby'],
  })

  function show() {
    setOpen(true)
  }

  function hide() {
    setOpen(false)
    setDismissed(false)
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      // focusin / focusout: these fire for the trigger inside, which is the
      // whole point — a tooltip that only answers the mouse is half a tooltip.
      onFocus={show}
      onBlur={hide}
    >
      {trigger}
      {shown ? (
        <span
          // The gap between bubble and trigger is padding on this wrapper, not
          // a margin, so hovering across it never leaves the tooltip's subtree.
          className={[
            'pointer-events-auto absolute left-1/2 z-50 flex -translate-x-1/2 justify-center',
            placement === 'top' ? 'bottom-full pb-2' : 'top-full pt-2',
          ].join(' ')}
        >
          <span
            role="tooltip"
            id={tipId}
            className={[
              'raised w-max max-w-[min(16rem,calc(100vw-2rem))] px-2.5 py-1.5',
              'text-xs leading-snug text-[var(--text)] motion-safe:transition-opacity',
            ].join(' ')}
          >
            {label}
          </span>
        </span>
      ) : null}
    </span>
  )
}
