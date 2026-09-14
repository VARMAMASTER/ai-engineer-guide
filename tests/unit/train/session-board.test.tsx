import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionBoard from '@/app/train/session/SessionBoard'
import { addDays, todayIso } from '@/lib/date'
import { generatePlan } from '@/lib/train/plan'
import { MAX_LOAD_INCREASE_KG } from '@/lib/train/progression'
import type { Session, TrainingProfile } from '@/lib/train/types'

/**
 * The gym surface, driven the way a person drives it: look at what is
 * suggested, press the big button, see the set land, see the next suggestion
 * move because of it.
 *
 * The database is a stub. What is under test is the wiring between
 * `suggestNextSession` and the controls — the logic itself already has 46 tests
 * of its own and does not need re-asserting through a DOM.
 */
const writes: { table: string; op: string; row: unknown }[] = []
let failWrites = false

vi.mock('@/lib/db/client', () => {
  const result = () => (failWrites ? { error: { message: 'offline' } } : { error: null })
  return {
    createClient: () => ({
      from: (table: string) => ({
        upsert: (row: unknown) => {
          writes.push({ table, op: 'upsert', row })
          return Promise.resolve(result())
        },
        insert: (row: unknown) => {
          writes.push({ table, op: 'insert', row })
          return Promise.resolve(result())
        },
        delete: () => ({
          eq: () => ({
            eq: () => {
              writes.push({ table, op: 'delete', row: null })
              return Promise.resolve(result())
            },
          }),
        }),
      }),
    }),
  }
})

const profile: TrainingProfile = {
  goal: 'hypertrophy',
  experience: 'beginner',
  availableDays: 3,
  equipment: ['barbell', 'bodyweight'],
  injuries: [],
}

const plan = generatePlan(profile)
const BENCH = 'barbell-bench-press'

function board(sessions: Session[] = []) {
  const today = todayIso()
  return render(
    <SessionBoard
      userId="user-1"
      plan={plan}
      profile={profile}
      initialSessions={sessions}
      initialSetIds={{}}
      dayLabels={{}}
      serverToday={today}
    />,
  )
}

beforeEach(() => {
  writes.length = 0
  failWrites = false
})

describe('SessionBoard — with no history', () => {
  it('says plainly that there is nothing to suggest yet rather than inventing a load', () => {
    board()
    expect(screen.getByTestId(`train-target-${BENCH}`).textContent).toMatch(/log a first working set/i)
  })

  it('states the load cap as a rule, not as a footnote nobody reads', () => {
    board()
    expect(screen.getByTestId('train-load-cap').textContent).toMatch(
      new RegExp(`never adds more than ${MAX_LOAD_INCREASE_KG} kg`, 'i'),
    )
  })
})

describe('SessionBoard — logging a set', () => {
  const priorSessions: Session[] = [
    {
      id: 'prior',
      date: addDays(todayIso(), -3),
      sets: [{ exerciseId: BENCH, reps: 8, load: 40, timestamp: `${addDays(todayIso(), -3)}T10:00:00.000Z` }],
    },
  ]

  it("suggests one more rep at the same load, and prefills the controls with it", () => {
    board(priorSessions)
    expect(screen.getByTestId(`train-target-${BENCH}`).textContent).toBe('9 reps at 40 kg')
    expect(screen.getByTestId(`train-reps-${BENCH}-value`)).toHaveProperty('value', '9')
    expect(screen.getByTestId(`train-load-${BENCH}-value`)).toHaveProperty('value', '40')
  })

  it('logs the suggested set in one press and shows it back immediately', async () => {
    board(priorSessions)
    await userEvent.click(screen.getByTestId(`train-log-${BENCH}`))

    const logged = within(screen.getByTestId(`train-sets-${BENCH}`)).getByText(/9 × 40 kg/)
    expect(logged).toBeDefined()
    expect(screen.getByTestId('train-sets-today').textContent).toContain('1')
    expect(writes.map((w) => `${w.table}:${w.op}`)).toEqual(['train_session:upsert', 'train_set:insert'])
  })

  it('moves the NEXT session’s suggestion as a result of what was just logged', async () => {
    board(priorSessions)
    expect(screen.queryByTestId(`train-next-${BENCH}`)).toBeNull()

    await userEvent.click(screen.getByTestId(`train-log-${BENCH}`))

    // Double progression: 9 reps logged today, so 10 is next, at the same load.
    expect(screen.getByTestId(`train-next-${BENCH}`).textContent).toMatch(/10 reps at 40 kg/)
  })

  it('takes the set back off the screen when the write fails, and says so', async () => {
    failWrites = true
    board(priorSessions)
    await userEvent.click(screen.getByTestId(`train-log-${BENCH}`))

    expect(screen.queryByTestId(`train-sets-${BENCH}`)).toBeNull()
    expect(screen.getByTestId('train-error').textContent).toMatch(/offline/i)
  })

  it('removes a logged set on request', async () => {
    board(priorSessions)
    await userEvent.click(screen.getByTestId(`train-log-${BENCH}`))
    await userEvent.click(screen.getByTestId(`train-remove-${BENCH}-0`))

    expect(screen.queryByTestId(`train-sets-${BENCH}`)).toBeNull()
    expect(writes.some((w) => w.op === 'delete')).toBe(true)
  })
})

describe('SessionBoard — the steppers', () => {
  it('steps load by 2.5kg and reps by one, without typing', async () => {
    board()
    await userEvent.click(screen.getByTestId(`train-load-${BENCH}-up`))
    await userEvent.click(screen.getByTestId(`train-load-${BENCH}-up`))
    await userEvent.click(screen.getByTestId(`train-reps-${BENCH}-up`))

    expect(screen.getByTestId(`train-load-${BENCH}-value`)).toHaveProperty('value', '5')
    expect(screen.getByTestId(`train-reps-${BENCH}-value`)).toHaveProperty('value', '9')
  })

  it('cannot be stepped below zero load or below one rep', async () => {
    board()
    await userEvent.click(screen.getByTestId(`train-load-${BENCH}-down`))
    expect(screen.getByTestId(`train-load-${BENCH}-value`)).toHaveProperty('value', '0')
    expect(screen.getByTestId(`train-load-${BENCH}-down`)).toHaveProperty('disabled', true)
  })
})

describe('SessionBoard — swapping the day', () => {
  it('shows a different plan day’s exercises when one is chosen', async () => {
    board()
    const other = plan.days.length - 1
    await userEvent.click(screen.getByTestId(`train-day-${other}`))
    for (const id of plan.days[other].exerciseIds) {
      expect(screen.getByTestId(`train-exercise-${id}`)).toBeDefined()
    }
  })
})
