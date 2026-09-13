import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Divider from '@/components/ui/Divider'

afterEach(cleanup)

describe('Divider', () => {
  it('renders a real <hr>, carrying the implicit separator semantics for free', () => {
    render(<Divider data-testid="d" />)
    const el = screen.getByRole('separator')
    expect(el.tagName).toBe('HR')
    expect(el.classList.contains('divider')).toBe(true)
  })

  it('merges className instead of clobbering it', () => {
    render(<Divider className="my-6" />)
    const el = screen.getByRole('separator')
    expect(el.classList.contains('divider')).toBe(true)
    expect(el.classList.contains('my-6')).toBe(true)
  })

  it('forwards the ref to the hr element', () => {
    let node: HTMLHRElement | null = null
    render(
      <Divider
        ref={(r) => {
          node = r
        }}
      />,
    )
    expect(node && (node as HTMLHRElement).tagName).toBe('HR')
  })
})
