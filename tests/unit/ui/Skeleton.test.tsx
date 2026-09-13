import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import Skeleton from '@/components/ui/Skeleton'

afterEach(cleanup)

describe('Skeleton', () => {
  it('is hidden from assistive tech by default, since it has nothing to say', () => {
    const { container } = render(<Skeleton data-testid="sk" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.classList.contains('skeleton')).toBe(true)
  })

  it('lets a caller opt back into being announced', () => {
    const { container } = render(<Skeleton aria-hidden={false} role="status" aria-label="Loading" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('aria-hidden')).toBe('false')
    expect(el.getAttribute('role')).toBe('status')
  })

  it('merges className instead of clobbering it', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('skeleton')).toBe(true)
    expect(el.classList.contains('h-4')).toBe(true)
    expect(el.classList.contains('w-24')).toBe(true)
  })

  it('forwards the ref to the underlying div', () => {
    let node: HTMLDivElement | null = null
    render(
      <Skeleton
        ref={(r) => {
          node = r
        }}
      />,
    )
    expect(node && (node as HTMLDivElement).tagName).toBe('DIV')
  })
})
