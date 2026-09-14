import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

let path = '/today'
vi.mock('next/navigation', () => ({
  usePathname: () => path,
}))

import AppSwitcher, { appForPath } from '@/components/AppSwitcher'
import { NAV_APPS, SETTINGS_ITEM } from '@/lib/nav'
import { NAV_ICON_NAMES } from '@/components/NavIcon'

/* ============================================================================
   What this file is for.
   ----------------------------------------------------------------------------
   The switcher is the only way out of a page when the app is installed as a
   PWA — Chrome draws no back button in `display: standalone`. So these test the
   things that would strand a user there: that it opens from a keyboard, that
   Escape gives focus back rather than dropping it on the body, that the arrow
   keys reach every app, and that nothing focusable is left behind once it
   closes.

   What is NOT here, because jsdom cannot answer it honestly: whether the
   trigger is really 44px, whether the sheet is really the surface below 768px,
   whether `inert` really stops focus, and whether the page scrolls sideways at
   390px. Those are in `tests/e2e/app-switcher.spec.ts`, run in a real engine.
   ========================================================================== */

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  path = '/today'
  document.documentElement.removeAttribute('data-sheet')
  document.body.removeAttribute('style')
})

/** jsdom implements no matchMedia, so desktop has to be stated explicitly. */
function stubViewport(desktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('768px') ? desktop : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }))
}

function trigger() {
  return screen.getByRole('button', { name: /switch app/i })
}

async function open(at = '/today', desktop = false) {
  path = at
  stubViewport(desktop)
  const user = userEvent.setup()
  render(<AppSwitcher />)
  await user.click(trigger())
  const menu = await screen.findByRole('menu', { name: 'Apps' })
  return { user, menu }
}

function items() {
  return screen.getAllByRole('menuitem')
}

describe('AppSwitcher — the trigger', () => {
  it('is a disclosure button that names the app you are in', async () => {
    path = '/diet'
    stubViewport(false)
    render(<AppSwitcher />)
    const button = trigger()
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.getAttribute('data-app')).toBe('diet')
    expect(button.textContent).toContain('Diet')
  })

  it('names the OWNING app from inside a section, not the section', async () => {
    // `/dsa` is a section of Learn. The switcher is level one: it says Learn.
    path = '/dsa/arrays-hashing'
    stubViewport(false)
    render(<AppSwitcher />)
    expect(trigger().textContent).toContain('Learn')
    expect(trigger().getAttribute('data-app')).toBe('learn')
  })

  it('falls back to Settings and then to a neutral label off the tab bar', async () => {
    path = SETTINGS_ITEM.href
    stubViewport(false)
    const { unmount } = render(<AppSwitcher />)
    expect(trigger().textContent).toContain('Settings')
    unmount()

    path = '/kit'
    render(<AppSwitcher />)
    expect(trigger().textContent).toContain('Apps')
    expect(trigger().getAttribute('data-app')).toBe('')
  })

  it('points aria-controls at the menu only while it is open', async () => {
    const { user } = await open()
    const id = trigger().getAttribute('aria-controls')
    expect(id).toBeTruthy()
    expect(document.getElementById(id!)).toBe(screen.getByRole('menu', { name: 'Apps' }))

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(trigger().getAttribute('aria-controls')).toBeNull()
  })

  it('opens from Enter and from Space, not only from a pointer', async () => {
    stubViewport(false)
    const user = userEvent.setup()
    render(<AppSwitcher />)

    trigger().focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('menu', { name: 'Apps' })).toBeTruthy()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

    trigger().focus()
    await user.keyboard(' ')
    expect(await screen.findByRole('menu', { name: 'Apps' })).toBeTruthy()
  })
})

describe('AppSwitcher — what is in the menu', () => {
  it('lists all five apps and Settings, in tab-bar order', async () => {
    await open()
    expect(items().map((el) => el.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      ...NAV_APPS.map((a) => a.label),
      SETTINGS_ITEM.label,
    ])
  })

  it('links each row at the route that app actually lands on', async () => {
    await open()
    expect(items().map((el) => el.getAttribute('href'))).toEqual([
      ...NAV_APPS.map((a) => a.href),
      SETTINGS_ITEM.href,
    ])
  })

  it('does NOT list sections — the switcher is one level', async () => {
    // Opened from inside Learn, where fourteen sections exist and are already
    // on screen in the section strip. A twenty-row sheet on a phone is the
    // failure this is guarding against.
    await open('/dsa')
    expect(items()).toHaveLength(NAV_APPS.length + 1)
    expect(screen.queryByRole('menuitem', { name: /Arrays/ })).toBeNull()
  })

  it('draws an icon on every row, from the guarded icon set', async () => {
    await open()
    for (const [i, row] of items().entries()) {
      const key = row.getAttribute('data-app')!
      expect(NAV_ICON_NAMES, `no glyph for ${key}`).toContain(key)
      expect(row.querySelector('svg'), `row ${i} rendered no icon`).not.toBeNull()
    }
  })

  it('separates Settings from the apps: it belongs to no app', async () => {
    const { menu } = await open()
    expect(within(menu).getAllByRole('separator')).toHaveLength(1)
  })
})

