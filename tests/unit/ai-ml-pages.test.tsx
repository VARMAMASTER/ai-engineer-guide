import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TopicIndex from '@/components/TopicIndex'
import TopicQuestions from '@/components/TopicQuestions'
import { topicQuestions } from '@/content/ai-ml'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('AI/ML index', () => {
  it('shows ten topic cards in study order', () => {
    render(<TopicIndex />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(10)
    expect(links[0].textContent).toMatch(/statistics/i)
    expect(links[9].textContent).toMatch(/agents/i)
  })

  it('states that a question is checked only when it can be answered cold', () => {
    render(<TopicIndex />)
    expect(screen.getByText(/answer it cold, without notes/i)).toBeDefined()
  })
})

describe('TopicQuestions', () => {
  const questions = topicQuestions.filter((q) => q.topicId === 'topic-transformers').slice(0, 2)

  it('hides answer and keyPoint by default', () => {
    render(<TopicQuestions questions={questions} />)
    for (const q of questions) {
      expect(screen.queryByText(q.answer)).toBeNull()
      expect(screen.queryByText(q.keyPoint)).toBeNull()
    }
    expect(screen.getAllByRole('button', { name: /reveal answer/i })).toHaveLength(questions.length)
  })

  it('reveals one question without affecting the others', async () => {
    render(<TopicQuestions questions={questions} />)
    const toggles = screen.getAllByRole('button', { name: /reveal answer/i })
    await userEvent.click(toggles[0])

    expect(screen.getByText(questions[0].answer)).toBeDefined()
    expect(screen.getByText(questions[0].keyPoint)).toBeDefined()
    expect(screen.queryByText(questions[1].answer)).toBeNull()
  })

  it('reveal all shows every answer, and hide all puts them away', async () => {
    render(<TopicQuestions questions={questions} />)
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
    render(<TopicQuestions questions={questions} />)
    const toggles = screen.getAllByRole('button', { name: /reveal answer/i })
    await userEvent.click(toggles[0])
    expect(useProgress.getState().completed[questions[0].id]).toBeFalsy()

    await userEvent.click(screen.getAllByRole('checkbox')[1])
    expect(useProgress.getState().completed[questions[1].id]).toBeTruthy()
    expect(screen.queryByText(questions[1].answer)).toBeNull()
  })

  it('gives the keyPoint a distinct label from the answer prose', async () => {
    render(<TopicQuestions questions={questions} />)
    await userEvent.click(screen.getByRole('button', { name: /reveal all/i }))
    expect(screen.getAllByText('Key point')).toHaveLength(questions.length)
  })
})
