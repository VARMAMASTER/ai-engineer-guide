import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SdIndex from '@/components/SdIndex'
import QuestionFramework from '@/components/QuestionFramework'
import { sdQuestions } from '@/content/system-design'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

/**
 * Mermaid is mocked for the same reason `tests/unit/mermaid.test.tsx` mocks it:
 * the real library needs `SVGElement.getBBox`, which jsdom does not implement.
 * What these tests care about is that the diagram is mounted only once the
 * answer is revealed, which the mock is enough to observe.
 */
const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  parse: vi.fn(async () => true),
  render: vi.fn(async (id: string) => ({ svg: `<svg data-id="${id}"><g /></svg>` })),
}))

vi.mock('mermaid', () => ({ default: mermaid }))

const GENERAL = sdQuestions.find((q) => q.id === 'sdq-rate-limiter')!
const ML = sdQuestions.find((q) => q.patternId.startsWith('mlp-'))!

const GENERAL_HEADINGS = [
  'Define the problem',
  'Data model',
  'Core components',
  'Scale and consistency',
  'Deploy and operate',
  'Wrap up',
]
const ML_HEADINGS = [
  'Define the problem',
  'Data pipeline',
  'Model architecture',
  'Train and evaluate',
  'Deploy and monitor',
  'Wrap up',
]

/** Expand the question. The first button in the row is always its own toggle. */
async function expand() {
  await userEvent.click(screen.getAllByRole('button')[0])
  expect(screen.getAllByRole('button')[0].getAttribute('aria-expanded')).toBe('true')
}

async function reveal() {
  await userEvent.click(screen.getByRole('button', { name: /show reference answer/i }))
}

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
  vi.clearAllMocks()
})

describe('System design index', () => {
  it('shows a General group and an ML group of ten each', () => {
    render(<SdIndex />)
    expect(screen.getByRole('heading', { name: /general/i })).toBeDefined()
    expect(screen.getByRole('heading', { name: /ml (and|&) llm/i })).toBeDefined()
    expect(screen.getAllByRole('link')).toHaveLength(20)
  })
})

describe('QuestionFramework: the practice side', () => {
  it('renders the six general steps with their prompts', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await expand()

    for (const name of GENERAL_HEADINGS) {
      expect(screen.getAllByRole('heading', { name })).toHaveLength(1)
    }
    expect(screen.getByText(GENERAL.steps.define[0])).toBeDefined()
  })

  it('uses the ML wording, and only the ML wording, for an ML question', async () => {
    render(<QuestionFramework question={ML} />)
    await expand()

    for (const name of ML_HEADINGS) {
      expect(screen.getAllByRole('heading', { name })).toHaveLength(1)
    }
    for (const name of ['Data model', 'Core components', 'Scale and consistency']) {
      expect(screen.queryByRole('heading', { name })).toBeNull()
    }
  })

  it('shows the phase budget with every phase and the total', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await expand()

    for (const label of [
      'Requirements',
      'Estimates',
      'API and data',
      'Architecture',
      'Deep dive',
      'Wrap up',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(`${GENERAL.minutes}m total`)).toBeDefined()
    // The cumulative marks run to the full length of the round.
    expect(screen.getByText(`by ${GENERAL.minutes}m`)).toBeDefined()
  })

  it('shows the opening sentence before the question is attempted', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await expand()
    expect(screen.getByText(GENERAL.delivery.opening)).toBeDefined()
  })

  it('toggles its own checkbox', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(useProgress.getState().completed['sdq-rate-limiter']).toBeTruthy()
  })
})

describe('QuestionFramework: the reveal', () => {
  it('keeps the answer out of the DOM when the question is merely expanded', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await expand()

    expect(screen.queryByTestId('sd-answer')).toBeNull()
    expect(screen.queryByText(GENERAL.solution.define)).toBeNull()
    expect(screen.queryByText(GENERAL.solution.numbers[0])).toBeNull()
    expect(screen.queryByText(GENERAL.delivery.traps[0])).toBeNull()
    expect(screen.queryByText(GENERAL.delivery.whenPushed[0].challenge)).toBeNull()
    expect(screen.queryByTestId('mermaid')).toBeNull()

    const button = screen.getByRole('button', { name: /show reference answer/i })
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('reveals the solution, the numbers and the diagram on request', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await expand()
    await reveal()

    const answer = screen.getByTestId('sd-answer')
    expect(within(answer).getByText(GENERAL.solution.define)).toBeDefined()
    expect(within(answer).getByText(GENERAL.solution.wrapup)).toBeDefined()
    for (const n of GENERAL.solution.numbers) {
      expect(within(answer).getByText(n)).toBeDefined()
    }
    expect(within(answer).getByText(GENERAL.delivery.traps[0])).toBeDefined()
    expect(within(answer).getByText(GENERAL.delivery.whenPushed[0].challenge)).toBeDefined()
    expect(within(answer).getByText(GENERAL.delivery.whenPushed[0].answer)).toBeDefined()
    expect(await within(answer).findByTestId('mermaid')).toBeDefined()
  })

  it('keys the revealed answer to the same six step headings', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await expand()
    await reveal()

    const answer = screen.getByTestId('sd-answer')
    for (const name of GENERAL_HEADINGS) {
      expect(within(answer).getByRole('heading', { name })).toBeDefined()
    }
  })

  it('renders the numbers in a monospace block, since they are arithmetic', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await expand()
    await reveal()

    const list = screen.getByText(GENERAL.solution.numbers[0]).closest('ul')
    expect(list?.className).toContain('font-mono')
  })

  it('hides the answer again when asked', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await expand()
    await reveal()
    expect(screen.getByTestId('sd-answer')).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: /hide reference answer/i }))
    expect(screen.queryByTestId('sd-answer')).toBeNull()
  })

  it('does not spring open when the question is expanded again', async () => {
    render(<QuestionFramework question={GENERAL} />)
    await expand()
    await reveal()
    expect(screen.getByTestId('sd-answer')).toBeDefined()

    // Collapse, then expand: the reveal must have gone back to closed, or the
    // answer would be sitting in front of the prompts on the second visit.
    await userEvent.click(screen.getAllByRole('button')[0])
    await userEvent.click(screen.getAllByRole('button')[0])

    expect(screen.queryByTestId('sd-answer')).toBeNull()
    expect(
      screen.getByRole('button', { name: /show reference answer/i }).getAttribute('aria-expanded'),
    ).toBe('false')
  })
})
