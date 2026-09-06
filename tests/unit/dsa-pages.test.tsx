import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DsaIndex from '@/components/DsaIndex'
import ProblemList from '@/components/ProblemList'
import { dsaProblems } from '@/content/dsa'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('DSA index', () => {
  it('shows all 18 pattern cards', () => {
    render(<DsaIndex />)
    expect(screen.getAllByRole('link', { name: /problems/i })).toHaveLength(18)
  })

  it('filters to core problems', async () => {
    render(<DsaIndex />)
    await userEvent.click(screen.getByRole('button', { name: /^core/i }))
    expect(screen.getByText(/75 problems/i)).toBeDefined()
  })

  it('filters by company', async () => {
    render(<DsaIndex />)
    await userEvent.click(screen.getByRole('button', { name: /meta/i }))
    const metaCount = dsaProblems.filter((p) => p.companies.includes('meta')).length
    expect(screen.getByText(new RegExp(`${metaCount} problems`, 'i'))).toBeDefined()
  })
})

describe('ProblemList', () => {
  it('links each problem to LeetCode and toggles its checkbox', async () => {
    const problems = dsaProblems.filter((p) => p.patternId === 'dsap-two-pointers')
    render(<ProblemList problems={problems} />)
    // The LeetCode number is the link, per spec. 3Sum is LC 15.
    const link = screen.getByRole('link', { name: /LC 15/ })
    expect(link.getAttribute('href')).toBe('https://leetcode.com/problems/3sum/')

    const boxes = screen.getAllByRole('checkbox')
    await userEvent.click(boxes[0])
    expect(Object.keys(useProgress.getState().completed)).toContain(problems[0].id)
  })

  it('gives every checkbox its own accessible name', () => {
    const problems = dsaProblems.filter((p) => p.patternId === 'dsap-two-pointers')
    render(<ProblemList problems={problems} />)
    const names = screen
      .getAllByRole('checkbox')
      .map((b) => b.getAttribute('aria-label'))
    expect(new Set(names).size).toBe(problems.length)
    expect(names).toContain('3Sum')
  })
})
