'use client'

import { useEffect, useState } from 'react'

/**
 * Tells you when the app has updated underneath you, and offers to reload.
 *
 * Why this is needed at all: navigations are served stale-while-revalidate, so
 * a visit immediately after a deploy renders the CACHED page and fetches the
 * new one in the background. That is what makes the app open instantly and work
 * offline, and it is the right trade — but it means new work is invisible until
 * the next load, with nothing on screen saying so. Installed on a phone, where
 * the app is rarely fully reloaded, a build can stay hidden for days. The owner
 * hit exactly this: three new sections were live, deployed and reachable, and
 * their phone kept painting the previous shell.
 *
 * The signal is `controllerchange`, which fires when a new worker takes over
 * the page — `sw.js` calls `skipWaiting()` and `clients.claim()`, so the new
 * worker claims this page while it is still running the old HTML. That moment
 * is precisely "there is a newer version than the one you are looking at".
 *
 * The first-registration case is excluded deliberately. On a first-ever visit
 * there is no controller, `claim()` fires `controllerchange` anyway, and
 * prompting a first-time visitor to reload the page they just opened would be
 * nonsense. `navigator.serviceWorker.controller` is null in exactly that case,
 * captured before any listener is attached.
 *
 * Nothing is forced. A reload mid-task loses whatever is on screen — a
 * half-written log entry, a revision card — so this asks rather than acts, and
 * stays dismissible.
 */
export default function UpdatePrompt() {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    // No controller means this page loaded before any worker existed, so the
    // claim that follows is a first install, not an update.
    const hadController = Boolean(navigator.serviceWorker.controller)
    if (!hadController) return

    function onControllerChange() {
      setReady(true)
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  if (!ready || dismissed) return null

  return (
    <div
      // `status` rather than `alert`: a new version is worth saying, not worth
      // interrupting. It must never steal focus from whatever is being typed.
      role="status"
      aria-live="polite"
      data-testid="update-prompt"
      className="raised fixed inset-x-3 bottom-24 z-40 flex min-w-0 items-center gap-3 rounded-[var(--radius)] p-3 md:inset-x-auto md:right-6 md:bottom-6 md:w-80"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-[var(--text)]">A new version is ready</span>
        <span className="hint">Reload to pick up the latest changes.</span>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn btn-accent shrink-0 px-3 text-[0.8125rem]"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss the update notice"
        className="btn btn-quiet min-h-11 min-w-11 shrink-0 px-0"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}
