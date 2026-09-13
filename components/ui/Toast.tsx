'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

/* ============================================================================
   Toast — a transient message that announces itself and never takes focus.
   ----------------------------------------------------------------------------
   The live region is on the VIEWPORT, not on the toast.

   A live region has to be in the document before the text lands inside it. If
   the element carrying `aria-live` is itself inserted along with its message,
   several screen readers register the region and announce nothing — the change
   happened before anything was listening. So `ToastProvider` mounts two empty
   regions for the life of the app and drops each toast into the one that
   matches its urgency:

     role="status"  aria-live="polite"      everything normal — waits its turn
     role="alert"   aria-live="assertive"   errors — interrupts

   Two regions rather than one with a switched politeness, because changing
   `aria-live` on a live region is another thing assistive tech is not required
   to notice.

   Focus is never moved. A toast that stole focus would yank a user out of the
   field they were typing in, and there is nothing here that must be acted on
   — which is also why `action` is optional and why every toast can be
   dismissed from the keyboard by tabbing to its close button.
   ========================================================================== */

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastOptions {
  message: string
  /** `error` announces assertively through `role="alert"`. Default `info`. */
  tone?: ToastTone
  /** Milliseconds before it dismisses itself. `null` keeps it up. Default 5000. */
  duration?: number | null
  /** One optional inline action — Undo, Retry, View. */
  action?: { label: string; onClick: () => void }
}

interface ToastRecord extends ToastOptions {
  id: string
}

export interface ToastApi {
  /** Shows a toast and returns its id. */
  show: (options: ToastOptions) => string
  /** Dismisses one toast early. */
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** The toast API. Throws outside a `ToastProvider` rather than failing silently. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (api === null) throw new Error('useToast must be used inside a <ToastProvider>')
  return api
}

/* No `document.body` on the server; same shape Dialog uses. */
const subscribeNever = () => () => {}
const onTheClient = () => true
const onTheServer = () => false

const DEFAULT_DURATION = 5000

export interface ToastProps {
  message: string
  tone?: ToastTone
  /** Rendered when present; omit for a toast that only reports. */
  action?: { label: string; onClick: () => void }
  onDismiss?: () => void
  /** Milliseconds. `null` disables auto-dismiss. Default 5000. */
  duration?: number | null
  dismissLabel?: string
  'data-testid'?: string
}

/**
 * One toast.
 *
 * Presentational on purpose: it carries no `aria-live` of its own, because the
 * region it is dropped into already has one (see the header). Rendering a
 * `<Toast>` outside a `ToastProvider` shows the message but does not announce
 * it — put it inside your own live region if you do that.
 *
 * Auto-dismiss pauses while the pointer is over the toast or while focus is
 * inside it, and RESUMES from where it stopped rather than restarting: a user
 * who tabbed in to read a message should not be given the full five seconds
 * again every time they tab back out.
 */
export default function Toast({
  message,
  tone = 'info',
  action,
  onDismiss,
  duration = DEFAULT_DURATION,
  dismissLabel = 'Dismiss',
  'data-testid': testId,
}: ToastProps) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(duration ?? 0)
  // Read through a ref so an inline `onDismiss` from the parent cannot restart
  // the clock on every render of the list.
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  })

  useEffect(() => {
    if (paused || duration === null) return
    const startedAt = Date.now()
    const timer = window.setTimeout(() => dismissRef.current?.(), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt))
    }
  }, [paused, duration])

  return (
    <div
      data-testid={testId}
      data-tone={tone}
      // Hover and focus both hold the clock. `onFocus`/`onBlur` are React's
      // bubbling focusin/focusout, so they fire for the buttons inside too.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={[
        'raised pointer-events-auto flex min-w-0 items-start gap-2 p-3 text-sm',
        'motion-safe:transition-opacity',
        tone === 'error' ? 'border-[var(--danger)]' : '',
      ]
        .join(' ')
        .trim()}
    >
      <span
        aria-hidden="true"
        className={[
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          tone === 'error'
            ? 'bg-[var(--danger)]'
            : tone === 'success'
              ? 'bg-[var(--positive)]'
              : 'bg-[var(--accent)]',
        ].join(' ')}
      />
      <p className="min-w-0 flex-1 py-1 text-[var(--text)]">{message}</p>

      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="btn btn-quiet shrink-0 px-3 text-xs"
        >
          {action.label}
        </button>
      ) : null}

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="btn btn-quiet min-w-11 shrink-0 px-0"
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
      ) : null}
    </div>
  )
}

export interface ToastProviderProps {
  children?: ReactNode
  /** Oldest toasts are dropped past this many. Default 4. */
  limit?: number
}

/**
 * Mounts the two live regions and provides `useToast`.
 *
 * The viewport is portalled onto `document.body` and tagged `data-overlay`, so
 * `useModalOverlay` leaves it out when it marks the page inert: a toast fired
 * while a dialog is open still announces. It is still outside the dialog's
 * focus trap, so Tab cannot wander into it from inside the dialog — a mouse
 * can reach it, a trapped keyboard cannot, which is the right trade for a
 * message that is by definition not the modal task.
 */
export function ToastProvider({ children, limit = 4 }: ToastProviderProps) {
  const mounted = useSyncExternalStore(subscribeNever, onTheClient, onTheServer)
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      seq.current += 1
      const id = `toast-${seq.current}`
      setToasts((current) => [...current, { ...options, id }].slice(-limit))
      return id
    },
    [limit],
  )

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss])

  const polite = toasts.filter((t) => t.tone !== 'error')
  const assertive = toasts.filter((t) => t.tone === 'error')

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted
        ? createPortal(
            <div
              data-overlay=""
              data-testid="toast-viewport"
              // Above the tab bar on a phone, bottom-right from `md:` up. The
              // viewport itself never eats a click; the toasts inside do.
              className={[
                'pointer-events-none fixed inset-x-2 z-[60] flex flex-col gap-2',
                'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]',
                'md:right-4 md:bottom-4 md:left-auto md:w-[22rem]',
              ].join(' ')}
            >
              {/* Both regions are mounted for the life of the app, empty or
                  not. That is the whole point — see the header. */}
              {/* Not `display: contents`: a live region that is removed from
                  the box tree has a long history of falling out of the
                  accessibility tree with it. A real flex column costs nothing
                  — an empty region is zero pixels tall. */}
              <div
                role="status"
                aria-live="polite"
                aria-atomic="false"
                className="flex flex-col gap-2"
              >
                {polite.map((t) => (
                  <Toast
                    key={t.id}
                    message={t.message}
                    tone={t.tone}
                    action={t.action}
                    duration={t.duration}
                    onDismiss={() => dismiss(t.id)}
                  />
                ))}
              </div>
              <div
                role="alert"
                aria-live="assertive"
                aria-atomic="false"
                className="flex flex-col gap-2"
              >
                {assertive.map((t) => (
                  <Toast
                    key={t.id}
                    message={t.message}
                    tone={t.tone}
                    action={t.action}
                    duration={t.duration}
                    onDismiss={() => dismiss(t.id)}
                  />
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  )
}
