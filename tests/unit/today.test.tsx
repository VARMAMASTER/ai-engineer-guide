import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodayTasks from '@/components/TodayTasks'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'
import { todayIso } from '@/lib/date'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('Today', () => {
  it('asks the user to set a start date when none is set', () => {
    render(<TodayTasks />)
    expect(screen.getByText(/set your start date/i)).toBeDefined()
  })

  it('renders day 1 tasks when the start date is today', async () => {
    useProgress.getState().setStartDate(todayIso())
    render(<TodayTasks />)
    expect(await screen.findByText(/day 1 of 180/i)).toBeDefined()
    expect(screen.getByText(/Contains Duplicate/)).toBeDefined()
  })

  it('checking a task updates the store', async () => {
    useProgress.getState().setStartDate(todayIso())
    render(<TodayTasks />)
    const boxes = await screen.findAllByRole('checkbox')
    await userEvent.click(boxes[0])
    expect(Object.keys(useProgress.getState().completed).length).toBe(1)
  })

  it('shows the four month 1 meters', async () => {
    useProgress.getState().setStartDate(todayIso())
    render(<TodayTasks />)
    expect(await screen.findByText(/problems solved/i)).toBeDefined()
    expect(screen.getByText(/patterns covered/i)).toBeDefined()
    expect(screen.getByText(/milestones accepted/i)).toBeDefined()
    expect(screen.getByText(/defense docs/i)).toBeDefined()
  })

  it('falls back to week targets past day 30', async () => {
    const { addDays } = await import('@/lib/date')
    useProgress.getState().setStartDate(addDays(todayIso(), -40))
    render(<TodayTasks />)
    expect(await screen.findByText(/this week/i)).toBeDefined()
  })
})
