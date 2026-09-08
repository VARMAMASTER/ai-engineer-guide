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
 * The painted ground for each resolved theme — `--d-ground` and `--l-ground`
 * from `globals.css`, which `tests/unit/theme.test.ts` asserts against the
 * stylesheet so the two cannot drift.
 *
 * These drive `<meta name="theme-color">`, which on an installed Android PWA is
 * the system bar behind the app. It has to be the ground the page actually
 * paints, or the bar reads as a stripe of a different app.
 */
export const THEME_COLOR: Record<'dark' | 'light', string> = {
  dark: '#121822',
  light: '#f3f1ea',
}

/** Collapse `system` to what the OS currently prefers. */
export function resolveTheme(choice: ThemeChoice): 'dark' | 'light' {
  if (choice !== 'system') return choice
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DEFAULT_THEME === 'light' ? 'light' : 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Point `<meta name="theme-color">` at the resolved ground.
 *
 * This is driven from JavaScript rather than from a `prefers-color-scheme` pair
 * of metas, because the stored choice overrides the system scheme: a light OS
 * running the app in dark needs a dark bar, and a media-matched pair would give
 * it a light one. Resolving the choice first is the only version that is right
 * in all three modes.
 */
export function syncThemeColor(choice: ThemeChoice): void {
  if (typeof document === 'undefined') return
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.removeAttribute('media')
  meta.setAttribute('content', THEME_COLOR[resolveTheme(choice)])
}

/**
 * Stamp the resolved choice on `<html>`.
 *
 * An explicit choice sets `data-theme`; `system` removes it so
 * `@media (prefers-color-scheme: dark)` takes over again. The system bar colour
 * is kept in step here, since this is the one place the theme is applied.
 */
export function applyTheme(choice: ThemeChoice): void {
  const el = document.documentElement
  if (choice === 'system') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', choice)
  syncThemeColor(choice)
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
  `(function(){try{var d=document.documentElement,r=localStorage.getItem(${JSON.stringify(PROGRESS_STORAGE_KEY)}),s=r?JSON.parse(r):null,t=s&&s.state&&s.state.settings&&s.state.settings.theme;if(t!=="dark"&&t!=="light"&&t!=="system"){t=${JSON.stringify(DEFAULT_THEME)}}if(t==="system"){d.removeAttribute("data-theme");t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}else{d.setAttribute("data-theme",t)}var m=document.querySelector('meta[name="theme-color"]');if(m){m.removeAttribute("media");m.setAttribute("content",t==="light"?${JSON.stringify(THEME_COLOR.light)}:${JSON.stringify(THEME_COLOR.dark)})}}catch(e){}})()`
