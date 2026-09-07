import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CsFundamentalsIndex from '@/components/CsFundamentalsIndex'
import CsFundamentalsTopic from '@/components/CsFundamentalsTopic'
import { csTopics, csQuestions } from '@/content/cs-fundamentals'
import { slugOf, idFromSlug } from '@/lib/content/ids'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('CS fundamentals index', () => {
  it('shows five topic cards in study order', () => {
    render(<CsFundamentalsIndex />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(5)
    expect(links[0].textContent).toMatch(/operating systems/i)
    expect(links[1].textContent).toMatch(/networking/i)
    expect(links[4].textContent).toMatch(/oop/i)
  })

  it('links each card to the topic route, id minus its cst- prefix', () => {
    render(<CsFundamentalsIndex />)
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/cs-fundamentals/os',
      '/cs-fundamentals/networking',
      '/cs-fundamentals/databases',
      '/cs-fundamentals/concurrency',
      '/cs-fundamentals/oop',
    ])
  })

  it('meters every topic against its own question count, starting at zero done', () => {
    render(<CsFundamentalsIndex />)
    const bars = screen.getAllByRole('progressbar', { name: 'Questions' })
    expect(bars).toHaveLength(5)
    const totals = bars.map((b) => Number(b.getAttribute('aria-valuemax')))
    expect(totals).toEqual(
      csTopics
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((t) => csQuestions.filter((q) => q.topicId === t.id).length),
    )
    expect(totals.reduce((n, t) => n + t, 0)).toBe(70)
    for (const bar of bars) expect(bar.getAttribute('aria-valuenow')).toBe('0')
  })

  it('counts a checked question against its topic once hydrated', async () => {
    const first = csQuestions.find((q) => q.topicId === 'cst-networking')!
    useProgress.setState({ completed: { [first.id]: '2026-09-07' } })
    render(<CsFundamentalsIndex />)
    const bars = screen.getAllByRole('progressbar', { name: 'Questions' })
    // Networking is order 2, so the second card.
    expect(bars[1].getAttribute('aria-valuenow')).toBe('1')
    expect(bars[0].getAttribute('aria-valuenow')).toBe('0')
  })

  it('slugs round-trip back to the topic ids the route resolves', () => {
    for (const topic of csTopics) {
      expect(idFromSlug('cst', slugOf(topic.id))).toBe(topic.id)
    }
  })
})

describe('CsFundamentalsTopic', () => {
  const questions = csQuestions.filter((q) => q.topicId === 'cst-os').slice(0, 2)

  it('hides answer and keyPoint by default', () => {
    render(<CsFundamentalsTopic questions={questions} />)
    for (const q of questions) {
      expect(screen.queryByText(q.answer)).toBeNull()
      expect(screen.queryByText(q.keyPoint)).toBeNull()
    }
    expect(screen.getAllByRole('button', { name: /reveal answer/i })).toHaveLength(questions.length)
  })

  it('renders every question text as a checkbox row', () => {
    render(<CsFundamentalsTopic questions={questions} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(questions.length)
    for (const q of questions) {
      expect(screen.getByRole('checkbox', { name: q.text })).toBeDefined()
    }
  })

  it('reveals one question without affecting the others', async () => {
    render(<CsFundamentalsTopic questions={questions} />)
    const toggles = screen.getAllByRole('button', { name: /reveal answer/i })
    await userEvent.click(toggles[0])

    expect(screen.getByText(questions[0].answer)).toBeDefined()
    expect(screen.getByText(questions[0].keyPoint)).toBeDefined()
    expect(screen.queryByText(questions[1].answer)).toBeNull()
  })

  it('reveal all shows every answer, and hide all puts them away', async () => {
    render(<CsFundamentalsTopic questions={questions} />)
    await userEvent.click(screen.getByRole('button', { name: /reveal all/i }))
    for (const q of questions) {
      expect(screen.getByText(q.answer)).toBeDefined()
      expect(screen.getByText(q.keyPoint)).toBeDefined()
    }

    await userEvent.click(screen.getByRole('button', { name: /hide all/i }))
    for (const q of questions) {
      expect(screen.queryByText(q.answer)).toBeNull()
    }
  })

  it('revealing an answer does not check the checkbox, and checking does not reveal', async () => {
    render(<CsFundamentalsTopic questions={questions} />)
    const toggles = screen.getAllByRole('button', { name: /reveal answer/i })
    await userEvent.click(toggles[0])
    expect(useProgress.getState().completed[questions[0].id]).toBeFalsy()

    await userEvent.click(screen.getAllByRole('checkbox')[1])
    expect(useProgress.getState().completed[questions[1].id]).toBeTruthy()
    expect(screen.queryByText(questions[1].answer)).toBeNull()
  })

  it('gives the keyPoint a distinct label from the answer prose', async () => {
    render(<CsFundamentalsTopic questions={questions} />)
    await userEvent.click(screen.getByRole('button', { name: /reveal all/i }))
    expect(screen.getAllByText('Key point')).toHaveLength(questions.length)
  })

  it('tags a question with the companies that ask it, and nothing when there are none', () => {
    const tagged = csQuestions.find((q) => q.companies.includes('amazon') && q.companies.includes('meta'))!
    const untagged = csQuestions.find((q) => q.companies.length === 0)!
    render(<CsFundamentalsTopic questions={[tagged, untagged]} />)

    expect(screen.getAllByText('Amazon')).toHaveLength(1)
    expect(screen.getAllByText('Meta')).toHaveLength(1)
    expect(screen.queryByText('Google')).toBeNull()
  })

  it('renders nothing but the list when a topic has no questions', () => {
    render(<CsFundamentalsTopic questions={[]} />)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    // With no questions there is nothing to reveal, so the bulk control must
    // not claim everything is already open.
    expect(screen.getByRole('button', { name: /reveal all/i })).toBeDefined()
  })
})
