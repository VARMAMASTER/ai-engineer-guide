import { describe, it, expect, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sheet from '@/components/ui/Sheet'
import Dialog from '@/components/ui/Dialog'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-sheet')
  document.body.removeAttribute('style')
})

function Harness({ titleHidden = false }: { titleHidden?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="more-sheet"
      >
        More
      </button>
      <button type="button">Behind the sheet</button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="More sections"
        titleHidden={titleHidden}
        data-testid="more-sheet"
      >
        <a href="#hardware">Hardware</a>
        <a href="#scenarios">Scenarios</a>
      </Sheet>
    </>
  )
}

/** A dialog opened from inside a sheet — the stacking case. */
function StackedHarness() {
  const [sheet, setSheet] = useState(false)
  const [dialog, setDialog] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setSheet(true)}>
        Open sheet
      </button>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Settings">
        <button type="button" onClick={() => setDialog(true)}>
          Reset progress
        </button>
      </Sheet>
      <Dialog open={dialog} onClose={() => setDialog(false)} title="Are you sure?" />
    </>
  )
}

async function open() {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'More' }))
  return { user, sheet: screen.getByRole('dialog', { name: 'More sections' }) }
}

describe('Sheet', () => {
  it('is a named modal and marks its trigger expanded', async () => {
    const { sheet } = await open()
    expect(sheet.getAttribute('aria-modal')).toBe('true')
    expect(sheet.getAttribute('role')).toBe('dialog')
    expect(screen.getByRole('button', { name: 'More' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('keeps the accessible name when the title is visually hidden', async () => {
    const user = userEvent.setup()
    render(<Harness titleHidden />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    const sheet = screen.getByRole('dialog', { name: 'More sections' })
    const title = document.getElementById(sheet.getAttribute('aria-labelledby')!)
    expect(title?.className).toContain('sr-only')
    expect(title?.textContent).toBe('More sections')
  })

  it('moves focus into the sheet on open', async () => {
    const { sheet } = await open()
    expect(document.activeElement).toBe(sheet)
  })

  it('returns focus to the trigger on Escape', async () => {
    const { user } = await open()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByRole('button', { name: 'More' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('traps Tab across every link in the sheet and wraps at both ends', async () => {
    const { user } = await open()
    const close = screen.getByRole('button', { name: 'Close' })
    const hardware = screen.getByRole('link', { name: 'Hardware' })
    const scenarios = screen.getByRole('link', { name: 'Scenarios' })

    await user.tab()
    expect(document.activeElement).toBe(close)
    await user.tab()
    expect(document.activeElement).toBe(hardware)
    await user.tab()
    expect(document.activeElement).toBe(scenarios)
    await user.tab()
    expect(document.activeElement).toBe(close)
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(scenarios)
  })

  it('closes on the scrim and returns focus', async () => {
    const { user, sheet } = await open()
    const scrim = sheet.parentElement!.querySelector('[aria-hidden="true"]')!
    await user.click(scrim)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More' }))
  })

  it('locks the body and drops the other glass layers while open', async () => {
    const { user } = await open()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.getAttribute('data-sheet')).toBe('open')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('')
    expect(document.documentElement.getAttribute('data-sheet')).toBeNull()
  })

  it('gives the close button a 44px target', async () => {
    await open()
    // `.btn` is the 2.75rem-tall vocabulary; min-w-11 makes the icon-only
    // variant square rather than a 16px sliver.
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.className).toContain('btn')
    expect(close.className).toContain('min-w-11')
  })
})

describe('stacked overlays', () => {
  it('Escape closes only the topmost overlay and the body stays locked', async () => {
    const user = userEvent.setup()
    render(<StackedHarness />)
    await user.click(screen.getByRole('button', { name: 'Open sheet' }))
    await user.click(screen.getByRole('button', { name: 'Reset progress' }))

    expect(screen.getByRole('dialog', { name: 'Are you sure?' })).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Are you sure?' })).toBeNull())

    // The sheet underneath survives, and so does the lock it owns.
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.getAttribute('data-sheet')).toBe('open')

    // Focus came back to the control inside the sheet that opened the dialog.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset progress' }))

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('')
  })
})
