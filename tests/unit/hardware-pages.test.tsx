import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HardwareIndex, { hwSlug } from '@/components/HardwareIndex'
import HardwareTopic from '@/components/HardwareTopic'
import { hwTopics, hwQuestions } from '@/content/hardware'
import { generateStaticParams } from '@/app/hardware/[topic]/page'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('hardware index', () => {
  it('shows all seven topic cards in study order', () => {
    render(<HardwareIndex />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(hwTopics.length)
    expect(links).toHaveLength(7)

    const ordered = [...hwTopics].sort((a, b) => a.order - b.order)
    ordered.forEach((topic, i) => {
      expect(links[i].getAttribute('href')).toBe(`/hardware/${hwSlug(topic.id)}`)
      expect(links[i].textContent).toContain(topic.name)
    })
  })

  it('renders a real h1 and a meter per card', () => {
    render(<HardwareIndex />)
    expect(screen.getByRole('heading', { level: 1, name: /GPU \/ Hardware/i })).toBeDefined()
    expect(screen.getAllByRole('progressbar', { name: 'Questions' })).toHaveLength(7)
  })

  it('counts every question against the topic that owns it', () => {
    const counted = hwTopics.reduce(
      (n, t) => n + hwQuestions.filter((q) => q.topicId === t.id).length,
      0,
    )
    expect(counted).toBe(hwQuestions.length)
    expect(hwQuestions).toHaveLength(43)
  })
})

describe('hardware route params', () => {
  it('prerenders one slug per topic, matching the index links', () => {
    const params = generateStaticParams()
    expect(params.map((p) => p.topic).sort()).toEqual(hwTopics.map((t) => hwSlug(t.id)).sort())
  })

  it('strips only the hwt- prefix', () => {
    expect(hwSlug('hwt-memory-hierarchy')).toBe('memory-hierarchy')
    expect(hwSlug('hwt-gpu-vs-cpu')).toBe('gpu-vs-cpu')
    // Not a topic id, so it is left alone rather than half-stripped.
    expect(hwSlug('hwq-hbm-bandwidth')).toBe('hwq-hbm-bandwidth')
  })

  it('has no slug collisions', () => {
    const slugs = hwTopics.map((t) => hwSlug(t.id))
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('HardwareTopic', () => {
  // Memory hierarchy is the topic the e2e sweep walks, and every question in it
  // carries `numbers`.
  const withNumbers = hwQuestions
    .filter((q) => q.topicId === 'hwt-memory-hierarchy' && q.numbers)
    .slice(0, 2)

  it('hides answer, keyPoint and numbers by default', () => {
    render(<HardwareTopic questions={withNumbers} />)
    for (const q of withNumbers) {
      expect(screen.queryByText(q.answer)).toBeNull()
      expect(screen.queryByText(q.keyPoint)).toBeNull()
      for (const n of q.numbers ?? []) expect(screen.queryByText(n)).toBeNull()
    }
    expect(screen.queryAllByTestId('hw-numbers')).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: /reveal answer/i })).toHaveLength(
      withNumbers.length,
    )
  })

  it('reveals one question without affecting the others', async () => {
    render(<HardwareTopic questions={withNumbers} />)
    const toggles = screen.getAllByRole('button', { name: /reveal answer/i })
    await userEvent.click(toggles[0])

    expect(screen.getByText(withNumbers[0].answer)).toBeDefined()
    expect(screen.getByText(withNumbers[0].keyPoint)).toBeDefined()
    expect(screen.queryByText(withNumbers[1].answer)).toBeNull()
    expect(screen.queryAllByTestId('hw-numbers')).toHaveLength(1)
  })

  it('renders every cited figure in its own labelled block when revealed', async () => {
    render(<HardwareTopic questions={withNumbers} />)
    await userEvent.click(screen.getByRole('button', { name: /reveal all/i }))

    expect(screen.getAllByText('Numbers to cite')).toHaveLength(withNumbers.length)
    for (const q of withNumbers) {
      for (const n of q.numbers ?? []) expect(screen.getByText(n)).toBeDefined()
    }
  })

  it('keeps the figures separate from the answer prose and the key point', async () => {
    render(<HardwareTopic questions={[withNumbers[0]]} />)
    await userEvent.click(screen.getByRole('button', { name: /reveal answer/i }))

    const block = screen.getByTestId('hw-numbers')
    expect(block.textContent).not.toContain(withNumbers[0].answer)
    expect(block.textContent).not.toContain(withNumbers[0].keyPoint)
    expect(block.querySelectorAll('li')).toHaveLength(withNumbers[0].numbers!.length)
  })

  it('renders nothing extra for a question with no numbers', async () => {
    const bare = { ...withNumbers[0], id: 'hwq-test-bare', numbers: undefined }
    render(<HardwareTopic questions={[bare]} />)
    await userEvent.click(screen.getByRole('button', { name: /reveal answer/i }))

    expect(screen.getByText(bare.answer)).toBeDefined()
    expect(screen.queryByTestId('hw-numbers')).toBeNull()
    expect(screen.queryByText('Numbers to cite')).toBeNull()
  })

  it('reveal all shows every answer, and hide all puts them away', async () => {
    render(<HardwareTopic questions={withNumbers} />)
    await userEvent.click(screen.getByRole('button', { name: /reveal all/i }))
    for (const q of withNumbers) {
      expect(screen.getByText(q.answer)).toBeDefined()
      expect(screen.getByText(q.keyPoint)).toBeDefined()
    }

    await userEvent.click(screen.getByRole('button', { name: /hide all/i }))
    for (const q of withNumbers) expect(screen.queryByText(q.answer)).toBeNull()
    expect(screen.queryAllByTestId('hw-numbers')).toHaveLength(0)
  })

  it('revealing an answer does not check the checkbox, and checking does not reveal', async () => {
    render(<HardwareTopic questions={withNumbers} />)
    await userEvent.click(screen.getAllByRole('button', { name: /reveal answer/i })[0])
    expect(useProgress.getState().completed[withNumbers[0].id]).toBeFalsy()

    await userEvent.click(screen.getAllByRole('checkbox')[1])
    expect(useProgress.getState().completed[withNumbers[1].id]).toBeTruthy()
    expect(screen.queryByText(withNumbers[1].answer)).toBeNull()
  })
})
