import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  THEME_ORDER,
  THEME_INIT_SCRIPT,
  THEME_COLOR,
  DEFAULT_THEME,
  nextTheme,
  readStoredTheme,
  applyTheme,
  resolveTheme,
  syncThemeColor,
  PROGRESS_STORAGE_KEY,
} from '@/lib/theme'
import { STORAGE_KEY } from '@/lib/progress/store'

/** Force `prefers-color-scheme: dark` to a known answer inside jsdom. */
function stubPrefersDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('dark') ? dark : !dark,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }))
}

function themeColorMeta(): string | null {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null
}

function persistedBlob(theme: string): string {
  return JSON.stringify({
    state: { version: 1, startDate: null, completed: {}, hours: {}, settings: { theme } },
    version: 0,
  })
}

/** Run the exact blocking script the layout emits, the way the browser would. */
function runInitScript() {
  new Function(THEME_INIT_SCRIPT)()
}

describe('theme cycle', () => {
  it('cycles dark then light then system and back', () => {
    expect(THEME_ORDER).toEqual(['dark', 'light', 'system'])
    expect(nextTheme('dark')).toBe('light')
    expect(nextTheme('light')).toBe('system')
    expect(nextTheme('system')).toBe('dark')
  })

  it('cycles all three states in order from any start', () => {
    let t = nextTheme('system')
    const seen = [t]
    for (let i = 0; i < 2; i += 1) {
      t = nextTheme(t)
      seen.push(t)
    }
    expect(seen).toEqual(['dark', 'light', 'system'])
  })
})

describe('readStoredTheme', () => {
  it('reads the zustand persist envelope', () => {
    expect(readStoredTheme(persistedBlob('light'))).toBe('light')
    expect(readStoredTheme(persistedBlob('system'))).toBe('system')
  })

  it('falls back to the default for missing, malformed, or unknown values', () => {
    expect(readStoredTheme(null)).toBe(DEFAULT_THEME)
    expect(readStoredTheme('not json')).toBe(DEFAULT_THEME)
    expect(readStoredTheme('{}')).toBe(DEFAULT_THEME)
    expect(readStoredTheme(persistedBlob('chartreuse'))).toBe(DEFAULT_THEME)
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('stamps an explicit choice and clears it for system', () => {
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    applyTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})

describe('blocking init script', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.setAttribute('data-theme', DEFAULT_THEME)
  })

  it('resolves the stored theme on a cold load, so the choice survives a reload', () => {
    window.localStorage.setItem(STORAGE_KEY, persistedBlob('light'))
    runInitScript()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('drops the attribute for system so the media query governs', () => {
    window.localStorage.setItem(STORAGE_KEY, persistedBlob('system'))
    runInitScript()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('leaves the server default in place when nothing is stored', () => {
    runInitScript()
    expect(document.documentElement.getAttribute('data-theme')).toBe(DEFAULT_THEME)
  })

  it('never throws when storage is unavailable', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"state":')
    expect(() => runInitScript()).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBe(DEFAULT_THEME)
  })

  it('uses the same storage key as the store, without importing the client module', () => {
    expect(PROGRESS_STORAGE_KEY).toBe(STORAGE_KEY)
  })

  it('reads the raw storage key rather than waiting on the store', () => {
    expect(THEME_INIT_SCRIPT).toContain(STORAGE_KEY)
    expect(THEME_INIT_SCRIPT).not.toContain('\n')
  })
})

describe('theme-color', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.documentElement.removeAttribute('data-theme')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('matches the ground each theme actually paints', () => {
    // The literals in lib/theme exist so a blocking script can inline them
    // without importing CSS. They are only correct while they equal the tokens,
    // so read globals.css rather than trusting the copy.
    const css = readFileSync('app/globals.css', 'utf8')
    const dark = css.match(/--d-ground:\s*(#[0-9a-fA-F]{3,8})/)?.[1]
    const light = css.match(/--l-ground:\s*(#[0-9a-fA-F]{3,8})/)?.[1]
    expect(dark).toBeTruthy()
    expect(THEME_COLOR.dark.toLowerCase()).toBe(dark!.toLowerCase())
    expect(THEME_COLOR.light.toLowerCase()).toBe(light!.toLowerCase())
  })

  it('resolves system against the OS, and leaves an explicit choice alone', () => {
    stubPrefersDark(true)
    expect(resolveTheme('system')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
    stubPrefersDark(false)
    expect(resolveTheme('system')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('creates the meta when the page has none, rather than silently doing nothing', () => {
    expect(themeColorMeta()).toBeNull()
    syncThemeColor('light')
    expect(themeColorMeta()).toBe(THEME_COLOR.light)
  })

  it('follows the stored choice even when the OS disagrees', () => {
    // The case a prefers-color-scheme meta pair gets wrong: a light phone
    // running the app in dark would get a light system bar over a dark page.
    stubPrefersDark(false)
    applyTheme('dark')
    expect(themeColorMeta()).toBe(THEME_COLOR.dark)
  })

  it('is kept in step by applyTheme, in all three modes', () => {
    stubPrefersDark(true)
    applyTheme('light')
    expect(themeColorMeta()).toBe(THEME_COLOR.light)
    applyTheme('dark')
    expect(themeColorMeta()).toBe(THEME_COLOR.dark)
    applyTheme('system')
    expect(themeColorMeta()).toBe(THEME_COLOR.dark)
  })

  it('drops a stale media attribute, which would otherwise stop the value applying', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.setAttribute('media', '(prefers-color-scheme: light)')
    document.head.appendChild(meta)
    stubPrefersDark(true)
    syncThemeColor('dark')
    expect(meta.hasAttribute('media')).toBe(false)
    expect(themeColorMeta()).toBe(THEME_COLOR.dark)
  })

  it('is set by the blocking script before first paint', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.setAttribute('content', THEME_COLOR.dark)
    document.head.appendChild(meta)
    window.localStorage.setItem(STORAGE_KEY, persistedBlob('light'))
    stubPrefersDark(true)
    new Function(THEME_INIT_SCRIPT)()
    expect(themeColorMeta()).toBe(THEME_COLOR.light)
  })
})
