import { describe, it, expect } from 'vitest'
import {
  LEARN_SECTIONS,
  NAV_APPS,
  NAV_DESTINATIONS,
  SETTINGS_ITEM,
  appFor,
  isActive,
  isAppActive,
  sectionFor,
} from '@/lib/nav'

describe('nav apps', () => {
  it('is the five apps of the system, in tab-bar order', () => {
    expect(NAV_APPS.map((a) => a.id)).toEqual(['today', 'learn', 'diet', 'train', 'ops'])
  })

  it('keeps every tab-bar label under 10 characters', () => {
    for (const app of NAV_APPS) expect(app.short.length, app.id).toBeLessThanOrEqual(10)
  })

  it('lands each app on a route it actually owns', () => {
    for (const app of NAV_APPS) {
      expect(isAppActive(app.href, app), `${app.id} does not own its own landing page`).toBe(true)
    }
  })

  it('gives Learn every study section and gives the other apps none yet', () => {
    const learn = NAV_APPS.find((a) => a.id === 'learn')!
    expect(learn.sections).toBe(LEARN_SECTIONS)
    for (const app of NAV_APPS.filter((a) => a.id !== 'learn')) {
      expect(app.sections, `${app.id} should have no sections yet`).toEqual([])
    }
  })
})

describe('nav sections', () => {
  it('has every study section, in strip order', () => {
    expect(LEARN_SECTIONS.map((i) => i.href)).toEqual([
      '/roadmap', '/dsa', '/system-design', '/lld', '/ai-ml', '/projects',
      '/reading', '/feed', '/cs-fundamentals', '/hardware', '/behavioural',
      '/companies', '/mock', '/revise',
    ])
  })

  it('keeps every short label under 10 characters', () => {
    for (const i of [...LEARN_SECTIONS, SETTINGS_ITEM]) {
      expect(i.short.length, i.href).toBeLessThanOrEqual(10)
    }
  })

  it('is not an app, and neither is Settings — both are levels of their own', () => {
    const appHrefs = NAV_APPS.map((a) => a.href)
    expect(appHrefs).not.toContain(SETTINGS_ITEM.href)
    // Learn lands on its first section, so exactly one overlap is expected.
    const overlap = LEARN_SECTIONS.filter((s) => appHrefs.includes(s.href))
    expect(overlap.map((s) => s.href)).toEqual(['/roadmap'])
  })
})

describe('nav destinations', () => {
  it('gives every destination a unique href', () => {
    expect(new Set(NAV_DESTINATIONS).size).toBe(NAV_DESTINATIONS.length)
  })

  it('covers every app, every section and Settings', () => {
    for (const app of NAV_APPS) expect(NAV_DESTINATIONS).toContain(app.href)
    for (const section of LEARN_SECTIONS) expect(NAV_DESTINATIONS).toContain(section.href)
    expect(NAV_DESTINATIONS).toContain(SETTINGS_ITEM.href)
  })

  it('adds the three new apps and nothing else the old flat nav did not have', () => {
    expect(NAV_DESTINATIONS).toEqual(
      expect.arrayContaining(['/today', '/diet', '/train', '/ops', '/settings']),
    )
  })
})

describe('isActive', () => {
  it('matches a section and its children, and nothing else', () => {
    expect(isActive('/dsa', '/dsa')).toBe(true)
    expect(isActive('/dsa/arrays-hashing', '/dsa')).toBe(true)
    expect(isActive('/dsa-extra', '/dsa')).toBe(false)
    expect(isActive('/revise/sheets', '/revise')).toBe(true)
    expect(isActive('/today', '/dsa')).toBe(false)
  })
})

describe('appFor', () => {
  const learn = NAV_APPS.find((a) => a.id === 'learn')!

  it('puts every study route under Learn without a /learn URL existing', () => {
    for (const section of LEARN_SECTIONS) {
      expect(appFor(section.href)?.id, section.href).toBe('learn')
    }
    expect(appFor('/dsa/arrays-hashing')?.id).toBe('learn')
    expect(appFor('/revise/sheets')?.id).toBe('learn')
  })

  it('keeps Today, Diet, Train and Ops out of Learn', () => {
    expect(appFor('/today')?.id).toBe('today')
    expect(appFor('/diet')?.id).toBe('diet')
    expect(appFor('/train')?.id).toBe('train')
    expect(appFor('/ops')?.id).toBe('ops')
  })

  it('claims no app for a route outside the tab bar', () => {
    expect(appFor('/settings')).toBeUndefined()
    expect(appFor('/kit')).toBeUndefined()
    expect(appFor('/offline')).toBeUndefined()
    expect(appFor('/')).toBeUndefined()
  })

  it('names the section a child route belongs to', () => {
    expect(sectionFor('/dsa/arrays-hashing', learn)?.href).toBe('/dsa')
    expect(sectionFor('/revise/sheets', learn)?.href).toBe('/revise')
    expect(sectionFor('/today', learn)).toBeUndefined()
  })
})
