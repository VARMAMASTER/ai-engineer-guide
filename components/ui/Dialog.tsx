'use client'

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

/* ============================================================================
   Dialog — the modal overlay primitive, and the overlay engine Sheet shares.
   ----------------------------------------------------------------------------
   This generalises what components/BottomNav.tsx already proved in the More
   sheet: role="dialog" + aria-modal, Escape closes, aria-expanded on the
   trigger, and `:root[data-sheet="open"]` so the overlay is the ONLY blurred
   layer on screen. Everything that component does by hand lives in
   `useModalOverlay` below, with the three things it does not yet do added:
   a real focus trap, focus RETURN to the trigger, and a body scroll lock.

   Background inertness: `inert`, not `aria-hidden`.
     `aria-hidden` only removes a subtree from the accessibility tree. The
     elements underneath stay focusable, so Tab, a screen-reader's own focus
     commands, or a stray `.focus()` can land on a control the user cannot
     perceive — the classic "focus escaped the modal into nothing" bug.
     `inert` removes the subtree from the a11y tree AND makes it unfocusable
     and unclickable, which is the property we actually want. It is supported
     in every browser this app targets. jsdom parses the attribute but does not
     implement its behaviour, so the unit tests assert that it is applied to the
     right elements and removed again, not that focus bounces off it.

   Blur budget: the panel is the `.raised` tier (one blurred layer) and the
   scrim is a flat tint with NO backdrop blur. `data-sheet="open"` drops every
   `.panel` / `.card` behind it to solid, so exactly one blurred layer is up.
   ========================================================================== */

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

/**
 * Tabbable descendants of `root`, in document order.
 *
 * Deliberately does NOT filter on visibility. jsdom has no layout — every
 * element reports a zero box and a null offsetParent — so an `offsetParent`
 * or `getBoundingClientRect` filter would return an empty list under test and
 * make the whole trap vacuous. `hidden`, `disabled` and `tabindex="-1"` are
 * all readable from the DOM alone, and those are what actually mark a control
 * as out of the tab order in this app's overlays.
 */
function tabbableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.hasAttribute('disabled') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.closest('[hidden]') === null &&
      el.closest('[inert]') === null,
  )
}

/* --- body scroll lock, shared by every overlay on screen -------------------
   Refcounted: a dialog opened from inside a sheet must not unlock the body
   when the inner one closes. The saved styles are the literal inline values
   from before the first lock, so restoring writes back exactly what was there
   — usually the empty string, which removes the property rather than pinning
   it to a computed value. */
let lockDepth = 0
let savedScroll: {
  overflow: string
  position: string
  top: string
  left: string
  right: string
  width: string
  y: number
} | null = null

function lockBody() {
  lockDepth += 1
  if (lockDepth > 1) return
  const { style } = document.body
  const y = window.scrollY || window.pageYOffset || 0
  savedScroll = {
    overflow: style.overflow,
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
    y,
  }
  // `overflow: hidden` alone still lets iOS Safari rubber-band the page behind
  // the sheet, and loses the scroll offset when the address bar collapses.
  // Pinning the body and offsetting it by the current scroll is the only shape
  // that holds the page still AND can restore the exact position afterwards.
  style.overflow = 'hidden'
  style.position = 'fixed'
  style.top = `-${y}px`
  style.left = '0'
  style.right = '0'
  style.width = '100%'
  document.documentElement.setAttribute('data-sheet', 'open')
}

function unlockBody() {
  lockDepth = Math.max(0, lockDepth - 1)
  if (lockDepth > 0 || savedScroll === null) return
  const saved = savedScroll
  savedScroll = null
  const { style } = document.body
  style.overflow = saved.overflow
  style.position = saved.position
  style.top = saved.top
  style.left = saved.left
  style.right = saved.right
  style.width = saved.width
  document.documentElement.removeAttribute('data-sheet')
  // Un-pinning the body drops the page back to offset 0, so the saved offset
  // has to be put back by hand. Skipped when it was 0 — there is nothing to
  // restore, and jsdom logs a not-implemented error for every scrollTo call.
  if (saved.y !== 0) window.scrollTo(0, saved.y)
}

/* --- "are we on the client yet" -------------------------------------------- */
const subscribeNever = () => () => {}
const onTheClient = () => true
const onTheServer = () => false

/* --- overlay stack ---------------------------------------------------------
   Only the topmost overlay answers Escape and owns the trap; a dialog opened
   from a sheet must not close both. */
const stack: RefObject<HTMLDivElement | null>[] = []

export interface ModalOverlay {
  /** Attach to the overlay panel. Focus is moved here and trapped inside. */
  panelRef: RefObject<HTMLDivElement | null>
  /** True once mounted client-side and open — render the portal only then. */
  ready: boolean
}

/**
 * The modal overlay engine: portal readiness, focus in, focus trap, focus
 * return, Escape, background inertness, and the body scroll lock.
 *
 * Effect order in here is load-bearing. React tears effects down in the order
 * they were created, so the inert effect is declared BEFORE the focus effect:
 * its cleanup un-inerts the page first, and only then does the focus cleanup
 * call `.focus()` on the trigger. Reversed, the trigger would still be inside
 * an inert subtree and the focus call would be silently ignored in a real
 * browser — and jsdom, which ignores `inert` entirely, would never catch it.
 */
