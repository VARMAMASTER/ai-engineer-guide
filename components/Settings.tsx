'use client'

import { useRef, useState } from 'react'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import { addDays, mostRecentMonday, todayIso } from '@/lib/date'

/**
 * Four independent sections: start date, export, import, reset. Each owns
 * its own local UI state (confirmations, messages) so a mistake in one
 * never bleeds into another.
 */
export default function Settings() {
  const hydrated = useHydrated()
  const startDate = useProgress((s) => s.startDate)
  const setStartDate = useProgress((s) => s.setStartDate)
  const exportBlob = useProgress((s) => s.exportBlob)
  const importBlob = useProgress((s) => s.importBlob)
  const reset = useProgress((s) => s.reset)

  const [importError, setImportError] = useState<string | null>(null)
  const [importOk, setImportOk] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const recentMonday = mostRecentMonday(todayIso())
  const nextMonday = addDays(recentMonday, 7)

  function handleExport() {
    const json = exportBlob()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-engineer-guide-progress-${todayIso()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportOk(false)
    try {
      const text = await file.text()
      importBlob(text)
      setImportOk(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import this file.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleResetClick() {
    setConfirmingReset(true)
  }

  function handleResetConfirm() {
    reset()
    setConfirmingReset(false)
  }

  function handleResetCancel() {
    setConfirmingReset(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1>Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Manage your start date and your progress data.
        </p>
      </header>

      <section className="panel flex flex-col gap-3 p-4 md:p-5">
        <h2 className="eyebrow">Start date</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStartDate(recentMonday)}
            disabled={!hydrated}
            className="btn btn-quiet readout"
          >
            {recentMonday}
          </button>
          <button
            type="button"
            onClick={() => setStartDate(nextMonday)}
            disabled={!hydrated}
            className="btn btn-quiet readout"
          >
            {nextMonday}
          </button>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Day 1 must be a Monday so the weekly rhythm lines up.
        </p>
        {hydrated && startDate ? (
          <p className="readout text-[var(--text-faint)]">Current start date: {startDate}</p>
        ) : null}
      </section>

      <section className="panel flex flex-col gap-3 p-4 md:p-5">
        <h2 className="eyebrow">Export progress</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Download a JSON file with everything you have checked off, your logged hours, and your
          start date.
        </p>
        <div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!hydrated}
            className="btn btn-quiet"
          >
            Export progress
          </button>
        </div>
      </section>

      <section className="panel flex flex-col gap-3 p-4 md:p-5">
        <h2 className="eyebrow">Import progress</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Restore progress from a previously exported file. This replaces what is currently
          stored.
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="import-progress-input" className="text-sm text-[var(--text)]">
            Import progress file
          </label>
          <input
            id="import-progress-input"
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportChange}
            disabled={!hydrated}
            className="text-sm text-[var(--text-muted)] file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-[var(--radius-sm)] file:border file:border-[var(--panel-border)] file:bg-[var(--panel-solid)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--text)]"
          />
        </div>
        {importError ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {importError}
          </p>
        ) : null}
        {importOk ? (
          <p role="status" className="text-sm text-[var(--positive)]">
            Progress imported.
          </p>
        ) : null}
      </section>

      <section className="panel flex flex-col gap-3 p-4 md:p-5">
        <h2 className="eyebrow">Reset progress</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Erases your start date, completed items, and logged hours. This cannot be undone —
          export first if you want a copy.
        </p>
        {confirmingReset ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--warning)]">Are you sure?</span>
            <button
              type="button"
              onClick={handleResetConfirm}
              className="btn btn-danger"
            >
              Yes, erase everything
            </button>
            <button
              type="button"
              onClick={handleResetCancel}
              className="btn btn-quiet"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={handleResetClick}
              disabled={!hydrated}
              className="btn btn-quiet"
            >
              Reset progress
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
