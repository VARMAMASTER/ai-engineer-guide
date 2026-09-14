import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'

let path = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => path,
}))

import Breadcrumb from '@/components/Breadcrumb'

afterEach(() => {
  cleanup()
})

/*
 * Behaviour, not markup: what renders on a deep page, what stays silent on a
 * root the section strip / rail already show, and that every crumb is a real
 * ancestor link rather than a stand-in for the page's own heading.
 */

describe('Breadcrumb', () => {
  it('renders both ancestors of a deep page, outermost first', () => {
    path = '/dsa/arrays-hashing'
    render(<Breadcrumb />)

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Learn', 'DSA'])
    expect(links[0].getAttribute('href')).toBe('/roadmap')
    expect(links[1].getAttribute('href')).toBe('/dsa')
  })

  it('renders nothing on a section root — the strip already shows it', () => {
    path = '/dsa'
    render(<Breadcrumb />)
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull()
  })

  it('renders nothing on an app root', () => {
    path = '/today'
    render(<Breadcrumb />)
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull()
  })

  it('renders nothing for a route the nav model does not own', () => {
    path = '/settings'
    render(<Breadcrumb />)
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull()

    path = '/kit'
    render(<Breadcrumb />)
    expect(screen.queryAllByRole('navigation', { name: 'Breadcrumb' })).toHaveLength(0)
  })

  it('renders the single-ancestor trail for a page directly under an app with no sections', () => {
    path = '/revise/sheets'
    render(<Breadcrumb />)
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Learn', 'Revise'])
  })

  it('never labels a crumb as the current page — every crumb is an ancestor, none is the leaf', () => {
    path = '/dsa/arrays-hashing'
    render(<Breadcrumb />)
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    for (const link of within(nav).getAllByRole('link')) {
      expect(link.getAttribute('aria-current')).toBeNull()
    }
  })

  it('gives every crumb a 44px tap target', () => {
    path = '/dsa/arrays-hashing'
    render(<Breadcrumb />)
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    for (const link of within(nav).getAllByRole('link')) {
      expect(link.className).toContain('min-h-11')
    }
  })
})
