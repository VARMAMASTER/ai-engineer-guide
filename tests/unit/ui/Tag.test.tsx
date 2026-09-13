import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Tag from '@/components/ui/Tag'

afterEach(cleanup)

describe('Tag', () => {
  it('is a static label: a plain span, never a button and never a tap target', () => {
    render(<Tag>Hard</Tag>)
    const el = screen.getByText('Hard')
    expect(el.tagName).toBe('SPAN')
    expect(el.getAttribute('role')).toBeNull()
    expect(el.hasAttribute('onclick')).toBe(false)
    expect(el.tabIndex).toBe(-1)
  })

  it('switches the variant class instead of stacking every variant', () => {
    const { rerender } = render(<Tag variant="outline">A</Tag>)
    expect(screen.getByText('A').classList.contains('tag-outline')).toBe(true)
    expect(screen.getByText('A').classList.contains('tag-accent')).toBe(false)

    rerender(<Tag variant="accent">A</Tag>)
    expect(screen.getByText('A').classList.contains('tag-accent')).toBe(true)
    expect(screen.getByText('A').classList.contains('tag-outline')).toBe(false)
  })

  it('always keeps the base tag class alongside a variant', () => {
    render(<Tag variant="accent">B</Tag>)
    expect(screen.getByText('B').classList.contains('tag')).toBe(true)
  })

  it('merges className instead of clobbering it', () => {
    render(<Tag className="ml-2">C</Tag>)
    const el = screen.getByText('C')
    expect(el.classList.contains('tag')).toBe(true)
    expect(el.classList.contains('ml-2')).toBe(true)
  })

  it('forwards the ref to the span', () => {
    let node: HTMLSpanElement | null = null
    render(
      <Tag
        ref={(r) => {
          node = r
        }}
      >
        D
      </Tag>,
    )
    expect(node && (node as HTMLSpanElement).tagName).toBe('SPAN')
  })
})
