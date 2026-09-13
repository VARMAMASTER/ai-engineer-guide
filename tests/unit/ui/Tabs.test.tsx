import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tabs, { type TabItem } from '@/components/ui/Tabs'

afterEach(cleanup)

const ITEMS: TabItem[] = [
  { id: 'arrays', label: 'Arrays', content: 'Two pointers, sliding window.' },
  { id: 'graphs', label: 'Graphs', content: 'BFS, DFS, topological sort.' },
  { id: 'dp', label: 'DP', content: 'Knapsack, LIS.' },
]

function tab(name: string) {
  return screen.getByRole('tab', { name })
}

describe('Tabs wiring', () => {
  it('points every tab at its panel and every panel back at its tab', () => {
    render(<Tabs items={ITEMS} label="Topics" />)
    for (const item of ITEMS) {
      const button = tab(item.label as string)
      const panel = document.getElementById(button.getAttribute('aria-controls')!)!
      expect(panel.getAttribute('role')).toBe('tabpanel')
      expect(panel.getAttribute('aria-labelledby')).toBe(button.id)
      expect(panel.textContent).toBe(item.content)
    }
  })

  it('selects the first tab and hides every other panel', () => {
    render(<Tabs items={ITEMS} label="Topics" />)
    expect(tab('Arrays').getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    const hidden = document.getElementById(tab('Graphs').getAttribute('aria-controls')!)!
    expect(hidden.hasAttribute('hidden')).toBe(true)
  })

  it('honours defaultValue', () => {
    render(<Tabs items={ITEMS} label="Topics" defaultValue="dp" />)
    expect(tab('DP').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toBe('Knapsack, LIS.')
  })
})

describe('Tabs roving tabindex', () => {
  it('keeps exactly one tab in the page tab order', async () => {
    const user = userEvent.setup()
    render(<Tabs items={ITEMS} label="Topics" />)
    const inOrder = () => screen.getAllByRole('tab').filter((t) => t.tabIndex === 0)

    expect(inOrder()).toEqual([tab('Arrays')])
    tab('Arrays').focus()
    await user.keyboard('{ArrowRight}')
    expect(inOrder()).toEqual([tab('Graphs')])
  })

  it('moves focus out of the tablist on Tab, not along it', async () => {
    const user = userEvent.setup()
    render(<Tabs items={ITEMS} label="Topics" />)
    tab('Arrays').focus()
    await user.tab()
    expect(document.activeElement?.getAttribute('role')).toBe('tabpanel')
    expect(document.activeElement?.textContent).toBe('Two pointers, sliding window.')
  })
})

describe('Tabs keyboard navigation', () => {
  it('walks right with ArrowRight and wraps at the end', async () => {
    const user = userEvent.setup()
    render(<Tabs items={ITEMS} label="Topics" />)
    tab('Arrays').focus()

    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('Graphs'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('DP'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('Arrays'))
  })

  it('walks left with ArrowLeft and wraps at the start', async () => {
    const user = userEvent.setup()
    render(<Tabs items={ITEMS} label="Topics" />)
    tab('Arrays').focus()

    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(tab('DP'))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(tab('Graphs'))
  })

  it('jumps to the ends with Home and End', async () => {
    const user = userEvent.setup()
    render(<Tabs items={ITEMS} label="Topics" />)
    tab('Graphs').focus()

    await user.keyboard('{End}')
    expect(document.activeElement).toBe(tab('DP'))
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(tab('Arrays'))
  })

  it('skips a disabled tab when arrowing', async () => {
    const user = userEvent.setup()
    const items: TabItem[] = [
      ITEMS[0],
      { ...ITEMS[1], disabled: true },
      ITEMS[2],
    ]
    render(<Tabs items={items} label="Topics" />)
    tab('Arrays').focus()

    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('DP'))
  })
})

describe('Tabs activation', () => {
  it('selects as focus moves when activation is automatic', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs items={ITEMS} label="Topics" onChange={onChange} />)
    tab('Arrays').focus()

    await user.keyboard('{ArrowRight}')
    expect(tab('Graphs').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toBe('BFS, DFS, topological sort.')
    expect(onChange).toHaveBeenCalledWith('graphs')
  })

  it('moves focus without selecting when activation is manual', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs items={ITEMS} label="Topics" activation="manual" onChange={onChange} />)
    tab('Arrays').focus()

    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('Graphs'))
    expect(tab('Graphs').getAttribute('aria-selected')).toBe('false')
    expect(tab('Arrays').getAttribute('aria-selected')).toBe('true')
    expect(onChange).not.toHaveBeenCalled()

    await user.keyboard('{Enter}')
    expect(tab('Graphs').getAttribute('aria-selected')).toBe('true')
    expect(onChange).toHaveBeenCalledWith('graphs')
  })

  it('selects on click in either mode', async () => {
    const user = userEvent.setup()
    render(<Tabs items={ITEMS} label="Topics" activation="manual" />)
    await user.click(tab('DP'))
    expect(tab('DP').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toBe('Knapsack, LIS.')
  })
})

describe('Tabs controlled', () => {
  it('reports changes and renders the value it is given', async () => {
    const user = userEvent.setup()
    function Controlled() {
      const [value, setValue] = useState('arrays')
      return (
        <>
          <Tabs items={ITEMS} label="Topics" value={value} onChange={setValue} />
          <p>value: {value}</p>
        </>
      )
    }
    render(<Controlled />)
    await user.click(tab('Graphs'))
    expect(screen.getByText('value: graphs')).toBeTruthy()
    expect(tab('Graphs').getAttribute('aria-selected')).toBe('true')
  })

  it('follows the selection when the owner changes it from outside', async () => {
    const user = userEvent.setup()
    function Controlled() {
      const [value, setValue] = useState('arrays')
      return (
        <>
          <button type="button" onClick={() => setValue('dp')}>
            Jump to DP
          </button>
          <Tabs items={ITEMS} label="Topics" value={value} onChange={setValue} />
        </>
      )
    }
    render(<Controlled />)
    await user.click(screen.getByRole('button', { name: 'Jump to DP' }))
    expect(tab('DP').getAttribute('aria-selected')).toBe('true')
    // The roving tabindex followed the new selection, so Tab lands on DP.
    expect(tab('DP').tabIndex).toBe(0)
    expect(tab('Arrays').tabIndex).toBe(-1)
  })
})
