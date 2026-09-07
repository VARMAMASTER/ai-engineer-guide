import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BehaviouralIndex from '@/components/BehaviouralIndex'
import BehaviouralPrinciples from '@/components/BehaviouralPrinciples'
import BehaviouralQuestions from '@/components/BehaviouralQuestions'
import BehaviouralStories, { StoryCoverage } from '@/components/BehaviouralStories'
import BehaviouralPage from '@/app/behavioural/page'
import { behaviouralPrinciples, behaviouralQuestions, storySlots } from '@/content/behavioural'
import { content, byId } from '@/lib/content/index'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'
import { useStories, STORY_STORAGE_KEY, filledFields, isDrafted } from '@/lib/progress/stories'

const AMAZON = behaviouralPrinciples.filter((p) => p.company === 'amazon')

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
  useStories.setState({ drafts: {} })
})

describe('registration', () => {
  it('puts all three behavioural banks on `content` and in `byId`', () => {
    expect(content.behaviouralPrinciples).toHaveLength(29)
    expect(content.behaviouralQuestions).toHaveLength(50)
    expect(content.storySlots).toHaveLength(15)
    for (const item of [...behaviouralPrinciples, ...behaviouralQuestions, ...storySlots]) {
      expect(byId.get(item.id), `${item.id} should resolve`).toBeDefined()
    }
  })
})

describe('the behavioural route', () => {
  it('renders exactly one h1', () => {
    render(BehaviouralPage())
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Behavioural')
  })

  it('opens on Principles and can be switched to each other bank', async () => {
    const user = userEvent.setup()
    render(<BehaviouralIndex />)

    const tabs = screen.getByRole('tablist', { name: 'Behavioural banks' })
    expect(within(tabs).getAllByRole('tab')).toHaveLength(3)
    expect(within(tabs).getByRole('tab', { name: /Principles/ }).getAttribute('aria-selected')).toBe('true')

    await user.click(within(tabs).getByRole('tab', { name: /Stories/ }))
    expect(screen.getByText(storySlots[0].title)).toBeDefined()

    await user.click(within(tabs).getByRole('tab', { name: /Questions/ }))
    expect(screen.getByRole('progressbar', { name: 'Answered out loud' })).toBeDefined()
  })

  it('keeps the coverage view outside the tabs, so it is on screen whichever bank is open', async () => {
    const user = userEvent.setup()
    render(<BehaviouralIndex />)
    const heading = 'Which principles can you actually answer?'
    expect(screen.getByRole('heading', { name: heading })).toBeDefined()

    await user.click(screen.getByRole('tab', { name: /Questions/ }))
    expect(screen.getByRole('heading', { name: heading })).toBeDefined()
  })

  it('jumps to the stories tab from the coverage call to action', async () => {
    const user = userEvent.setup()
    render(<BehaviouralIndex />)
    await user.click(screen.getByRole('button', { name: 'Draft a story' }))
    expect(screen.getByRole('tab', { name: /Stories/ }).getAttribute('aria-selected')).toBe('true')
  })
})

describe('principles', () => {
  it('groups all 29 by company and shows every weak answer verbatim', () => {
    render(<BehaviouralPrinciples />)
    expect(screen.getAllByTestId('weak-answer')).toHaveLength(29)
    for (const company of ['Amazon', 'Google', 'Meta', 'General']) {
      expect(screen.getByRole('heading', { level: 3, name: new RegExp(`^${company}`) })).toBeDefined()
    }
    const first = AMAZON[0]
    expect(screen.getByText(`“${first.weakAnswer}”`)).toBeDefined()
  })

  it('renders all 16 Amazon leadership principles', () => {
    expect(AMAZON).toHaveLength(16)
    render(<BehaviouralPrinciples />)
    for (const p of AMAZON) {
      expect(screen.getByRole('heading', { level: 4, name: p.name })).toBeDefined()
    }
  })

  it('narrows to one company when its chip is pressed', async () => {
    const user = userEvent.setup()
    render(<BehaviouralPrinciples />)
    await user.click(screen.getByRole('button', { name: /^Amazon/ }))
    expect(screen.getAllByTestId('weak-answer')).toHaveLength(AMAZON.length)
    expect(screen.queryByRole('heading', { level: 3, name: /^Google/ })).toBeNull()
  })
})

