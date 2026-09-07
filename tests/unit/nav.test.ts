import { describe, it, expect } from 'vitest'
import { NAV_ITEMS } from '@/lib/nav'

describe('nav', () => {
  it('has every section in rail order', () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual([
      '/today', '/roadmap', '/dsa', '/system-design', '/projects',
      '/lld', '/ai-ml', '/reading', '/feed', '/cs-fundamentals', '/hardware',
      '/behavioural', '/companies', '/mock', '/revise', '/settings',
    ])
  })

  it('gives every section a unique href', () => {
    const hrefs = NAV_ITEMS.map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('marks exactly five as primary for the mobile tab bar', () => {
    expect(NAV_ITEMS.filter((i) => i.primary)).toHaveLength(5)
  })

  it('keeps every short label under 10 characters', () => {
    for (const i of NAV_ITEMS) expect(i.short.length, i.href).toBeLessThanOrEqual(10)
  })
})
