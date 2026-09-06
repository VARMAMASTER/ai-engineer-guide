import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Checkbox from '@/components/Checkbox'
import Meter from '@/components/Meter'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

afterEach(cleanup)

describe('Meter', () => {
  it('always shows the numeric value beside the bar', () => {
    render(<Meter label="Problems solved" done={12} target={40} />)
    const bar = screen.getByRole('progressbar', { name: 'Problems solved' })
    expect(bar.getAttribute('aria-valuenow')).toBe('12')
    expect(bar.getAttribute('aria-valuemax')).toBe('40')
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('/40')).toBeTruthy()
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('30%')
  })

  it('never overflows the track and survives a zero target', () => {
    const { rerender } = render(<Meter label="Docs" done={9} target={7} />)
    let bar = screen.getByRole('progressbar', { name: 'Docs' })
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%')

    rerender(<Meter label="Docs" done={0} target={0} />)
    bar = screen.getByRole('progressbar', { name: 'Docs' })
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('0%')
  })
})

describe('Checkbox', () => {
  it('renders unchecked from an empty store', async () => {
    render(<Checkbox itemId="dsa-two-sum" label="Two Sum" meta="LC 1" />)
    const box = screen.getByRole('checkbox', { name: 'Two Sum' })
    expect((box as HTMLInputElement).checked).toBe(false)
    expect(screen.getByText('LC 1')).toBeTruthy()
  })

  it('renders checked from a populated store and marks the row completed', async () => {
    useProgress.setState({ completed: { 'dsa-two-sum': '2026-09-06' } })
    render(<Checkbox itemId="dsa-two-sum" label="Two Sum" />)
    const box = screen.getByRole('checkbox', { name: 'Two Sum' })
    await waitFor(() => expect((box as HTMLInputElement).checked).toBe(true))
    expect(box.closest('label')?.getAttribute('data-completed')).toBe('true')
  })

  it('toggles the store when the row is clicked, not only the box', async () => {
    const user = userEvent.setup()
    render(<Checkbox itemId="dsa-two-sum" label="Two Sum" />)
    const box = screen.getByRole('checkbox', { name: 'Two Sum' })
    await waitFor(() => expect(useProgress.persist.hasHydrated()).toBe(true))

    await user.click(screen.getByText('Two Sum'))
    await waitFor(() => expect(useProgress.getState().completed['dsa-two-sum']).toBeTruthy())
    await waitFor(() => expect((box as HTMLInputElement).checked).toBe(true))

    await user.click(screen.getByText('Two Sum'))
    await waitFor(() => expect(useProgress.getState().completed['dsa-two-sum']).toBeUndefined())
  })

  it('gives the row a 44px minimum target', () => {
    render(<Checkbox itemId="dsa-two-sum" label="Two Sum" />)
    const row = screen.getByRole('checkbox', { name: 'Two Sum' }).closest('label')
    expect(row?.className).toContain('min-h-11')
  })
})