describe('questions', () => {
  it('lists all 50 with their traps showing and their probes hidden', () => {
    render(<BehaviouralQuestions />)
    const reveals = screen.getAllByRole('button', { name: /Reveal the follow-ups/ })
    expect(reveals).toHaveLength(50)

    const q = behaviouralQuestions[0]
    expect(screen.getByText(q.traps[0])).toBeDefined()
    for (const probe of q.probes) expect(screen.queryByText(probe)).toBeNull()
  })

  it('reveals one question’s probes without revealing any other’s', async () => {
    const user = userEvent.setup()
    render(<BehaviouralQuestions />)
    const [first] = screen.getAllByRole('button', { name: /Reveal the follow-ups/ })
    await user.click(first)

    for (const probe of behaviouralQuestions[0].probes) {
      expect(screen.getByText(probe)).toBeDefined()
    }
    for (const probe of behaviouralQuestions[1].probes) {
      expect(screen.queryByText(probe)).toBeNull()
    }
    expect(first.getAttribute('aria-expanded')).toBe('true')
  })

  it('filters by company, then by a principle scoped to that company', async () => {
    const user = userEvent.setup()
    render(<BehaviouralQuestions />)

    await user.click(screen.getByRole('button', { name: /^Amazon/ }))
    const select = screen.getByLabelText('Principle') as HTMLSelectElement
    const values = Array.from(select.options).map((o) => o.value)
    expect(values).toContain('all')
    expect(values.filter((v) => v !== 'all')).toEqual(AMAZON.map((p) => p.id))

    const target = AMAZON[0]
    await user.selectOptions(select, target.id)
    const expected = behaviouralQuestions.filter((q) => q.principleIds.includes(target.id))
    expect(expected.length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Reveal the follow-ups/ })).toHaveLength(
      expected.length,
    )
  })

  it('resets the principle filter when the company changes, so the list can never read empty', async () => {
    const user = userEvent.setup()
    render(<BehaviouralQuestions />)
    await user.click(screen.getByRole('button', { name: /^Amazon/ }))
    await user.selectOptions(screen.getByLabelText('Principle'), AMAZON[0].id)
    await user.click(screen.getByRole('button', { name: /^Meta/ }))
    expect((screen.getByLabelText('Principle') as HTMLSelectElement).value).toBe('all')
  })

  it('counts a question checked off into the meter', () => {
    useProgress.setState({ completed: { [behaviouralQuestions[0].id]: '2026-09-07' } })
    render(<BehaviouralQuestions />)
    const meter = screen.getByRole('progressbar', { name: 'Answered out loud' })
    expect(meter.getAttribute('aria-valuenow')).toBe('1')
    expect(meter.getAttribute('aria-valuemax')).toBe('50')
  })
})