export function useModalOverlay(open: boolean, onClose: () => void): ModalOverlay {
  const panelRef = useRef<HTMLDivElement | null>(null)
  // There is no `document.body` to portal into on the server, so the overlay
  // renders nothing there. `useSyncExternalStore` with a server snapshot of
  // `false` is the way to say that without a setState-in-an-effect — and on a
  // plain client render it is already `true` in the first pass, so the panel
  // ref is populated before any of the effects below run.
  const mounted = useSyncExternalStore(subscribeNever, onTheClient, onTheServer)

  const ready = open && mounted

  // 1. Background inertness. Declared first so it is torn down first.
  useEffect(() => {
    if (!ready) return
    const marked = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !el.hasAttribute('data-overlay'),
    )
    for (const el of marked) el.setAttribute('inert', '')
    return () => {
      for (const el of marked) el.removeAttribute('inert')
    }
  }, [ready])

  // 2. Scroll lock + the single-blurred-layer switch.
  useEffect(() => {
    if (!ready) return
    lockBody()
    return unlockBody
  }, [ready])

  // 3. Escape and the Tab trap, on the document so they fire wherever focus is.
  useEffect(() => {
    if (!ready) return
    stack.push(panelRef)
    function onKeyDown(event: KeyboardEvent) {
      const panel = panelRef.current
      if (!panel || stack[stack.length - 1] !== panelRef) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const items = tabbableWithin(panel)
      const active = document.activeElement as HTMLElement | null

      // Nothing to tab to, or focus has escaped: pull it back to the panel.
      if (items.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      // Focus is on the panel itself (where it lands on open, tabindex="-1" so
      // it is not in the tab order). Sequential navigation from a container is
      // the one case browsers and jsdom disagree about, so it is explicit.
      if (active === panel || !active || !panel.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? items[items.length - 1] : items[0]).focus()
        return
      }
      if (event.shiftKey && active === items[0]) {
        event.preventDefault()
        items[items.length - 1].focus()
      } else if (!event.shiftKey && active === items[items.length - 1]) {
        event.preventDefault()
        items[0].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const at = stack.indexOf(panelRef)
      if (at !== -1) stack.splice(at, 1)
    }
  }, [ready, onClose])

  // 4. Focus in on open, and — the half everyone forgets — back to the trigger
  //    on close. Declared last so this cleanup runs after the un-inerting one.
  //
  //    Focus lands on the panel, not on its first control: the panel carries
  //    the accessible name and description, so a screen reader reads what this
  //    overlay IS before reading a button inside it, and we never guess wrong
  //    about which control the user wanted. Tab from there reaches the first
  //    control. A consumer that needs a field focused can move focus itself.
  useEffect(() => {
    if (!ready) return
    const panel = panelRef.current
    if (!panel) return
    const trigger = document.activeElement as HTMLElement | null
    panel.focus()
    return () => {
      if (
        trigger &&
        trigger !== document.body &&
        typeof trigger.focus === 'function' &&
        document.contains(trigger)
      ) {
        trigger.focus()
      }
    }
  }, [ready])

  return { panelRef, ready }
}

export interface DialogProps {
  /** Controlled: the consumer owns the open state and the trigger. */
  open: boolean
  /** Called on Escape, on a scrim click, and from the close button. */
  onClose: () => void
  /** Becomes the dialog's accessible name via aria-labelledby. Required. */
  title: string
  /** Optional supporting line, wired up with aria-describedby. */
  description?: string
  children?: ReactNode
  /** Actions row pinned under the body — usually one `.btn-accent`. */
  footer?: ReactNode
  /** Extra classes for the panel. */
  className?: string
  /** Label for the close button. Override when "Close" is ambiguous. */
  closeLabel?: string
  'data-testid'?: string
}

/**
 * A centred modal dialog.
 *
 * Renders through a portal on `document.body` so the rest of the page can be
 * marked `inert` as a flat list of siblings, and so no ancestor's `overflow`
 * or `transform` can clip or re-anchor it.
 *
 * The consumer owns the trigger and should give it
 * `aria-expanded` / `aria-haspopup="dialog"`; focus returns to whatever was
 * focused when the dialog opened, so no ref handoff is needed.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  closeLabel = 'Close',
  'data-testid': testId,
}: DialogProps) {
  const { panelRef, ready } = useModalOverlay(open, onClose)
  const titleId = useId()
  const descId = useId()

  if (!ready) return null

  return createPortal(
    <div data-overlay="" className="fixed inset-0 z-50">
      {/*
        The scrim is a flat tint, never blurred — a blurred scrim under a
        blurred panel spends the whole blur budget on the overlay alone. It is
        aria-hidden and unfocusable: Escape and the close button are the
        keyboard routes out, and a focusable scrim would add a phantom tab stop
        inside the trap.
      */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--ground)]/75 motion-safe:transition-opacity"
      />
      <div className="absolute inset-0 flex items-end justify-center overflow-y-auto p-3 md:items-center md:p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          data-testid={testId}
          className={[
            'raised relative my-auto w-full max-w-[32rem] p-4 focus:outline-none md:p-5',
            className ?? '',
          ]
            .join(' ')
            .trim()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="min-w-0">
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

          {children ? <div className="mt-3 min-w-0 text-sm">{children}</div> : null}

          {footer ? (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
