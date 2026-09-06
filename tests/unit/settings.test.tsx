import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from '@/components/Settings'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'
import { mostRecentMonday, todayIso, isMonday } from '@/lib/date'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('Settings', () => {
  it('offers the most recent Monday and the next Monday', () => {
    render(<Settings />)
    const recent = mostRecentMonday(todayIso())
    expect(screen.getByRole('button', { name: new RegExp(recent) })).toBeDefined()
    expect(screen.getByText(/day 1 must be a Monday/i)).toBeDefined()
  })

  it('sets a Monday start date', async () => {
    render(<Settings />)
    const recent = mostRecentMonday(todayIso())
    await userEvent.click(screen.getByRole('button', { name: new RegExp(recent) }))
    const set = useProgress.getState().startDate!
    expect(set).toBe(recent)
    expect(isMonday(set)).toBe(true)
  })

  it('reports a readable error for a malformed import', async () => {
    render(<Settings />)
    const input = screen.getByLabelText(/import progress/i) as HTMLInputElement
    const file = new File(['{"version":1,"completed":"nope"}'], 'p.json', { type: 'application/json' })
    await userEvent.upload(input, file)
    expect(await screen.findByRole('alert')).toBeDefined()
  })

  it('leaves state untouched after a failed import', async () => {
    useProgress.getState().setStartDate('2026-09-07')
    render(<Settings />)
    const input = screen.getByLabelText(/import progress/i) as HTMLInputElement
    await userEvent.upload(input, new File(['not json'], 'p.json', { type: 'application/json' }))
    await screen.findByRole('alert')
    expect(useProgress.getState().startDate).toBe('2026-09-07')
  })

  it('requires confirmation before resetting', async () => {
    useProgress.getState().toggle('dsa-1-two-sum')
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /^reset progress$/i }))
    expect(useProgress.getState().completed['dsa-1-two-sum']).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /yes, erase everything/i }))
    expect(useProgress.getState().completed).toEqual({})
  })
})
