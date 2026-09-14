import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}))

import CommandPalette, {
  openCommandPalette,
  resetCommandPalette,
} from '@/components/CommandPalette'
import { DESTINATIONS, resetSearchIndex, searchIndexBuildCount } from '@/lib/search/index'

/* These test BEHAVIOUR, not markup: that the chord opens it, that focus goes
   back where it came from, that the highlight moves without focus moving, that
   Enter navigates, and that the index is built once. A test that asserted class
   names would pass with a palette nobody could drive from a keyboard. */

/** A page with a trigger button and an ordinary text field to type into. */
function Harness() {
  return (
    <>
      <button type="button" onClick={() => openCommandPalette()}>
        Open search
      </button>
      <label>
        Notes
        <input type="text" />
      </label>
      <CommandPalette />
    </>
  )
}

async function openWithChord() {
  const user = userEvent.setup()
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Open search' })
  trigger.focus()
  await user.keyboard('{Control>}k{/Control}')
  const combobox = await screen.findByRole('combobox', { name: 'Search the guide' })
  return { user, trigger, combobox }
}

function options() {
  return within(screen.getByRole('listbox')).getAllByRole('option')
}

beforeEach(() => {
  push.mockClear()
})

afterEach(() => {
  resetCommandPalette()
  cleanup()
  document.documentElement.removeAttribute('data-sheet')
  document.body.removeAttribute('style')
})

