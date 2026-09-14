import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlanEditor from '@/app/train/plan/PlanEditor'
import { exerciseById } from '@/lib/train/exercises'

const upserts: unknown[] = []

vi.mock('@/lib/db/client', () => ({
  createClient: () => ({
    from: () => ({
      upsert: (row: unknown) => {
        upserts.push(row)
        return Promise.resolve({ error: null })
      },
    }),
  }),
}))

function editor() {
  return render(<PlanEditor userId="user-1" initialProfile={null} initialPlan={null} hasSessions={false} />)
}

beforeEach(() => {
  upserts.length = 0
})

describe('PlanEditor', () => {
  it('shows a week immediately, with no Generate button to press first', () => {
    editor()
    // Direct children only: each day card contains its own list of exercises.
    expect(screen.getByTestId('train-plan-days').children.length).toBe(3)
  })

  it('surfaces the generator’s notes rather than shipping a silently short plan', async () => {
    editor()
    await userEvent.click(screen.getByTestId('train-days-1'))

    const notes = screen.getByTestId('train-plan-notes')
    expect(notes.textContent).toMatch(/clamped to the minimum of 2/i)
    expect(screen.getByTestId('train-plan-days').children.length).toBe(2)
  })

  it('removes a whole movement pattern for an injury, not just one named exercise', async () => {
    editor()
    await userEvent.click(screen.getByTestId('train-equipment-barbell'))
    await userEvent.click(screen.getByTestId('train-days-5'))

    const before = screen.getByTestId('train-plan-days').textContent ?? ''
    expect(before).toContain(exerciseById('barbell-overhead-press')!.name)

    await userEvent.click(screen.getByTestId('train-injury-shoulder'))

    const after = screen.getByTestId('train-plan-days').textContent ?? ''
    expect(after).not.toContain(exerciseById('barbell-overhead-press')!.name)
    expect(after).not.toContain(exerciseById('pike-push-up')!.name)
    expect(screen.getByText(/off the table: overhead pressing/i)).toBeDefined()
  })

  it('saves the profile and the generated plan together', async () => {
    editor()
    await userEvent.click(screen.getByTestId('train-days-4'))
    await userEvent.click(screen.getByTestId('train-save-plan'))

    expect(upserts).toHaveLength(1)
    const row = upserts[0] as Record<string, unknown>
    expect(row.user_id).toBe('user-1')
    expect(row.available_days).toBe(4)
    expect((row.plan as { daysPerWeek: number }).daysPerWeek).toBe(4)
    expect(await screen.findByText(/saved\./i)).toBeDefined()
  })
})
