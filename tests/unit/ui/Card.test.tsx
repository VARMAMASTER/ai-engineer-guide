import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Card from '@/components/ui/Card'

afterEach(cleanup)

describe('Card', () => {
  it('renders a real anchor when given an href, and it is keyboard reachable', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">before</button>
        <Card href="/dsa/two-sum">Two Sum</Card>
      </>,
    )
    const link = screen.getByRole('link', { name: 'Two Sum' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/dsa/two-sum')

    const before = screen.getByRole('button', { name: 'before' })
    await user.tab()
    expect(document.activeElement).toBe(before)
    await user.tab()
    expect(document.activeElement).toBe(link)
  })

  it('renders a real button when as="button", so it responds to Enter/Space and gets a click handler', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Card as="button" onClick={onClick}>
        Start mock
      </Card>,
    )
    const button = screen.getByRole('button', { name: 'Start mock' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')

    button.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('falls back to a plain div when neither href nor as="button" is given', () => {
    const { container } = render(<Card>static</Card>)
    const el = container.firstElementChild as HTMLElement
    expect(el.tagName).toBe('DIV')
  })

  it('always composes the panel and card surface classes', () => {
    const { container } = render(<Card className="p-4">x</Card>)
    const el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('panel')).toBe(true)
    expect(el.classList.contains('card')).toBe(true)
  })

  it('merges className rather than clobbering it, on every variant', () => {
    const { container, rerender } = render(<Card className="gap-3">div variant</Card>)
    let el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('gap-3')).toBe(true)
    expect(el.classList.contains('panel')).toBe(true)

    rerender(<Card as="button" className="gap-3" onClick={() => {}}>button variant</Card>)
    el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('gap-3')).toBe(true)

    rerender(<Card href="/x" className="gap-3">link variant</Card>)
    el = container.firstElementChild as HTMLElement
    expect(el.classList.contains('gap-3')).toBe(true)
  })

  it('forwards the ref through to the rendered element for each variant', () => {
    let divNode: HTMLDivElement | null = null
    const { unmount: unmountDiv } = render(
      <Card
        ref={(r) => {
          divNode = r as HTMLDivElement
        }}
      >
        x
      </Card>,
    )
    expect(divNode && (divNode as HTMLDivElement).tagName).toBe('DIV')
    unmountDiv()

    let linkNode: HTMLAnchorElement | null = null
    render(
      <Card
        href="/y"
        ref={(r) => {
          linkNode = r as HTMLAnchorElement
        }}
      >
        y
      </Card>,
    )
    expect(linkNode && (linkNode as HTMLAnchorElement).tagName).toBe('A')
  })
})
