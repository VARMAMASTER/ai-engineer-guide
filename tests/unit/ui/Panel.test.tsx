import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import Panel from '@/components/ui/Panel'

afterEach(cleanup)

describe('Panel', () => {
  it('defaults to the panel tier', () => {
    const { container } = render(<Panel data-testid="p">content</Panel>)
    const el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('panel')).toBe(true)
    expect(el.classList.contains('raised')).toBe(false)
    expect(el.classList.contains('surface-solid')).toBe(false)
  })

  it('switches tiers instead of stacking their classes', () => {
    const { container, rerender } = render(<Panel tier="raised">x</Panel>)
    let el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('raised')).toBe(true)
    expect(el.classList.contains('panel')).toBe(false)

    rerender(<Panel tier="solid">x</Panel>)
    el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('surface-solid')).toBe(true)
    expect(el.classList.contains('panel')).toBe(false)
    expect(el.classList.contains('raised')).toBe(false)
  })

  it('only applies panel-flush on the panel tier', () => {
    const { container, rerender } = render(<Panel flush>x</Panel>)
    let el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('panel-flush')).toBe(true)

    rerender(
      <Panel tier="raised" flush>
        x
      </Panel>,
    )
    el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('panel-flush')).toBe(false)
  })

  it('merges an incoming className rather than clobbering the tier class', () => {
    const { container } = render(<Panel className="p-4 gap-2">x</Panel>)
    const el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('panel')).toBe(true)
    expect(el.classList.contains('p-4')).toBe(true)
    expect(el.classList.contains('gap-2')).toBe(true)
  })

  it('forwards the ref to the underlying element', () => {
    let node: HTMLDivElement | null = null
    render(
      <Panel
        ref={(r) => {
          node = r
        }}
        data-testid="p"
      >
        x
      </Panel>,
    )
    expect(node).not.toBeNull()
    expect((node as unknown as HTMLDivElement).getAttribute('data-testid')).toBe('p')
  })
})