describe('opening and closing', () => {
  it('renders nothing at all until it is opened', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('opens on Ctrl+K from anywhere on the page', async () => {
    const { combobox } = await openWithChord()
    expect(combobox).toBeTruthy()
    expect(document.activeElement).toBe(combobox)
  })

  it('opens on Cmd+K, for the machine this is actually used on', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.keyboard('{Meta>}k{/Meta}')
    expect(await screen.findByRole('combobox', { name: 'Search the guide' })).toBeTruthy()
  })

  it('opens imperatively, so a button can trigger it without a prop drill', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    expect(await screen.findByRole('combobox', { name: 'Search the guide' })).toBeTruthy()
  })

  it('closes on Escape and puts focus back on whatever opened it', async () => {
    const { user, trigger, combobox } = await openWithChord()
    expect(document.activeElement).toBe(combobox)

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('closes from the close button and still returns focus to the trigger', async () => {
    const { user, trigger } = await openWithChord()
    await user.click(screen.getByRole('button', { name: 'Close search' }))
    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('starts from an empty query on the next open', async () => {
    const { user, combobox } = await openWithChord()
    await user.type(combobox, 'two sum')
    expect((combobox as HTMLInputElement).value).toBe('two sum')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull())

    await user.keyboard('{Control>}k{/Control}')
    const reopened = await screen.findByRole('combobox', { name: 'Search the guide' })
    expect((reopened as HTMLInputElement).value).toBe('')
  })

  it('is the only blurred layer while it is up', async () => {
    const { user } = await openWithChord()
    expect(document.documentElement.getAttribute('data-sheet')).toBe('open')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(document.documentElement.getAttribute('data-sheet')).toBeNull())
  })
})

describe('not hijacking the keyboard', () => {
  it('does not open when a bare "k" is typed into an ordinary input', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const notes = screen.getByLabelText('Notes')

    await user.click(notes)
    await user.type(notes, 'knapsack')

    expect(screen.queryByRole('combobox')).toBeNull()
    expect((notes as HTMLInputElement).value).toBe('knapsack')
  })

  it('stands aside for the chord too while the caret is in a text field', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByLabelText('Notes'))
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('does not open on a bare "k" pressed on the page body', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.keyboard('k')
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})

describe('the combobox contract', () => {
  it('wires the input to the listbox it controls', async () => {
    const { combobox } = await openWithChord()
    expect(combobox.getAttribute('aria-expanded')).toBe('true')
    expect(combobox.getAttribute('aria-autocomplete')).toBe('list')

    const listbox = screen.getByRole('listbox')
    expect(combobox.getAttribute('aria-controls')).toBe(listbox.id)
    expect(options().length).toBeGreaterThan(0)
  })

  it('moves the highlight with the arrow keys WITHOUT moving focus off the input', async () => {
    const { user, combobox } = await openWithChord()
    const rows = options()
    expect(combobox.getAttribute('aria-activedescendant')).toBe(rows[0].id)
    expect(rows[0].getAttribute('aria-selected')).toBe('true')

    await user.keyboard('{ArrowDown}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(rows[1].id)
    expect(options()[1].getAttribute('aria-selected')).toBe('true')
    expect(options()[0].getAttribute('aria-selected')).toBe('false')
    // The thing everybody gets wrong: the highlight moved, focus did not.
    expect(document.activeElement).toBe(combobox)

    await user.keyboard('{ArrowUp}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(rows[0].id)
    expect(document.activeElement).toBe(combobox)
  })

  it('wraps at both ends and jumps with Home and End', async () => {
    const { user, combobox } = await openWithChord()
    const rows = options()
    const last = rows[rows.length - 1].id

    await user.keyboard('{ArrowUp}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(last)
    await user.keyboard('{ArrowDown}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(rows[0].id)

    await user.keyboard('{End}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(last)
    await user.keyboard('{Home}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(rows[0].id)
    expect(document.activeElement).toBe(combobox)
  })

  it('points aria-activedescendant at an element that actually exists', async () => {
    const { user, combobox } = await openWithChord()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    const id = combobox.getAttribute('aria-activedescendant')!
    const target = document.getElementById(id)
    expect(target).toBeTruthy()
    expect(target!.getAttribute('role')).toBe('option')
  })

  it('announces the result count in a live region as it changes', async () => {
    const { user, combobox } = await openWithChord()
    const live = screen.getByRole('status')
    expect(live.getAttribute('aria-live')).toBe('polite')

    await user.type(combobox, 'two sum')
    await waitFor(() => expect(live.textContent).toMatch(/^\d+ results?$/))

    const before = live.textContent
    await user.type(combobox, ' zzzz')
    await waitFor(() => expect(live.textContent).not.toBe(before))
    expect(live.textContent).toBe('0 results')
  })
})

describe('finding things and going to them', () => {
  it('lists every section when nothing has been typed yet', async () => {
    await openWithChord()
    const labels = options().map((o) => o.textContent ?? '')
    expect(labels.some((l) => l.includes('Today'))).toBe(true)
    expect(labels.some((l) => l.includes('DSA'))).toBe(true)
    expect(labels.some((l) => l.includes('Settings'))).toBe(true)
  })

  it('puts the exact title match first for a real content query', async () => {
    const { user, combobox } = await openWithChord()
    await user.type(combobox, 'two sum')
    await waitFor(() => expect(options()[0].textContent).toContain('Two Sum'))
    // Not "Two Sum II", not "Sum of Two Integers".
    expect(options()[0].textContent).toContain('DSA problem')
    expect(within(options()[0]).getByText('Two Sum')).toBeTruthy()
  })

  it('navigates to the highlighted result on Enter, and closes', async () => {
    const { user, combobox } = await openWithChord()
    await user.type(combobox, 'two sum')
    await waitFor(() => expect(options()[0].textContent).toContain('Two Sum'))

    await user.keyboard('{Enter}')

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1))
    expect(push.mock.calls[0][0]).toMatch(/^\/dsa\//)
    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull())
  })

  it('navigates to the SECOND result when the arrow key moved the highlight there', async () => {
    const { user, combobox } = await openWithChord()
    await waitFor(() => expect(options().length).toBeGreaterThan(1))
    // Enter must follow the highlight, not the list — the bug this catches is
    // an Enter handler that always takes results[0].
    expect(DESTINATIONS[0].href).not.toBe(DESTINATIONS[1].href)

    await user.keyboard('{ArrowDown}')
    expect(combobox.getAttribute('aria-activedescendant')).toBe(options()[1].id)
    await user.keyboard('{Enter}')

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1))
    expect(push.mock.calls[0][0]).toBe(DESTINATIONS[1].href)
  })

  it('reports no expanded listbox when a query matches nothing', async () => {
    const { user, combobox } = await openWithChord()
    await user.type(combobox, 'zzzzqqqq')
    await waitFor(() => expect(combobox.getAttribute('aria-expanded')).toBe('false'))
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(combobox.getAttribute('aria-activedescendant')).toBeNull()
  })

  it('goes to a section from the no-query list', async () => {
    const { user } = await openWithChord()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1))
    expect(push.mock.calls[0][0]).toBe('/today')
  })

  it('says what to do when nothing matches, not just "no results"', async () => {
    const { user, combobox } = await openWithChord()
    await user.type(combobox, 'zzzzqqqq')

    const escape = await screen.findByRole('button', { name: /clear and show every section/i })
    expect(screen.getByText(/Nothing matches/)).toBeTruthy()
    expect(screen.getByText(/Try a shorter word/)).toBeTruthy()

    await user.click(escape)
    expect((combobox as HTMLInputElement).value).toBe('')
    await waitFor(() => expect(options().length).toBeGreaterThan(0))
  })
})

describe('the index', () => {
  it('is built once, not once per keystroke and not once per open', async () => {
    resetSearchIndex()
    expect(searchIndexBuildCount()).toBe(0)

    const { user, combobox } = await openWithChord()
    await user.type(combobox, 'two sum')
    await waitFor(() => expect(options()[0].textContent).toContain('Two Sum'))
    expect(searchIndexBuildCount()).toBe(1)

    // Seven more keystrokes, and a close-and-reopen. Still one build.
    await user.type(combobox, ' ii')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull())
    await user.keyboard('{Control>}k{/Control}')
    const reopened = await screen.findByRole('combobox', { name: 'Search the guide' })
    await user.type(reopened, 'kv cache')
    await waitFor(() => expect(options().length).toBeGreaterThan(0))

    expect(searchIndexBuildCount()).toBe(1)
  })

  it('is not built at all while the palette has never been opened', async () => {
    resetSearchIndex()
    render(<Harness />)
    // A full render of the page with the palette mounted: no build, so nothing
    // of the content banks is parsed on first paint.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open search' })).toBeTruthy())
    expect(searchIndexBuildCount()).toBe(0)
  })
})
