import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Textarea from '@/components/ui/Textarea'

function ControlledTextarea() {
  const [value, setValue] = useState('')
  return <Textarea aria-label="Notes" value={value} onChange={(e) => setValue(e.target.value)} />
}

describe('Textarea', () => {
  it('round-trips a change as a controlled textarea', async () => {
    render(<ControlledTextarea />)
    const textarea = screen.getByLabelText('Notes') as HTMLTextAreaElement
    await userEvent.type(textarea, 'felt strong today')
    expect(textarea.value).toBe('felt strong today')
  })

  it('merges className with the .textarea token class', () => {
    render(<Textarea aria-label="Notes" className="extra" readOnly value="x" />)
    const textarea = screen.getByLabelText('Notes')
    expect(textarea.className).toContain('textarea')
    expect(textarea.className).toContain('extra')
  })

  it('forwards a ref to the underlying DOM textarea', () => {
    const ref = { current: null as HTMLTextAreaElement | null }
    render(<Textarea aria-label="Notes" ref={ref} readOnly value="x" />)
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })
})
