import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectDetail from '@/components/ProjectDetail'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('Project detail', () => {
  it('shows the goal, four milestones, and seven defense docs', () => {
    render(<ProjectDetail projectId="proj-rag" />)
    // The project goal, not a milestone title, is the target here — milestone 2
    // is also named "Hybrid retrieval, reranking..." so match the goal's own
    // phrasing to keep this assertion pointed at the right element.
    expect(screen.getByText(/with hybrid retrieval/i)).toBeDefined()
    expect(screen.getAllByText(/milestone \d/i)).toHaveLength(4)
    // Anchored: milestone 4's title itself ends in "...defense docs", which
    // would also satisfy a bare /doc/i match against the wrong checkboxes.
    expect(screen.getAllByRole('checkbox', { name: /^doc:/i })).toHaveLength(7)
  })

  it('shows acceptance criteria for a milestone', () => {
    render(<ProjectDetail projectId="proj-rag" />)
    // The gold eval set acceptance criterion for milestone 1 names the exact
    // count of questions between "gold eval set" and "is committed" — allow
    // that gap rather than requiring the two phrases to be contiguous.
    expect(screen.getByText(/gold eval set.*is committed/i)).toBeDefined()
  })

  it('lists the defense questions', () => {
    render(<ProjectDetail projectId="proj-rag" />)
    expect(screen.getByText(/why hybrid retrieval over dense alone/i)).toBeDefined()
  })

  it('toggles a milestone', async () => {
    render(<ProjectDetail projectId="proj-rag" />)
    const boxes = screen.getAllByRole('checkbox')
    await userEvent.click(boxes[0])
    expect(Object.keys(useProgress.getState().completed).length).toBe(1)
  })
})
