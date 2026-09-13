import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Input from '@/components/ui/Input'

function ControlledInput() {
  const [value, setValue] = useState('')
  return (
    <Input aria-label="Name" value={value} onChange={(e) => setValue(e.target.value)} />
  )
}

describe('Input', () => {
  it('round-trips a change as a controlled input', async () => {
    render(<ControlledInput />)
    const input = screen.getByLabelText('Name') as HTMLInputElement
    await userEvent.type(input, 'Kiran')
    expect(input.value).toBe('Kiran')
  })

  it('merges className with the .input token class', () => {
    render(<Input aria-label="Name" className="my-extra" readOnly value="x" />)
    const input = screen.getByLabelText('Name')
    expect(input.className).toContain('input')
    expect(input.className).toContain('my-extra')
  })

  it('forwards a ref to the underlying DOM input', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Input aria-label="Name" ref={ref} readOnly value="x" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('passes through arbitrary DOM props like name and required', () => {
    render(<Input aria-label="Name" name="fullName" required readOnly value="x" />)
    const input = screen.getByLabelText('Name') as HTMLInputElement
    expect(input.name).toBe('fullName')
    expect(input.required).toBe(true)
  })
})
