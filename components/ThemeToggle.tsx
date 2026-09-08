'use client'

import { useEffect } from 'react'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'
import { DEFAULT_THEME, THEME_LABEL, applyTheme, nextTheme, syncThemeColor } from '@/lib/theme'
import type { ThemeChoice } from '@/lib/theme'

const GLYPH: Record<ThemeChoice, React.ReactNode> = {
  dark: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  light: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.3M12 19.1v2.3M4.2 12H1.9M22.1 12h-2.3M6.5 6.5L4.9 4.9M19.1 19.1l-1.6-1.6M17.5 6.5l1.6-1.6M4.9 19.1l1.6-1.6" />
    </>
  ),
  system: (
    <>
      <rect x="2.8" y="4" width="18.4" height="12.4" rx="2" />
      <path d="M8.5 20.4h7M12 16.4v4" />
    </>
  ),
}

export default function ThemeToggle() {
  const hydrated = useHydrated()
  const stored = useProgress((s) => s.settings.theme)
  const theme: ThemeChoice = hydrated ? stored : DEFAULT_THEME

  // Keep the DOM in step with the store after a soft navigation or an import,
  // which both land long after the blocking script in <head> has run.
  useEffect(() => {
    if (hydrated) applyTheme(stored)
  }, [hydrated, stored])

  // On `system`, CSS follows the OS on its own, but the system bar colour is a
  // meta tag holding a resolved value — so it needs telling when the OS flips.
  useEffect(() => {
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => syncThemeColor('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  function cycle() {
    const next = nextTheme(theme)
    applyTheme(next)
    useProgress.setState((s) => ({ settings: { ...s.settings, theme: next } }))
  }

  const upcoming = nextTheme(theme)

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${THEME_LABEL[theme]}`}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Switch to ${THEME_LABEL[upcoming]}.`}
      data-theme-choice={theme}
      data-testid="theme-toggle"
      className="flex min-h-11 min-w-11 items-center gap-2 rounded-[var(--radius-sm)] border border-transparent px-2.5 text-[var(--text-muted)] transition-colors hover:border-[var(--panel-border)] hover:bg-[var(--track)] hover:text-[var(--text)]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        {GLYPH[theme]}
      </svg>
      <span className="readout hidden md:inline">{THEME_LABEL[theme].toUpperCase()}</span>
    </button>
  )
}
