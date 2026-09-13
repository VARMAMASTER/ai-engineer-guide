import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '@/components/ui/Button'

describe('Button', () => {
  it('defaults to type="button" so it never accidentally submits a form', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button>Save</Button>
      </form>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('honours an explicit type="submit"', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('is disabled and busy while loading, and blocks clicks', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not busy when not loading', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('aria-busy')).toBe(false)
  })

  it('merges className instead of replacing the variant class', () => {
    render(
      <Button variant="accent" className="w-full">
        Go
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button.className).toContain('btn-accent')
    expect(button.className).toContain('w-full')
  })

  it('forwards a ref to the underlying DOM button', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Button ref={ref}>Go</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('respects an explicit disabled without loading', () => {
    render(<Button disabled>Go</Button>)
    const button = screen.getByRole('button', { name: 'Go' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.hasAttribute('aria-busy')).toBe(false)
  })
})
