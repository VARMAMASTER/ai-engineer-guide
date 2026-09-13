import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NumberInput from '@/components/ui/NumberInput'

function ControlledNumberInput({ initial }: { initial: number | null }) {
  const [value, setValue] = useState<number | null>(initial)
  return <NumberInput aria-label="Calories" value={value} onChange={setValue} />
}

describe('NumberInput', () => {
  it('renders null as an empty field, not as 0', () => {
    render(<NumberInput aria-label="Calories" value={null} onChange={() => {}} />)
    expect((screen.getByLabelText('Calories') as HTMLInputElement).value).toBe('')
  })

  it('renders 0 as "0", distinct from empty', () => {
    render(<NumberInput aria-label="Calories" value={0} onChange={() => {}} />)
    expect((screen.getByLabelText('Calories') as HTMLInputElement).value).toBe('0')
  })

  it('reports 0 (not null) when the user types a literal zero', async () => {
    const onChange = vi.fn()
    render(<NumberInput aria-label="Calories" value={null} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Calories'), '0')
    expect(onChange).toHaveBeenCalledWith(0)
    expect(onChange).not.toHaveBeenCalledWith(null)
  })

  it('reports null (not 0) when the field is cleared', async () => {
    const onChange = vi.fn()
    render(<NumberInput aria-label="Calories" value={5} onChange={onChange} />)
    const input = screen.getByLabelText('Calories') as HTMLInputElement
    await userEvent.clear(input)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('round-trips typed digits through a controlled parent', async () => {
    render(<ControlledNumberInput initial={null} />)
    const input = screen.getByLabelText('Calories') as HTMLInputElement
    await userEvent.type(input, '420')
    expect(input.value).toBe('420')
  })

  it('holds an in-progress decimal ("12.") locally without emitting NaN', async () => {
    const onChange = vi.fn()
    render(<ControlledNumberInput initial={null} />)
    const input = screen.getByLabelText('Calories') as HTMLInputElement
    await userEvent.type(input, '12.')
    expect(input.value).toBe('12.')
    for (const call of onChange.mock.calls) {
      expect(Number.isNaN(call[0])).toBe(false)
    }
    await userEvent.type(input, '5')
    expect(input.value).toBe('12.5')
  })

  it('holds a bare minus sign locally without emitting NaN', async () => {
    render(<ControlledNumberInput initial={null} />)
    const input = screen.getByLabelText('Calories') as HTMLInputElement
    await userEvent.type(input, '-')
    expect(input.value).toBe('-')
    await userEvent.type(input, '5')
    expect(input.value).toBe('-5')
  })

  it('rejects non-numeric characters', async () => {
    render(<ControlledNumberInput initial={null} />)
    const input = screen.getByLabelText('Calories') as HTMLInputElement
    await userEvent.type(input, 'abc')
    expect(input.value).toBe('')
  })

  it('uses .input .input-num and inputMode="decimal"', () => {
    render(<NumberInput aria-label="Calories" value={null} onChange={() => {}} />)
    const input = screen.getByLabelText('Calories')
    expect(input.className).toContain('input')
    expect(input.className).toContain('input-num')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('re-syncs from an external reset of value', () => {
    const { rerender } = render(<NumberInput aria-label="Calories" value={12} onChange={() => {}} />)
    const input = screen.getByLabelText('Calories') as HTMLInputElement
    expect(input.value).toBe('12')
    rerender(<NumberInput aria-label="Calories" value={null} onChange={() => {}} />)
    expect(input.value).toBe('')
  })

  it('merges className with the token classes', () => {
    render(<NumberInput aria-label="Calories" value={null} onChange={() => {}} className="extra" />)
    expect(screen.getByLabelText('Calories').className).toContain('extra')
  })
})
