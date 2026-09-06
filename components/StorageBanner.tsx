'use client'

import { useState, useSyncExternalStore } from 'react'
import { storageAvailable } from '@/lib/progress/storage'

const noop = () => () => {}
const isBlocked = () => !storageAvailable()
const notBlockedOnServer = () => false

/**
 * Shown only when localStorage is blocked. The store keeps working in memory,
 * so the message tells the user what to do about it rather than apologising.
 */
export default function StorageBanner() {
  const blocked = useSyncExternalStore(noop, isBlocked, notBlockedOnServer)
  const [dismissed, setDismissed] = useState(false)

  if (!blocked || dismissed) return null

  return (
    <div
      role="status"
      data-testid="storage-banner"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[var(--warning)] bg-[var(--panel-solid)] px-4 py-2 text-sm"
    >
      <span>
        <span className="readout mr-2 text-[var(--warning)]">NOT SAVING</span>
        This browser is blocking storage. Export your progress before you close the tab.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="min-h-11 shrink-0 px-2 text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--text)]"
      >
        Dismiss
      </button>
    </div>
  )
}
