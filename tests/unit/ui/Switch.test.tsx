import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Switch from '@/components/ui/Switch'

function ControlledSwitch() {
  const [checked, setChecked] = useState(false)
  return <Switch aria-label="Notifications" checked={checked} onCheckedChange={setChecked} />
}

describe('Switch', () => {
  it('is a real switch with aria-checked reflecting state', () => {
    render(<Switch aria-label="Notifications" checked={false} onCheckedChange={() => {}} />)
    const el = screen.getByRole('switch', { name: 'Notifications' })
    expect(el.getAttribute('aria-checked')).toBe('false')
  })

  it('toggles on click and flips aria-checked', async () => {
    render(<ControlledSwitch />)
    const el = screen.getByRole('switch', { name: 'Notifications' })
    await userEvent.click(el)
    expect(el.getAttribute('aria-checked')).toBe('true')
    await userEvent.click(el)
    expect(el.getAttribute('aria-checked')).toBe('false')
  })

  it('toggles on Space when focused', async () => {
    render(<ControlledSwitch />)
    const el = screen.getByRole('switch', { name: 'Notifications' })
    el.focus()
    await userEvent.keyboard(' ')
    expect(el.getAttribute('aria-checked')).toBe('true')
  })

  it('toggles on Enter when focused', async () => {
    render(<ControlledSwitch />)
    const el = screen.getByRole('switch', { name: 'Notifications' })
    el.focus()
    await userEvent.keyboard('{Enter}')
    expect(el.getAttribute('aria-checked')).toBe('true')
  })

  it('calls onCheckedChange with the flipped value, not the current one', async () => {
    const onCheckedChange = vi.fn()
    render(<Switch aria-label="Notifications" checked={true} onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('switch', { name: 'Notifications' }))
    expect(onCheckedChange).toHaveBeenCalledWith(false)
  })

  it('has a hit area of at least 44px', () => {
    render(<Switch aria-label="Notifications" checked={false} onCheckedChange={() => {}} />)
    const el = screen.getByRole('switch', { name: 'Notifications' })
    // jsdom has no real layout, so this checks the utility classes carry the
    // 44px (h-11/w-11 = 2.75rem = 44px) rather than a computed box size.
    expect(el.className).toMatch(/\bh-11\b/)
    expect(el.className).toMatch(/\bw-11\b/)
  })

  it('does not toggle when disabled', async () => {
    const onCheckedChange = vi.fn()
    render(<Switch aria-label="Notifications" checked={false} onCheckedChange={onCheckedChange} disabled />)
    const el = screen.getByRole('switch', { name: 'Notifications' }) as HTMLButtonElement
    expect(el.disabled).toBe(true)
    await userEvent.click(el)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it('merges className rather than replacing it', () => {
    render(<Switch aria-label="Notifications" checked={false} onCheckedChange={() => {}} className="extra" />)
    const el = screen.getByRole('switch', { name: 'Notifications' })
    expect(el.className).toContain('extra')
    expect(el.className).toMatch(/\bh-11\b/)
  })
})
