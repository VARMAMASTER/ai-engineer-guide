/**
 * The raw localStorage key the progress store persists under.
 *
 * Declared here rather than imported from `lib/progress/store`, because that
 * module is `'use client'` — importing its constants into the server-rendered
 * root layout yields a client reference, not the string, and the blocking
 * script would end up reading `localStorage.getItem(undefined)`.
 * `tests/unit/theme.test.ts` asserts the two stay identical.
 */
export const PROGRESS_STORAGE_KEY = 'aeg.progress.v1'

export type ThemeChoice = 'dark' | 'light' | 'system'

/** Cycle order for the top-bar toggle. */
export const THEME_ORDER: readonly ThemeChoice[] = ['dark', 'light', 'system'] as const

/** Dark is the default: it is what the server renders and what an empty blob holds. */
export const DEFAULT_THEME: ThemeChoice = 'dark'

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === 'dark' || v === 'light' || v === 'system'
}

export function nextTheme(current: ThemeChoice): ThemeChoice {
  const i = THEME_ORDER.indexOf(current)
  return THEME_ORDER[(i + 1) % THEME_ORDER.length]
}

/**
 * Pull the theme out of a raw zustand-persist envelope.
 *
 * The persisted shape is `{"state":{...,"settings":{"theme":"dark"}},"version":0}`
 * (verified against the running store, not assumed).
 */
export function readStoredTheme(raw: string | null): ThemeChoice {
  if (!raw) return DEFAULT_THEME
  try {
    const parsed = JSON.parse(raw) as { state?: { settings?: { theme?: unknown } } }
    const t = parsed?.state?.settings?.theme
    return isThemeChoice(t) ? t : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/**
 * Stamp the resolved choice on `<html>`.
 *
 * An explicit choice sets `data-theme`; `system` removes it so
 * `@media (prefers-color-scheme: dark)` takes over again.
 */
export function applyTheme(choice: ThemeChoice): void {
  const el = document.documentElement
  if (choice === 'system') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', choice)
}

export const THEME_LABEL: Record<ThemeChoice, string> = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
}

/**
 * The blocking inline script emitted into `<head>`.
 *
 * It reads the raw localStorage key directly — waiting for the zustand store to
 * rehydrate happens long after first paint, which is exactly the flash we are
 * avoiding. Single line, no newlines, so it stays cheap to parse.
 */
export const THEME_INIT_SCRIPT =
  `(function(){try{var d=document.documentElement,r=localStorage.getItem(${JSON.stringify(PROGRESS_STORAGE_KEY)}),s=r?JSON.parse(r):null,t=s&&s.state&&s.state.settings&&s.state.settings.theme;if(t!=="dark"&&t!=="light"&&t!=="system"){t=${JSON.stringify(DEFAULT_THEME)}}if(t==="system"){d.removeAttribute("data-theme")}else{d.setAttribute("data-theme",t)}}catch(e){}})()`