describe('story drafts', () => {
  it('renders all 15 slots with their four STAR prompts behind a reveal', async () => {
    const user = userEvent.setup()
    render(<BehaviouralStories />)
    expect(screen.getAllByRole('button', { name: /Draft this story/ })).toHaveLength(15)

    const story = storySlots[0]
    expect(screen.queryByText(story.prompts.situation)).toBeNull()

    const [first] = screen.getAllByRole('button', { name: /Draft this story/ })
    await user.click(first)
    for (const field of ['situation', 'task', 'action', 'result'] as const) {
      expect(screen.getByText(story.prompts[field])).toBeDefined()
    }
    expect(screen.getAllByRole('textbox')).toHaveLength(4)
  })

  it('writes a draft to its own storage key, separate from `completed`', async () => {
    const user = userEvent.setup()
    render(<BehaviouralStories />)
    const [first] = screen.getAllByRole('button', { name: /Draft this story/ })
    await user.click(first)

    const situation = screen.getAllByRole('textbox')[0]
    await user.type(situation, 'Retrieval broke at 2am.')

    const story = storySlots[0]
    expect(useStories.getState().drafts[story.id].situation).toBe('Retrieval broke at 2am.')
    expect(useProgress.getState().completed[story.id]).toBeUndefined()

    const raw = window.localStorage.getItem(STORY_STORAGE_KEY)
    expect(raw, 'the draft should be persisted under its own key').not.toBeNull()
    expect(JSON.parse(raw!).state.drafts[story.id].situation).toBe('Retrieval broke at 2am.')
  })

  it('restores a draft that was already in storage', () => {
    const story = storySlots[1]
    useStories.setState({
      drafts: { [story.id]: { situation: 'Kept', task: '', action: '', result: '' } },
    })
    render(<BehaviouralStories />)
    const card = document.querySelector(`[data-story-id="${story.id}"]`)!
    expect(card.getAttribute('data-drafted')).toBe('true')
    expect(within(card as HTMLElement).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1')
  })

  it('clears one draft without touching the others', async () => {
    const user = userEvent.setup()
    const [a, b] = storySlots
    useStories.setState({
      drafts: {
        [a.id]: { situation: 'A', task: '', action: '', result: '' },
        [b.id]: { situation: 'B', task: '', action: '', result: '' },
      },
    })
    render(<BehaviouralStories />)
    const card = document.querySelector(`[data-story-id="${a.id}"]`) as HTMLElement
    await user.click(within(card).getByRole('button', { name: /Continue this draft/ }))
    await user.click(within(card).getByRole('button', { name: 'Clear this draft' }))

    expect(useStories.getState().drafts[a.id]).toBeUndefined()
    expect(useStories.getState().drafts[b.id].situation).toBe('B')
  })

  it('counts a field as written only when it holds more than whitespace', () => {
    expect(filledFields({ situation: '   ', task: '', action: '', result: '' })).toBe(0)
    expect(isDrafted({ situation: '   ', task: '', action: '', result: '' })).toBe(false)
    expect(isDrafted({ situation: 'x', task: '', action: '', result: '' })).toBe(true)
  })
})

describe('principle coverage', () => {
  it('starts with every principle uncovered and names each one', () => {
    render(<StoryCoverage />)
    expect(screen.getByTestId('uncovered-count').textContent).toBe('29 of 29')
    for (const p of AMAZON) {
      expect(screen.getAllByText(p.name).length).toBeGreaterThan(0)
    }
  })

  it('drops the principles a drafted story covers off the gap list', () => {
    const story = storySlots[0]
    useStories.setState({
      drafts: { [story.id]: { situation: 'Something real', task: '', action: '', result: '' } },
    })
    render(<StoryCoverage />)
    expect(screen.getByTestId('uncovered-count').textContent).toBe(
      `${29 - story.covers.length} of 29`,
    )
    const coveredNames = story.covers.map((id) => byId.get(id)) as { name: string }[]
    for (const p of coveredNames) {
      expect(screen.queryByText(p.name), `${p.name} should be covered`).toBeNull()
    }
  })

  it('meters the Amazon leadership principles against their own 16', () => {
    render(<StoryCoverage />)
    const meter = screen.getByRole('progressbar', { name: 'Amazon principles with a story' })
    expect(meter.getAttribute('aria-valuemax')).toBe('16')
    expect(meter.getAttribute('aria-valuenow')).toBe('0')
  })

  it('counts drafted stories, not stories that merely exist', () => {
    useStories.setState({
      drafts: { [storySlots[0].id]: { situation: 'x', task: '', action: '', result: '' } },
    })
    render(<StoryCoverage />)
    const meter = screen.getByRole('progressbar', { name: 'Stories drafted' })
    expect(meter.getAttribute('aria-valuenow')).toBe('1')
    expect(meter.getAttribute('aria-valuemax')).toBe('15')
  })
})
