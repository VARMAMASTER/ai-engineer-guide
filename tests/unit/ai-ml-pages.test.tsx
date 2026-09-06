import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TopicIndex from '@/components/TopicIndex'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('AI/ML index', () => {
  it('shows ten topic cards in study order', () => {
    render(<TopicIndex />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(10)
    expect(links[0].textContent).toMatch(/statistics/i)
    expect(links[9].textContent).toMatch(/agents/i)
  })

  it('states that a question is checked only when it can be answered cold', () => {
    render(<TopicIndex />)
    expect(screen.getByText(/answer it cold, without notes/i)).toBeDefined()
  })
})
