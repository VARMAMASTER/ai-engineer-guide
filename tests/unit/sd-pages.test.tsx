import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SdIndex from '@/components/SdIndex'
import QuestionFramework from '@/components/QuestionFramework'
import { sdQuestions } from '@/content/system-design'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('System design index', () => {
  it('shows a General group and an ML group of ten each', () => {
    render(<SdIndex />)
    expect(screen.getByRole('heading', { name: /general/i })).toBeDefined()
    expect(screen.getByRole('heading', { name: /ml (and|&) llm/i })).toBeDefined()
    expect(screen.getAllByRole('link')).toHaveLength(20)
  })
})

describe('QuestionFramework', () => {
  it('renders the six steps with their prompts', async () => {
    const q = sdQuestions.find((x) => x.id === 'sdq-rate-limiter')!
    render(<QuestionFramework question={q} />)
    await userEvent.click(screen.getByRole('button', { name: /rate limiter/i }))
    for (const label of [
      /define the problem/i, /data/i, /architecture|core components/i,
      /evaluate|scale/i, /deploy/i, /wrap up/i,
    ]) {
      expect(await screen.findByText(label)).toBeDefined()
    }
    expect(screen.getByText(q.steps.define[0])).toBeDefined()
  })

  it('toggles its own checkbox', async () => {
    const q = sdQuestions.find((x) => x.id === 'sdq-rate-limiter')!
    render(<QuestionFramework question={q} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(useProgress.getState().completed['sdq-rate-limiter']).toBeTruthy()
  })
})
