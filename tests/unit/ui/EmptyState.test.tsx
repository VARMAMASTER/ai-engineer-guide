import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmptyState from '@/components/ui/EmptyState'

afterEach(cleanup)

describe('EmptyState', () => {
  it('renders the title and an optional description', () => {
    render(
      <EmptyState
        title="No stories yet"
        description="Add your first behavioural story to get started."
        action={<button type="button">Add story</button>}
      />,
    )
    expect(screen.getByText('No stories yet')).toBeTruthy()
    expect(screen.getByText('Add your first behavioural story to get started.')).toBeTruthy()
  })

  it('always renders the action slot — an empty state is never a dead end', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <EmptyState
        title="No mocks run yet"
        action={
          <button type="button" onClick={onClick}>
            Start a mock
          </button>
        }
      />,
    )
    const button = screen.getByRole('button', { name: 'Start a mock' })
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders without a description when none is given', () => {
    const { container } = render(
      <EmptyState title="Nothing here" action={<button type="button">Go</button>} />,
    )
    // Only one <p>, for the title — no empty description paragraph left behind.
    expect(container.querySelectorAll('p').length).toBe(1)
  })

  it('merges className onto the outer empty block', () => {
    const { container } = render(
      <EmptyState
        title="X"
        action={<button type="button">Y</button>}
        className="my-8"
      />,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('empty')).toBe(true)
    expect(el.classList.contains('my-8')).toBe(true)
  })
})
