import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Meter from '@/components/ui/Meter'

afterEach(cleanup)

describe('Meter', () => {
  it('exposes role=progressbar with the settable accessible name and the right ARIA values', () => {
    render(<Meter value={30} label="Weekly hours" />)
    const bar = screen.getByRole('progressbar', { name: 'Weekly hours' })
    expect(bar.getAttribute('aria-valuenow')).toBe('30')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
  })

  it('respects a custom min/max range', () => {
    render(<Meter value={4} min={2} max={10} label="Days" />)
    const bar = screen.getByRole('progressbar', { name: 'Days' })
    expect(bar.getAttribute('aria-valuenow')).toBe('4')
    expect(bar.getAttribute('aria-valuemin')).toBe('2')
    expect(bar.getAttribute('aria-valuemax')).toBe('10')
    // (4 - 2) / (10 - 2) = 25%
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('25%')
  })

  it('clamps a value above max: aria-valuenow and the fill both read max, never the raw input', () => {
    render(<Meter value={120} max={100} label="Over" />)
    const bar = screen.getByRole('progressbar', { name: 'Over' })
    expect(bar.getAttribute('aria-valuenow')).toBe('100')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%')
  })

  it('clamps a value below min: aria-valuenow and the fill both read min, never negative', () => {
    render(<Meter value={-5} min={0} max={100} label="Under" />)
    const bar = screen.getByRole('progressbar', { name: 'Under' })
    expect(bar.getAttribute('aria-valuenow')).toBe('0')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('0%')
  })

  it('never divides by zero when min equals max', () => {
    render(<Meter value={5} min={3} max={3} label="Degenerate" />)
    const bar = screen.getByRole('progressbar', { name: 'Degenerate' })
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('0%')
  })

  it('marks complete only once the clamped value reaches max, driving the CSS hook', () => {
    const { rerender } = render(<Meter value={99} max={100} label="Progress" />)
    let bar = screen.getByRole('progressbar', { name: 'Progress' })
    expect(bar.getAttribute('data-complete')).toBe('false')

    rerender(<Meter value={150} max={100} label="Progress" />)
    bar = screen.getByRole('progressbar', { name: 'Progress' })
    expect(bar.getAttribute('data-complete')).toBe('true')
  })

  it('only renders the percentage readout when showValue is set', () => {
    const { rerender } = render(<Meter value={40} label="Hidden readout" />)
    expect(screen.queryByText('40%')).toBeNull()

    rerender(
      <Meter value={40} label="Visible readout" showValue />,
    )
    expect(screen.getByText('40%')).toBeTruthy()
  })

  it('merges className onto the wrapper without touching the track markup', () => {
    const { container } = render(<Meter value={10} label="Styled" className="my-4" />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.classList.contains('my-4')).toBe(true)
    expect(screen.getByRole('progressbar', { name: 'Styled' })).toBeTruthy()
  })
})
