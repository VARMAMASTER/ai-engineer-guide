import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chip from '@/components/ui/Chip'

afterEach(cleanup)

describe('Chip', () => {
  it('is a real, 44px-tap-target-class button', () => {
    render(<Chip>Filter</Chip>)
    const el = screen.getByRole('button', { name: 'Filter' })
    expect(el.tagName).toBe('BUTTON')
    expect(el.getAttribute('type')).toBe('button')
  })

  it('has no pressed state at all until the pressed prop is given', () => {
    render(<Chip>Action</Chip>)
    const el = screen.getByRole('button', { name: 'Action' })
    expect(el.hasAttribute('aria-pressed')).toBe(false)
    expect(el.hasAttribute('data-active')).toBe(false)
  })

  it('drives aria-pressed and data-active from the same prop, in lockstep', () => {
    const { rerender } = render(<Chip pressed={false}>Coding</Chip>)
    let el = screen.getByRole('button', { name: 'Coding' })
    expect(el.getAttribute('aria-pressed')).toBe('false')
    expect(el.getAttribute('data-active')).toBe('false')

    rerender(<Chip pressed>Coding</Chip>)
    el = screen.getByRole('button', { name: 'Coding' })
    expect(el.getAttribute('aria-pressed')).toBe('true')
    expect(el.getAttribute('data-active')).toBe('true')
  })

  it('never lets the announced and painted state disagree across renders', () => {
    const { rerender } = render(<Chip pressed={false}>Behavioural</Chip>)
    for (const value of [true, false, true]) {
      rerender(<Chip pressed={value}>Behavioural</Chip>)
      const el = screen.getByRole('button', { name: 'Behavioural' })
      expect(el.getAttribute('aria-pressed')).toBe(el.getAttribute('data-active'))
    }
  })

  it('responds to a real click like any button', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Chip pressed={false} onClick={onClick}>
        System design
      </Chip>,
    )
    await user.click(screen.getByRole('button', { name: 'System design' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('merges className instead of clobbering it', () => {
    render(<Chip className="shrink-0">E</Chip>)
    const el = screen.getByRole('button', { name: 'E' })
    expect(el.classList.contains('chip')).toBe(true)
    expect(el.classList.contains('shrink-0')).toBe(true)
  })
})
