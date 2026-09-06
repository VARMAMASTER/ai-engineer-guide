import { describe, it, expect } from 'vitest'
import { NAV_ITEMS } from '@/lib/nav'

describe('nav', () => {
  it('has the eight sections', () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual([
      '/today', '/roadmap', '/dsa', '/system-design', '/projects', '/ai-ml', '/reading', '/settings',
    ])
  })

  it('marks exactly five as primary for the mobile tab bar', () => {
    expect(NAV_ITEMS.filter((i) => i.primary)).toHaveLength(5)
  })

  it('keeps every short label under 10 characters', () => {
    for (const i of NAV_ITEMS) expect(i.short.length, i.href).toBeLessThanOrEqual(10)
  })
})
