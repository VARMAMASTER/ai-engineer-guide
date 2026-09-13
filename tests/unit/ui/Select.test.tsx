import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Select from '@/components/ui/Select'

function ControlledSelect() {
  const [value, setValue] = useState('kg')
  return (
    <Select aria-label="Unit" value={value} onChange={(e) => setValue(e.target.value)}>
      <option value="kg">kg</option>
      <option value="lb">lb</option>
    </Select>
  )
}

describe('Select', () => {
  it('round-trips a selection change', async () => {
    render(<ControlledSelect />)
    const select = screen.getByLabelText('Unit') as HTMLSelectElement
    expect(select.value).toBe('kg')
    await userEvent.selectOptions(select, 'lb')
    expect(select.value).toBe('lb')
  })

  it('renders the passed-through options', () => {
    render(<ControlledSelect />)
    expect(screen.getByRole('option', { name: 'kg' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'lb' })).toBeDefined()
  })

  it('merges className with the .select token class', () => {
    render(
      <Select aria-label="Unit" className="extra" value="kg" onChange={() => {}}>
        <option value="kg">kg</option>
      </Select>,
    )
    const select = screen.getByLabelText('Unit')
    expect(select.className).toContain('select')
    expect(select.className).toContain('extra')
  })

  it('forwards a ref to the underlying DOM select', () => {
    const ref = { current: null as HTMLSelectElement | null }
    render(
      <Select aria-label="Unit" ref={ref} value="kg" onChange={() => {}}>
        <option value="kg">kg</option>
      </Select>,
    )
    expect(ref.current).toBeInstanceOf(HTMLSelectElement)
  })
})
