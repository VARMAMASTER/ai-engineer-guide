import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dialog from '@/components/ui/Dialog'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-sheet')
  document.body.removeAttribute('style')
})

function Harness({ startOpen = false }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog">
        Open dialog
      </button>
      <button type="button">Behind the dialog</button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Reset progress"
        description="This erases every completed item."
        footer={
          <button type="button" onClick={() => setOpen(false)}>
            Yes, erase everything
          </button>
        }
      >
        <button type="button">Read the export guide</button>
      </Dialog>
    </>
  )
}

async function open() {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'Open dialog' }))
  return { user, dialog: screen.getByRole('dialog', { name: 'Reset progress' }) }
}

describe('Dialog', () => {
  it('renders nothing until it is opened', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Open dialog' }).getAttribute('aria-expanded')).toBe(
      'false',
    )
  })

  it('is a named modal with a described body', async () => {
    const { dialog } = await open()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const describedBy = dialog.getAttribute('aria-describedby')!
    expect(document.getElementById(describedBy)?.textContent).toBe(
      'This erases every completed item.',
    )
  })

  it('moves focus into the overlay on open', async () => {
    const { dialog } = await open()
    expect(document.activeElement).toBe(dialog)
  })

  it('returns focus to the trigger when Escape closes it', async () => {
    const { user } = await open()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open dialog' }))
  })

  it('returns focus to the trigger when the close button is used', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open dialog' }))
  })

  it('closes when the scrim is clicked', async () => {
    const { user, dialog } = await open()
    const scrim = dialog.closest('[data-overlay]')!.querySelector('[aria-hidden="true"]')!
    await user.click(scrim)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('wraps Tab from the last control back to the first', async () => {
    const { user } = await open()
    const confirm = screen.getByRole('button', { name: 'Yes, erase everything' })
    confirm.focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  })

  it('wraps Shift+Tab from the first control back to the last', async () => {
    const { user } = await open()
    screen.getByRole('button', { name: 'Close' }).focus()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Yes, erase everything' }))
  })

  it('never lets Tab reach the page behind it', async () => {
    const { user } = await open()
    const behind = screen.getByRole('button', { name: 'Behind the dialog' })
    for (let i = 0; i < 8; i += 1) {
      await user.tab()
      expect(document.activeElement).not.toBe(behind)
      expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Open dialog' }))
    }
  })

  it('tabs forward through every control in the overlay', async () => {
    const { user } = await open()
    const names = ['Close', 'Read the export guide', 'Yes, erase everything']
    for (const name of names) {
      await user.tab()
      expect((document.activeElement as HTMLElement).textContent).toBe(
        screen.getByRole('button', { name }).textContent,
      )
    }
  })

  it('marks the rest of the page inert while open and restores it on close', async () => {
    const { user } = await open()
    const outside = Array.from(document.body.children).filter(
      (el) => !el.hasAttribute('data-overlay'),
    )
    expect(outside.length).toBeGreaterThan(0)
    expect(outside.every((el) => el.hasAttribute('inert'))).toBe(true)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(outside.some((el) => el.hasAttribute('inert'))).toBe(false)
  })

  it('drops every other glass layer to solid while it is open', async () => {
    const { user } = await open()
    expect(document.documentElement.getAttribute('data-sheet')).toBe('open')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.documentElement.getAttribute('data-sheet')).toBeNull()
  })

  it('locks the body and restores the exact scroll position on close', async () => {
    const scrollTo = vi.fn()
    const realScrollTo = window.scrollTo
    Object.defineProperty(window, 'scrollTo', { value: scrollTo, configurable: true, writable: true })
    Object.defineProperty(window, 'scrollY', { value: 742, configurable: true, writable: true })
    document.body.style.overflow = 'visible'

    try {
      const { user } = await open()
      expect(document.body.style.overflow).toBe('hidden')
      expect(document.body.style.position).toBe('fixed')
      expect(document.body.style.top).toBe('-742px')

      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      // Restored to exactly what was there before, not to a computed value.
      expect(document.body.style.overflow).toBe('visible')
      expect(document.body.style.position).toBe('')
      expect(document.body.style.top).toBe('')
      expect(scrollTo).toHaveBeenCalledWith(0, 742)
    } finally {
      Object.defineProperty(window, 'scrollTo', {
        value: realScrollTo,
        configurable: true,
        writable: true,
      })
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
    }
  })

  it('unlocks the body when it is unmounted while still open', () => {
    const view = render(<Harness startOpen />)
    expect(document.body.style.overflow).toBe('hidden')
    view.unmount()
    expect(document.body.style.overflow).toBe('')
    expect(document.documentElement.getAttribute('data-sheet')).toBeNull()
  })
})
