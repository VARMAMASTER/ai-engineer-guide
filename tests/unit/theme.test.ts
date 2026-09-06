import { describe, it, expect, beforeEach } from 'vitest'
import {
  THEME_ORDER,
  THEME_INIT_SCRIPT,
  DEFAULT_THEME,
  nextTheme,
  readStoredTheme,
  applyTheme,
  PROGRESS_STORAGE_KEY,
} from '@/lib/theme'
import { STORAGE_KEY } from '@/lib/progress/store'

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
