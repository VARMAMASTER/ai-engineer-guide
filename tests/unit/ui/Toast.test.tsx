import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast, { ToastProvider, useToast, type ToastOptions } from '@/components/ui/Toast'

afterEach(cleanup)

function Trigger({ label, ...options }: ToastOptions & { label: string }) {
  const { show } = useToast()
  return (
    <button type="button" onClick={() => show(options)}>
      {label}
    </button>
  )
}

function politeRegion() {
  return screen.getByRole('status')
}

function assertiveRegion() {
  return screen.getByRole('alert')
}

describe('Toast live regions', () => {
  it('mounts both regions before any toast exists', () => {
    render(<ToastProvider />)
    const polite = politeRegion()
    const assertive = assertiveRegion()
    expect(polite.getAttribute('aria-live')).toBe('polite')
    expect(assertive.getAttribute('aria-live')).toBe('assertive')
    // Empty, but present — a region inserted along with its message is a
    // region several screen readers never announce.
    expect(polite.textContent).toBe('')
    expect(assertive.textContent).toBe('')
  })

  it('announces a normal message politely', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Trigger label="Save" message="Progress saved." />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(within(politeRegion()).getByText('Progress saved.')).toBeTruthy()
    expect(within(assertiveRegion()).queryByText('Progress saved.')).toBeNull()
  })

  it('announces an error assertively', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Trigger label="Break it" message="Import failed." tone="error" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Break it' }))
    expect(within(assertiveRegion()).getByText('Import failed.')).toBeTruthy()
    expect(within(politeRegion()).queryByText('Import failed.')).toBeNull()
  })

  it('never moves focus', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Trigger label="Save" message="Progress saved." />
      </ToastProvider>,
    )
    const trigger = screen.getByRole('button', { name: 'Save' })
    await user.click(trigger)
    expect(screen.getByText('Progress saved.')).toBeTruthy()
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps only the most recent toasts', async () => {
    const user = userEvent.setup()
    function Many() {
      const { show } = useToast()
      return (
        <button
          type="button"
          onClick={() => {
            for (const n of [1, 2, 3]) show({ message: `Message ${n}`, duration: null })
          }}
        >
          Flood
        </button>
      )
    }
    render(
      <ToastProvider limit={2}>
        <Many />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Flood' }))
    expect(screen.queryByText('Message 1')).toBeNull()
    expect(screen.getByText('Message 2')).toBeTruthy()
    expect(screen.getByText('Message 3')).toBeTruthy()
  })
})

describe('Toast dismissal', () => {
  it('is dismissible from the keyboard', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Trigger label="Save" message="Progress saved." duration={null} />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const dismiss = screen.getByRole('button', { name: 'Dismiss' })
    dismiss.focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByText('Progress saved.')).toBeNull()
  })

  it('runs an action without dismissing anything behind the user', async () => {
    const user = userEvent.setup()
    const undo = vi.fn()
    function WithAction() {
      const { show } = useToast()
      return (
        <button
          type="button"
          onClick={() => show({ message: 'Item removed.', duration: null, action: { label: 'Undo', onClick: undo } })}
        >
          Remove
        </button>
      )
    }
    render(
      <ToastProvider>
        <WithAction />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undo).toHaveBeenCalledOnce()
  })
})

describe('Toast auto-dismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * `fireEvent`, not `user-event`, in this block: user-event queues its own
   * waits on the clock and deadlocks against `advanceTimersByTime`. The clock
   * is the thing under test here, so it wins.
   */
  function setup(options: ToastOptions) {
    render(
      <ToastProvider>
        <Trigger label="Save" {...options} />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    return screen.getByText(options.message).closest('[data-tone]') as HTMLElement
  }

  function tick(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  it('dismisses itself when the time is up', () => {
    setup({ message: 'Progress saved.', duration: 5000 })

    tick(4999)
    expect(screen.getByText('Progress saved.')).toBeTruthy()
    tick(2)
    expect(screen.queryByText('Progress saved.')).toBeNull()
  })

  it('stays up forever when the duration is null', () => {
    setup({ message: 'Progress saved.', duration: null })
    tick(60_000)
    expect(screen.getByText('Progress saved.')).toBeTruthy()
  })

  it('pauses under the pointer and resumes with the time that was left', () => {
    const toast = setup({ message: 'Progress saved.', duration: 5000 })

    tick(3000)
    fireEvent.mouseOver(toast)
    tick(60_000)
    expect(screen.getByText('Progress saved.')).toBeTruthy()

    fireEvent.mouseOut(toast)
    tick(1500)
    // 2000ms were left when the pointer arrived — not the whole 5000 again.
    expect(screen.getByText('Progress saved.')).toBeTruthy()
    tick(600)
    expect(screen.queryByText('Progress saved.')).toBeNull()
  })

  it('pauses while focus is inside it', () => {
    setup({ message: 'Progress saved.', duration: 5000 })

    act(() => {
      screen.getByRole('button', { name: 'Dismiss' }).focus()
    })
    tick(60_000)
    expect(screen.getByText('Progress saved.')).toBeTruthy()

    act(() => {
      ;(document.activeElement as HTMLElement).blur()
    })
    tick(5001)
    expect(screen.queryByText('Progress saved.')).toBeNull()
  })
})

describe('Toast on its own', () => {
  it('renders the message and its controls without a provider', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Standalone." duration={null} onDismiss={onDismiss} />)
    expect(screen.getByText('Standalone.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy()
    // No live region of its own: the provider's region is what announces.
    expect(screen.queryByRole('status')).toBeNull()
  })
})