describe('AppSwitcher — marking where you are', () => {
  it('marks exactly one row aria-current, and it is the app you are in', async () => {
    await open('/roadmap')
    const marked = items().filter((el) => el.getAttribute('aria-current') === 'true')
    expect(marked).toHaveLength(1)
    expect(marked[0].getAttribute('data-app')).toBe('learn')
  })

  it('marks Settings when that is where you are', async () => {
    await open(SETTINGS_ITEM.href)
    const marked = items().filter((el) => el.getAttribute('aria-current') === 'true')
    expect(marked).toHaveLength(1)
    expect(marked[0].getAttribute('href')).toBe(SETTINGS_ITEM.href)
  })

  it('does not rely on colour alone — the state is in the DOM', async () => {
    await open('/train')
    const row = items().find((el) => el.getAttribute('data-app') === 'train')!
    expect(row.getAttribute('aria-current')).toBe('true')
    expect(row.getAttribute('data-current')).toBe('true')
  })

  it('marks nothing when the route belongs to no app', async () => {
    await open('/kit')
    expect(items().filter((el) => el.getAttribute('aria-current') === 'true')).toHaveLength(0)
  })
})

describe('AppSwitcher — keyboard', () => {
  it('lands focus on the row you are already on', async () => {
    await open('/ops')
    await waitFor(() =>
      expect((document.activeElement as HTMLElement)?.getAttribute('data-app')).toBe('ops'),
    )
  })

  it('moves down and up with the arrows, wrapping at both ends', async () => {
    const { user } = await open('/today')
    const rows = items()
    await waitFor(() => expect(document.activeElement).toBe(rows[0]))

    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(rows[1])
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(rows[2])
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(rows[1])

    // Up from the first row wraps to the last, which is Settings.
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(rows[0])
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(rows[rows.length - 1])
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(rows[0])
  })

  it('jumps to the ends with Home and End', async () => {
    const { user } = await open('/diet')
    const rows = items()
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(rows[rows.length - 1])
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(rows[0])
  })

  it('keeps one tab stop: the arrows own the list, Tab does not walk it', async () => {
    await open('/train')
    const rows = items()
    const tabbable = rows.filter((el) => el.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0].getAttribute('data-app')).toBe('train')
  })

  it('closes on Escape and gives focus back to the trigger', async () => {
    const { user } = await open('/diet')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(document.activeElement).toBe(trigger())
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })

  it('leaves nothing focusable behind once it is closed', async () => {
    const { user } = await open()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(screen.queryAllByRole('menuitem')).toEqual([])
    expect(document.querySelectorAll('[data-testid="app-switcher-item"]')).toHaveLength(0)
  })
})

describe('AppSwitcher — the two surfaces', () => {
  it('is a bottom sheet below 768px, where the thumb is', async () => {
    await open('/today', false)
    const dialog = screen.getByRole('dialog', { name: 'Switch app' })
    expect(dialog.className).toContain('raised')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    // The sheet's own dismissal, for a thumb that does not want the scrim.
    expect(screen.getByRole('button', { name: 'Close app switcher' })).toBeTruthy()
  })

  it('is a dropdown at 768px and up — no sheet, no dialog', async () => {
    await open('/today', true)
    expect(screen.queryByRole('dialog')).toBeNull()
    const panel = screen.getByTestId('app-switcher-panel')
    expect(panel.className).toContain('raised')
    expect(panel.className).toContain('fixed')
    // Anchored to the trigger rather than pinned to an edge.
    expect(panel.style.width).toBe('248px')
  })

  it('renders exactly one menu at a time, never a CSS-hidden second copy', async () => {
    await open('/today', false)
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(document.querySelectorAll('[data-testid="app-switcher-menu"]')).toHaveLength(1)
  })

  it('spends the blur budget through the existing switch, both ways', async () => {
    // `:root[data-sheet="open"]` is what drops the top bar, rail and tab bar to
    // solid. Set by `useModalOverlay`, so the overlay is the only blurred layer.
    const { user } = await open('/today', true)
    expect(document.documentElement.getAttribute('data-sheet')).toBe('open')
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-sheet')).toBeNull(),
    )
  })

  it('makes the page behind it inert rather than merely aria-hidden', async () => {
    await open('/today', false)
    const behind = [...document.body.children].filter((el) => !el.hasAttribute('data-overlay'))
    expect(behind.length).toBeGreaterThan(0)
    for (const el of behind) expect(el.hasAttribute('inert')).toBe(true)
  })
})

describe('AppSwitcher — choosing an app', () => {
  it('closes when a row is chosen', async () => {
    const { user } = await open('/today')
    await user.click(screen.getAllByRole('menuitem')[2])
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })
})

describe('appForPath', () => {
  it('places an app landing page, a section, and a page inside a section', () => {
    expect(appForPath('/today')?.id).toBe('today')
    expect(appForPath('/dsa')?.id).toBe('learn')
    expect(appForPath('/dsa/arrays-hashing')?.id).toBe('learn')
    expect(appForPath('/ops')?.id).toBe('ops')
  })

  it('places nothing outside the tab bar', () => {
    expect(appForPath(SETTINGS_ITEM.href)).toBeUndefined()
    expect(appForPath('/kit')).toBeUndefined()
    expect(appForPath('/offline')).toBeUndefined()
    expect(appForPath('/')).toBeUndefined()
  })

  it('agrees with the nav model for every app it ships', () => {
    for (const app of NAV_APPS) {
      expect(appForPath(app.href)?.id, app.id).toBe(app.id)
      for (const section of app.sections) {
        expect(appForPath(section.href)?.id, section.href).toBe(app.id)
      }
    }
  })
})
