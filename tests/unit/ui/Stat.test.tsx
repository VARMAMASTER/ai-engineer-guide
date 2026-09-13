import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Stat from '@/components/ui/Stat'

afterEach(cleanup)

describe('Stat', () => {
  it('renders the label above a tabular value', () => {
    render(<Stat value={128} label="Problems solved" />)
    expect(screen.getByText('Problems solved').classList.contains('eyebrow')).toBe(true)
    const value = screen.getByText('128')
    expect(value.classList.contains('stat-value')).toBe(true)
  })

  it('renders an optional unit beside the value, inside the same tabular element', () => {
    render(<Stat value={72} label="Weight" unit="kg" />)
    const value = screen.getByText('72')
    expect(value.textContent).toContain('72')
    expect(value.textContent).toContain('kg')
    const unitEl = value.querySelector('.stat-unit')
    expect(unitEl).not.toBeNull()
    expect(unitEl?.textContent?.trim()).toBe('kg')
  })

  it('omits the unit element entirely when no unit is given', () => {
    render(<Stat value={5} label="Streak" />)
    const value = screen.getByText('5')
    expect(value.querySelector('.stat-unit')).toBeNull()
  })

  it('renders a unit of 0 (a falsy-but-real value)', () => {
    render(<Stat value="—" label="Overdue" unit={0} />)
    const unitEl = document.querySelector('.stat-unit')
    expect(unitEl?.textContent?.trim()).toBe('0')
  })

  it('merges className onto the outer stat block', () => {
    const { container } = render(<Stat value={1} label="X" className="gap-3" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('stat')).toBe(true)
    expect(el.classList.contains('gap-3')).toBe(true)
  })

  it('forwards the ref to the outer block', () => {
    let node: HTMLDivElement | null = null
    render(
      <Stat
        value={1}
        label="X"
        ref={(r) => {
          node = r
        }}
      />,
    )
    expect(node && (node as HTMLDivElement).classList.contains('stat')).toBe(true)
  })
})
