import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tooltip from '@/components/ui/Tooltip'

afterEach(cleanup)

function setup() {
  const user = userEvent.setup()
  render(
    <Tooltip label="Copied ids are stable across exports.">
      <button type="button" aria-label="Copy id">
        #
      </button>
    </Tooltip>,
  )
  return { user, trigger: screen.getByRole('button', { name: 'Copy id' }) }
}

describe('Tooltip', () => {
  it('shows nothing and describes nothing until it is triggered', () => {
    const { trigger } = setup()
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(trigger.hasAttribute('aria-describedby')).toBe(false)
  })

  it('opens on keyboard focus, not only on hover', async () => {
    const { user, trigger } = setup()
    await user.tab()
    expect(document.activeElement).toBe(trigger)

    const tip = screen.getByRole('tooltip')
    expect(tip.textContent).toBe('Copied ids are stable across exports.')
    expect(trigger.getAttribute('aria-describedby')).toBe(tip.id)
  })

  it('closes when focus leaves', async () => {
    const { user } = setup()
    await user.tab()
    expect(screen.getByRole('tooltip')).toBeTruthy()
    await user.tab()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('opens on hover and closes when the pointer leaves', async () => {
    const { user, trigger } = setup()
    await user.hover(trigger)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    await user.unhover(trigger)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('is dismissible with Escape without moving focus off the trigger', async () => {
    const { user, trigger } = setup()
    await user.tab()
    expect(screen.getByRole('tooltip')).toBeTruthy()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBeNull()
    // Escape dismissed the tooltip, not the user's place on the page.
    expect(document.activeElement).toBe(trigger)
    expect(trigger.hasAttribute('aria-describedby')).toBe(false)
  })

  it('stays dismissed while the trigger keeps focus, and returns on the next visit', async () => {
    const { user, trigger } = setup()
    await user.tab()
    await user.keyboard('{Escape}')
    // Still focused: a re-render must not put it straight back.
    await user.keyboard('a')
    expect(screen.queryByRole('tooltip')).toBeNull()

    trigger.blur()
    await user.tab()
    expect(screen.getByRole('tooltip')).toBeTruthy()
  })

  it('describes the trigger rather than naming it', async () => {
    const { user, trigger } = setup()
    await user.tab()
    // The button's own label survives — a tooltip is never a control's name,
    // because a reader who never hovers or focuses it would meet a blank.
    expect(trigger.getAttribute('aria-label')).toBe('Copy id')
    expect(screen.getByRole('button', { name: 'Copy id' })).toBeTruthy()
  })
})
