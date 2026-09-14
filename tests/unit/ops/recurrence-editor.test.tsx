import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecurrenceEditor from '@/app/ops/RecurrenceEditor'
import type { RecurrenceRule } from '@/lib/ops/types'

/**
 * The recurrence form, driven the way a person drives it.
 *
 * These assert the two things that make the control trustworthy rather than
 * merely functional: that it says back IN WORDS what was just configured, and
 * that the dates it previews are the dates the app will actually use. A test
 * that only checked `onChange` fired with `{ type: 'monthlyByWeekday' }` would
 * pass just as happily on a form nobody could read.
 *
 * No jest-dom in this project, so the assertions are plain DOM reads —
 * `textContent`, `disabled`, `getAttribute`. That is a constraint, not a
 * preference, and it keeps the checks blunt.
 */

afterEach(cleanup)

async function setup(anchor = '2026-10-01') {
  const user = userEvent.setup()
  const seen: (RecurrenceRule | null)[] = []

  function Wrapper() {
    const [value, setValue] = useState<RecurrenceRule | null>(null)
    return (
      <RecurrenceEditor
        value={value}
        anchor={anchor}
        onChange={(rule) => {
          seen.push(rule)
          setValue(rule)
        }}
      />
    )
  }

  render(<Wrapper />)
  return { user, rule: () => (seen.length === 0 ? null : seen[seen.length - 1]) }
}

const sentence = () => screen.getByTestId('recurrence-sentence').textContent
const preview = () => within(screen.getByTestId('recurrence-preview'))

describe('the recurrence form', () => {
  it('shows nothing but the switch until the task actually repeats', async () => {
    await setup()
    expect(screen.getByRole('switch', { name: 'Repeats' }).getAttribute('aria-checked')).toBe(
      'false',
    )
    expect(screen.queryByTestId('recurrence-preview')).toBeNull()
  })

  it('says "The third Tuesday of each month" and previews the actual dates', async () => {
    const { user } = await setup('2026-10-01')

    await user.click(screen.getByRole('switch', { name: 'Repeats' }))
    await user.selectOptions(screen.getByLabelText('Pattern'), 'monthlyByWeekday')
    await user.selectOptions(screen.getByLabelText('Which one'), '3')
    await user.selectOptions(screen.getByLabelText('Weekday'), '2')

    expect(sentence()).toBe('The third Tuesday of each month')

    // 20 Oct 2026 IS the third Tuesday of October, and 17 Nov the next. These
    // come from `occurrenceSeries`, so the preview is the answer rather than an
    // illustration of it.
    expect(preview().getByText('Tue 20 Oct 2026')).toBeTruthy()
    expect(preview().getByText('Tue 17 Nov 2026')).toBeTruthy()
  })

  it('makes February visible before the rule is saved, not four weeks later', async () => {
    const { user } = await setup('2026-01-31')

    await user.click(screen.getByRole('switch', { name: 'Repeats' }))
    await user.selectOptions(screen.getByLabelText('Pattern'), 'monthlyByDayOfMonth')

    await user.selectOptions(screen.getByLabelText('Day of the month'), '31')

    expect(sentence()).toBe('The 31st of each month')
    // The whole point of showing the series: "the 31st" in February is the
    // 28th, and the user finds that out here rather than by being surprised.
    expect(preview().getByText('Sat 28 Feb 2026')).toBeTruthy()
  })

  it('offers the skip policy only where the question can arise, and honours it', async () => {
    const { user } = await setup('2026-01-31')

    await user.click(screen.getByRole('switch', { name: 'Repeats' }))
    await user.selectOptions(screen.getByLabelText('Pattern'), 'monthlyByDayOfMonth')

    // The 12th exists in every month, so there is nothing to ask about.
    const day = screen.getByLabelText('Day of the month')
    await user.selectOptions(day, '12')
    expect(screen.queryByLabelText('When that day does not exist')).toBeNull()

    await user.selectOptions(day, '31')
    await user.selectOptions(screen.getByLabelText('When that day does not exist'), 'skip')

    expect(preview().queryByText('Sat 28 Feb 2026')).toBeNull()
    expect(preview().getByText('Tue 31 Mar 2026')).toBeTruthy()
  })

  it('cannot be driven into a weekly rule with no days', async () => {
    const { user } = await setup('2026-10-01')

    await user.click(screen.getByRole('switch', { name: 'Repeats' }))
    await user.selectOptions(screen.getByLabelText('Pattern'), 'weekly')

    // The anchor is a Thursday, so Thursday starts selected and alone.
    expect((screen.getByRole('button', { name: 'Thursday' }) as HTMLButtonElement).disabled).toBe(
      true,
    )

    await user.click(screen.getByRole('button', { name: 'Monday' }))
    expect(sentence()).toBe('Every Monday and Thursday')
    // With two selected, either may now be removed.
    expect((screen.getByRole('button', { name: 'Thursday' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('keeps the weekdays you picked when you look at another pattern and come back', async () => {
    const { user } = await setup('2026-10-01')

    await user.click(screen.getByRole('switch', { name: 'Repeats' }))
    await user.selectOptions(screen.getByLabelText('Pattern'), 'weekly')
    await user.click(screen.getByRole('button', { name: 'Monday' }))

    await user.selectOptions(screen.getByLabelText('Pattern'), 'daily')
    await user.selectOptions(screen.getByLabelText('Pattern'), 'weekly')

    expect(sentence()).toBe('Every Monday and Thursday')
  })

  it('reports the completed rule to its parent', async () => {
    const { user, rule } = await setup('2026-10-01')

    await user.click(screen.getByRole('switch', { name: 'Repeats' }))
    await user.selectOptions(screen.getByLabelText('Pattern'), 'monthlyByWeekday')
    await user.selectOptions(screen.getByLabelText('Which one'), '-1')
    await user.selectOptions(screen.getByLabelText('Weekday'), '5')
    await user.selectOptions(screen.getByLabelText('Count the next one from'), 'completion')

    expect(rule()).toEqual({
      type: 'monthlyByWeekday',
      ordinal: -1,
      weekday: 5,
      overflow: 'clamp',
      basis: 'completion',
    })
  })

  it('switching repeats off clears the rule entirely', async () => {
    const { user, rule } = await setup()

    await user.click(screen.getByRole('switch', { name: 'Repeats' }))
    expect(rule()).not.toBeNull()

    await user.click(screen.getByRole('switch', { name: 'Repeats' }))
    expect(rule()).toBeNull()
    expect(screen.queryByTestId('recurrence-preview')).toBeNull()
  })
})
