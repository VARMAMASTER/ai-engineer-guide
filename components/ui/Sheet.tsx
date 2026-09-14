'use client'

import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalOverlay } from './Dialog'

/* ============================================================================
   Sheet — a modal panel anchored to the bottom edge.
   ----------------------------------------------------------------------------
   role="dialog" + aria-modal, Escape, the `data-sheet="open"` blur switch, the
   `.raised` tier, inset-x-2 / safe-area geometry. It shares Dialog's
   `useModalOverlay`, so it also gets a focus trap, focus return to the trigger,
   and a body scroll lock.

   It generalises the More sheet the nav used to carry. That sheet is gone — the
   two-level nav gives every section a home, so there is nothing left to
   overflow — and this is the surface anything else modal and bottom-anchored
   should be built on.

   390px is the primary case: the panel is full width minus a gutter, its body
   scrolls internally rather than growing past the viewport, and it sits above
   `env(safe-area-inset-bottom)` so the home indicator never covers a row.
   ========================================================================== */

export interface SheetProps {
  /** Controlled: the consumer owns the open state and the trigger. */
  open: boolean
  /** Called on Escape, on a scrim click, and from the close button. */
  onClose: () => void
  /** Becomes the sheet's accessible name via aria-labelledby. Required. */
  title: string
  /** Keep the title as the accessible name but take it off screen. */
  titleHidden?: boolean
  /** Optional supporting line, wired up with aria-describedby. */
  description?: string
  children?: ReactNode
  /** Actions row pinned under the body. */
  footer?: ReactNode
  /** Extra classes for the panel. */
  className?: string
  /** Label for the close button. */
  closeLabel?: string
  'data-testid'?: string
}

/**
 * A bottom sheet.
 *
 * The consumer owns the trigger and should give it `aria-expanded` and
 * `aria-controls`; focus returns to whatever was focused when the sheet
 * opened, so no ref handoff is needed.
 */
export default function Sheet({
  open,
  onClose,
  title,
  titleHidden = false,
  description,
  children,
  footer,
  className,
  closeLabel = 'Close',
  'data-testid': testId,
}: SheetProps) {
  const { panelRef, ready } = useModalOverlay(open, onClose)
  const titleId = useId()
  const descId = useId()

  if (!ready) return null

  return createPortal(
    <div data-overlay="" className="fixed inset-0 z-50">
      {/* Flat tint, never blurred: the panel is the one blurred layer. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--ground)]/75 motion-safe:transition-opacity"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        data-testid={testId}
        className={[
          'raised absolute inset-x-2 bottom-2 flex max-h-[85vh] flex-col p-3',
          'pb-[calc(0.75rem+env(safe-area-inset-bottom))] focus:outline-none',
          'md:inset-x-auto md:right-3 md:bottom-3 md:left-auto md:w-[26rem]',
          className ?? '',
        ]
          .join(' ')
          .trim()}
      >
        {/* Decorative grabber. There is no drag gesture behind it — it is the
            affordance that says "this panel is anchored here", nothing more. */}
        <div
          aria-hidden="true"
          className="mx-auto mb-2 h-1 w-9 shrink-0 rounded-full bg-[var(--track)]"
        />

        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className={titleHidden ? 'sr-only' : 'min-w-0'}>
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-[var(--text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="btn btn-quiet -mt-1 -mr-1 min-w-11 shrink-0 px-0"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
              <path
                d="M5 5l10 10M15 5L5 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* The body scrolls, not the page: the sheet never grows past 85vh. */}
        {children ? (
          <div className="mt-2 min-w-0 flex-1 overflow-y-auto overscroll-contain text-sm">
            {children}
          </div>
        ) : null}

        {footer ? (
          <div className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
