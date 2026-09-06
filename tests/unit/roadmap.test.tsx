import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoadmapTimeline from '@/components/RoadmapTimeline'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('Roadmap', () => {
  it('lists six months', () => {
    render(<RoadmapTimeline />)
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(screen.getByText(new RegExp(`month ${n}`, 'i'))).toBeDefined()
    }
  })

  it('names the month 1 build project', () => {
    render(<RoadmapTimeline />)
    expect(screen.getByText(/Production RAG/i)).toBeDefined()
  })

  it('expands month 1 into four weeks with day tasks', async () => {
    render(<RoadmapTimeline />)
    await userEvent.click(screen.getByRole('button', { name: /month 1/i }))
    expect(await screen.findByText(/week 1/i)).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: /week 1/i }))
    expect(await screen.findByText(/Contains Duplicate/)).toBeDefined()
  })

  it('expands a later month to week targets only', async () => {
    render(<RoadmapTimeline />)
    await userEvent.click(screen.getByRole('button', { name: /month 5/i }))
    expect(await screen.findByText(/week 18/i)).toBeDefined()
  })
})
