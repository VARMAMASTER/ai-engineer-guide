import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockRunner, { MockHistory } from '@/components/MockRunner'
import MockTimer from '@/components/MockTimer'
import CodingScript, { SCRIPT_STEPS } from '@/components/CodingScript'
import { generateStaticParams } from '@/app/mock/[kind]/page'
import {
  MOCK_KINDS, MOCK_STORAGE_KEY, HISTORY_LIMIT, PHASE_KEYS,
  elapsedOf, formatClock, formatDuration, isMockKind, isRunning,
  overrunNames, phaseActuals, phasesOf, scheduledPhaseIndex,
  toneFor, useMock, warningThresholdMs,
} from '@/lib/progress/mock'
import type { MockSession } from '@/lib/progress/mock'
import { dsaProblems } from '@/content/dsa'
import { sdQuestions } from '@/content/system-design'
import { behaviouralQuestions } from '@/content/behavioural'

/**
 * Timed mock mode (spec 6.8).
 *
 * The two things worth proving here are the two that would silently lie to
 * the user if they broke: that elapsed time is wall clock rather than a count
 * of ticks, and that no answer field is in the DOM before the drill ends.
 */

const EMPTY = { active: null, history: [] }

beforeEach(() => {
  window.localStorage.clear()
  useMock.setState(EMPTY)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function session(over: Partial<MockSession> = {}): MockSession {
  return {
    id: 's1',
    kind: 'coding',
    itemId: 'dsa-1-two-sum',
    label: 'Two Sum',
    budgetMs: 25 * 60_000,
    startedAt: 1_000,
    pausedAt: null,
    pausedMs: 0,
    pauses: 0,
    phaseMarks: [],
    script: [],
    endedAt: null,
    revealed: false,
    ...over,
  }
}

/* ========================================================================= *
 * The clock
 * ========================================================================= */

describe('elapsed time is wall clock, not ticks', () => {
  it('measures from the stored start timestamp', () => {
    expect(elapsedOf(session(), 1_000 + 90_000)).toBe(90_000)
  })

  it('gives the same answer however long the tab was backgrounded', () => {
    // The whole point: nothing was running to count, and the number is still
    // right. A frame-counting timer would report near zero here.
    const s = session({ startedAt: 0 })
    expect(elapsedOf(s, 25 * 60_000)).toBe(25 * 60_000)
  })

  it('survives a reload: the stored session plus the current clock is the answer', () => {
    useMock.getState().start(
      { kind: 'coding', itemId: 'dsa-1-two-sum', label: 'Two Sum', budgetMs: 25 * 60_000 },
      50_000,
    )

    const raw = window.localStorage.getItem(MOCK_STORAGE_KEY)
    expect(raw, 'the session must be written to storage, not held in memory').not.toBeNull()

    // A reload rebuilds the store from exactly these bytes.
    const restored = JSON.parse(raw!).state.active as MockSession
    expect(restored.startedAt).toBe(50_000)
    expect(elapsedOf(restored, 50_000 + 8 * 60_000)).toBe(8 * 60_000)
  })

  it('freezes while paused and excludes the paused span afterwards', () => {
    const store = useMock.getState()
    store.start({ kind: 'coding', itemId: 'dsa-1-two-sum', label: 'Two Sum', budgetMs: 1 }, 1_000)

    store.pause(61_000)
    let a = useMock.getState().active!
    expect(a.pauses).toBe(1)
    expect(elapsedOf(a, 500_000), 'a paused clock does not move').toBe(60_000)

    useMock.getState().resume(91_000)
    a = useMock.getState().active!
    expect(a.pausedMs).toBe(30_000)
    expect(elapsedOf(a, 121_000), '120s of wall clock minus 30s paused').toBe(90_000)
    expect(isRunning(a)).toBe(true)
  })

  it('counts every pause, so three breaks can never look like a clean session', () => {
    const store = useMock.getState()
    store.start({ kind: 'coding', itemId: 'x', label: 'x', budgetMs: 1 }, 0)
    for (let i = 0; i < 3; i += 1) {
      useMock.getState().pause(i * 100_000 + 10_000)
      useMock.getState().resume(i * 100_000 + 20_000)
    }
    const a = useMock.getState().active!
    expect(a.pauses).toBe(3)
    expect(a.pausedMs).toBe(30_000)
  })

  it('refuses to double-pause or resume a running session', () => {
    const store = useMock.getState()
    store.start({ kind: 'coding', itemId: 'x', label: 'x', budgetMs: 1 }, 0)
    useMock.getState().resume(5_000)
    expect(useMock.getState().active!.pausedMs).toBe(0)
    useMock.getState().pause(10_000)
    useMock.getState().pause(20_000)
    expect(useMock.getState().active!.pauses).toBe(1)
  })

  it('holds the frozen figure once the drill has ended', () => {
    expect(elapsedOf(session({ endedAt: 1_234 }), Number.MAX_SAFE_INTEGER)).toBe(1_234)
  })
})

describe('readouts', () => {
  it('counts down in MM:SS and up past zero with a plus', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00')
    expect(formatClock(61_500), 'a countdown rounds up').toBe('01:02')
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(-10_000)).toBe('+00:10')
  })

  it('spells durations out for the history rows', () => {
    expect(formatDuration(48_000)).toBe('48s')
    expect(formatDuration(24 * 60_000 + 8_000)).toBe('24m 08s')
    expect(formatDuration(-5)).toBe('0s')
  })

  it('warns proportionally, floored at 30s and capped at 2 minutes', () => {
    // A tenth of the box would be six minutes of nagging on a design round
    // and twelve seconds on a behavioural answer. Neither is a warning.
    expect(warningThresholdMs(2 * 60_000)).toBe(30_000)
    expect(warningThresholdMs(25 * 60_000)).toBe(120_000)
    expect(warningThresholdMs(60 * 60_000)).toBe(120_000)
  })

  it('moves from calm to nearly to over', () => {
    const box = 25 * 60_000
    expect(toneFor(box, box)).toBe('calm')
    expect(toneFor(60_000, box)).toBe('nearly')
    expect(toneFor(0, box)).toBe('over')
    expect(toneFor(-1_000, box)).toBe('over')
  })
})

/* ========================================================================= *
 * The design phase budget
 * ========================================================================= */

describe('phase budget', () => {
  const budget = {
    requirements: 8, estimates: 5, apiAndData: 12,
    architecture: 15, deepDive: 16, wrapUp: 4,
  }

  it('lays the phases end to end in the order the round runs', () => {
    const phases = phasesOf(budget)
    expect(phases.map((p) => p.key)).toEqual([...PHASE_KEYS])
    expect(phases[0].startMs).toBe(0)
    expect(phases[1].startMs).toBe(8 * 60_000)
    expect(phases[phases.length - 1].endMs).toBe(60 * 60_000)
  })

  it('says which phase the clock thinks you should be in', () => {
    const phases = phasesOf(budget)
    expect(scheduledPhaseIndex(phases, 0)).toBe(0)
    expect(scheduledPhaseIndex(phases, 7 * 60_000)).toBe(0)
    expect(scheduledPhaseIndex(phases, 8 * 60_000)).toBe(1)
    expect(scheduledPhaseIndex(phases, 30 * 60_000)).toBe(3)
    // Overtime has no seventh phase to point at.
    expect(scheduledPhaseIndex(phases, 90 * 60_000)).toBe(5)
  })

  it('charges closed phases to the marks and the live one to now', () => {
    const phases = phasesOf(budget)
    // 19 minutes on requirements, then 4 on estimates, now 2 into API and data.
    const marks = [19 * 60_000, 23 * 60_000]
    const actual = phaseActuals(phases, marks, 25 * 60_000)
    expect(actual[0]).toBe(19 * 60_000)
    expect(actual[1]).toBe(4 * 60_000)
    expect(actual[2]).toBe(2 * 60_000)
    expect(actual[3]).toBe(0)
  })

  it('names the phases that ran over — the weak-spot signal', () => {
    const phases = phasesOf(budget)
    const actual = phaseActuals(phases, [19 * 60_000, 23 * 60_000], 25 * 60_000)
    const results = phases.map((p, i) => ({
      name: p.name, budgetMs: p.budgetMs, actualMs: actual[i],
    }))
    expect(overrunNames(results)).toEqual(['Requirements'])
  })

  it('every system design question in the bank carries a usable budget', () => {
    for (const q of sdQuestions) {
      expect([45, 60], `${q.id} should be a 45 or 60 minute round`).toContain(q.minutes)
      const phases = phasesOf(q.delivery.budget)
      expect(
        phases[phases.length - 1].endMs,
        `${q.id}: the phase budget must fill the round exactly`,
      ).toBe(q.minutes * 60_000)
    }
  })
})

/* ========================================================================= *
 * The store
 * ========================================================================= */

describe('session store', () => {
  it('writes a history row on end and never a second one', () => {
    const store = useMock.getState()
    store.start({ kind: 'coding', itemId: 'dsa-1-two-sum', label: 'Two Sum', budgetMs: 60_000 }, 0)
    useMock.getState().pause(10_000)
    useMock.getState().resume(20_000)
    useMock.getState().end(70_000, [], 999)

    const { history, active } = useMock.getState()
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      kind: 'coding', label: 'Two Sum', budgetMs: 60_000,
      elapsedMs: 70_000, pausedMs: 10_000, pauses: 1,
    })
    expect(active!.endedAt).toBe(70_000)

    useMock.getState().end(999_000, [])
    expect(useMock.getState().history, 'ending twice must not duplicate the row').toHaveLength(1)
  })

  it('records which phases overran on a design row', () => {
    const store = useMock.getState()
    store.start({ kind: 'design', itemId: 'sdq-api-gateway', label: 'Gateway', budgetMs: 60_000 }, 0)
    useMock.getState().end(60_000, [
      { name: 'Requirements', budgetMs: 8 * 60_000, actualMs: 19 * 60_000 },
      { name: 'Estimates', budgetMs: 5 * 60_000, actualMs: 4 * 60_000 },
    ])
    expect(overrunNames(useMock.getState().history[0].phases)).toEqual(['Requirements'])
  })

  it('keeps the history short enough to read', () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      useMock.getState().start({ kind: 'coding', itemId: `x${i}`, label: `x${i}`, budgetMs: 1 }, 0)
      useMock.getState().end(1, [])
    }
    expect(useMock.getState().history).toHaveLength(HISTORY_LIMIT)
    expect(useMock.getState().history[0].label, 'newest first').toBe(`x${HISTORY_LIMIT + 4}`)
  })

  it('ticks and unticks script steps, and drops them with the session', () => {
    useMock.getState().start({ kind: 'coding', itemId: 'x', label: 'x', budgetMs: 1 }, 0)
    useMock.getState().toggleScriptStep('restate')
    useMock.getState().toggleScriptStep('trace')
    expect(useMock.getState().active!.script).toEqual(['restate', 'trace'])
    useMock.getState().toggleScriptStep('restate')
    expect(useMock.getState().active!.script).toEqual(['trace'])

    useMock.getState().discard()
    useMock.getState().start({ kind: 'coding', itemId: 'y', label: 'y', budgetMs: 1 }, 0)
    expect(useMock.getState().active!.script, 'the script resets per session').toEqual([])
  })

  it('marks a phase closed at the elapsed reading it was closed on', () => {
    useMock.getState().start({ kind: 'design', itemId: 'x', label: 'x', budgetMs: 1 }, 0)
    useMock.getState().advancePhase(19 * 60_000)
    useMock.getState().advancePhase(23 * 60_000)
    expect(useMock.getState().active!.phaseMarks).toEqual([19 * 60_000, 23 * 60_000])
  })
})

/* ========================================================================= *
 * Routes
 * ========================================================================= */

describe('routes', () => {
  it('serves exactly the three drills the store knows about', () => {
    expect(generateStaticParams().map((p) => p.kind)).toEqual(MOCK_KINDS)
    expect(MOCK_KINDS).toEqual(['coding', 'design', 'behavioural'])
  })

  it('rejects a kind that is not a drill', () => {
    expect(isMockKind('coding')).toBe(true)
    expect(isMockKind('sql')).toBe(false)
  })
})

/* ========================================================================= *
 * The readout component
 * ========================================================================= */

describe('MockTimer', () => {
  it('shows the remaining time, the box and the pause count', () => {
    render(
      <MockTimer label="Session" remainingMs={90_000} budgetMs={25 * 60_000} state="running" pauses={2} />,
    )
    const timer = screen.getByTestId('mock-timer')
    expect(timer.textContent).toContain('01:30')
    expect(timer.textContent).toContain('box 25m 00s')
    expect(timer.textContent).toContain('2 pauses')
  })

  it('warns near the end and counts up past it, without shouting', () => {
    const { rerender } = render(
      <MockTimer label="Session" remainingMs={20 * 60_000} budgetMs={25 * 60_000} state="running" />,
    )
    expect(screen.getByTestId('mock-timer').getAttribute('data-tone')).toBe('calm')

    rerender(
      <MockTimer label="Session" remainingMs={60_000} budgetMs={25 * 60_000} state="running" />,
    )
    expect(screen.getByTestId('mock-timer').getAttribute('data-tone')).toBe('nearly')
    expect(screen.getByTestId('mock-timer').textContent).toContain('Nearly there')

    rerender(
      <MockTimer label="Session" remainingMs={-30_000} budgetMs={25 * 60_000} state="running" />,
    )
    const over = screen.getByTestId('mock-timer')
    expect(over.getAttribute('data-tone')).toBe('over')
    expect(over.textContent).toContain('+00:30')
    expect(over.textContent, 'time up is information, not a telling-off').toContain(
      'keep going if you need to',
    )
  })

  it('reports progress through the box on the bar', () => {
    render(<MockTimer label="Session" remainingMs={30_000} budgetMs={120_000} state="running" />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('75')
  })
})

/* ========================================================================= *
 * The coding script
 * ========================================================================= */

describe('CodingScript', () => {
  it('lists the sequence in order, each with a sentence you can say', () => {
    const onToggle = vi.fn()
    render(<CodingScript checked={[]} onToggle={onToggle} />)
    const steps = screen.getAllByRole('checkbox')
    expect(steps).toHaveLength(SCRIPT_STEPS.length)
    expect(SCRIPT_STEPS.map((s) => s.id)).toEqual([
      'restate', 'constraints', 'brute-force', 'pattern',
      'narrate', 'trace', 'complexity', 'tests',
    ])
    for (const step of SCRIPT_STEPS) {
      expect(step.cue.length, `${step.id} needs a real sentence, not a label`).toBeGreaterThan(30)
    }
  })

  it('ticks a step and shows how much of the script has been said', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const { rerender } = render(<CodingScript checked={[]} onToggle={onToggle} />)
    expect(screen.getByTestId('script-progress').textContent).toBe('0/8')

    await user.click(screen.getByRole('checkbox', { name: 'Restate the problem' }))
    expect(onToggle).toHaveBeenCalledWith('restate')

    rerender(<CodingScript checked={['restate', 'trace']} onToggle={onToggle} />)
    expect(screen.getByTestId('script-progress').textContent).toBe('2/8')
  })

  it('goes read-only once the drill has ended', () => {
    render(<CodingScript checked={['restate']} onToggle={vi.fn()} disabled />)
    for (const box of screen.getAllByRole('checkbox')) {
      expect((box as HTMLInputElement).disabled).toBe(true)
    }
  })
})

/* ========================================================================= *
 * The runner
 * ========================================================================= */

/** Always draws the first item in the pool, so a test can name what it got. */
function pinRandom() {
  vi.spyOn(Math, 'random').mockReturnValue(0)
}

describe('MockRunner — coding', () => {
  it('starts a 25-minute drill and shows the problem without its answer', async () => {
    pinRandom()
    const user = userEvent.setup()
    render(<MockRunner kind="coding" />)

    await user.click(screen.getByTestId('mock-draw'))

    const problem = dsaProblems[0]
    expect(screen.getByTestId('mock-heading').textContent).toBe(problem.name)
    expect(screen.getByTestId('mock-timer').textContent).toContain('25:00')
    expect(screen.getByRole('link', { name: /LeetCode/ }).getAttribute('href')).toBe(problem.url)
    expect(screen.getByTestId('coding-script')).toBeTruthy()
    expect(screen.queryByTestId('mock-reveal'), 'nothing reveals while the clock runs').toBeNull()
  })

  it('keeps the signal, approach and solution out of the DOM until the drill ends', async () => {
    pinRandom()
    const user = userEvent.setup()
    const { container } = render(<MockRunner kind="coding" />)
    await user.click(screen.getByTestId('mock-draw'))

    const problem = dsaProblems[0]
    // These fields are optional while the solutions pass lands, so the check
    // is written against whatever the bank currently holds rather than
    // against a field that may not exist yet.
    const secrets = [problem.signal, problem.approach, problem.solution].filter(Boolean) as string[]
    for (const secret of secrets) {
      expect(container.textContent, 'held back while the clock runs').not.toContain(secret)
    }

    await user.click(screen.getByTestId('mock-end'))

    const reveal = screen.getByTestId('mock-reveal')
    for (const secret of secrets) expect(reveal.textContent).toContain(secret)
    if (secrets.length === 0) {
      expect(reveal.textContent, 'a problem with no written answer says so').toContain(
        'No written answer yet',
      )
    }
  })

  it('reports the real elapsed time and the pauses afterwards', async () => {
    pinRandom()
    const user = userEvent.setup()
    render(<MockRunner kind="coding" />)
    await user.click(screen.getByTestId('mock-draw'))

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    await user.click(screen.getByRole('button', { name: 'Resume' }))
    await user.click(screen.getByTestId('mock-end'))

    const result = screen.getByTestId('mock-result')
    expect(result.textContent).toContain('Time box')
    expect(result.textContent).toContain('Real elapsed')
    expect(result.textContent).toContain('1 time')
    expect(result.textContent).toContain('Script steps said')

    const row = within(screen.getByTestId('mock-history')).getByText(dsaProblems[0].name)
    expect(row).toBeTruthy()
  })

  it('never auto-reveals or clears the drill when the box runs out', () => {
    // A session that started 26 minutes ago, restored exactly as a reload
    // would restore it. No timers are advanced and none need to be: the
    // readout is a function of the wall clock, which is the property here.
    useMock.setState({
      active: session({ itemId: dsaProblems[0].id, startedAt: Date.now() - 26 * 60_000 }),
      history: [],
    })
    render(<MockRunner kind="coding" />)

    const timer = screen.getByTestId('mock-timer')
    expect(timer.textContent, 'the clock keeps counting rather than freezing').toContain('+01:00')
    expect(timer.getAttribute('data-tone')).toBe('over')
    expect(timer.textContent, 'and says so calmly').toContain('keep going if you need to')
    expect(screen.queryByTestId('mock-reveal'), 'still not revealed').toBeNull()
    expect(screen.getByTestId('coding-script'), 'the work is still there').toBeTruthy()
    expect(useMock.getState().history, 'nothing was submitted').toHaveLength(0)
  })
})

describe('MockRunner — design', () => {
  it('shows the opening line and the phase budget before the clock starts', async () => {
    pinRandom()
    const user = userEvent.setup()
    render(<MockRunner kind="design" />)

    await user.click(screen.getByTestId('mock-draw'))

    const q = sdQuestions[0]
    const pre = screen.getByTestId('mock-prestart')
    expect(pre.textContent).toContain(q.title)
    expect(pre.textContent).toContain(q.delivery.opening)
    expect(pre.textContent).toContain('Requirements')
    expect(screen.queryByTestId('mock-timer'), 'the clock has not started').toBeNull()
    expect(pre.textContent).not.toContain(q.solution.architecture)
  })

  it('runs the phase budget, advances it, and holds the answer back', async () => {
    pinRandom()
    const user = userEvent.setup()
    const { container } = render(<MockRunner kind="design" />)
    await user.click(screen.getByTestId('mock-draw'))
    await user.click(screen.getByTestId('mock-start'))

    const q = sdQuestions[0]
    const board = screen.getByTestId('mock-phases')
    expect(within(board).getByTestId('mock-phase-timer').textContent).toContain('Phase 1 of 6')
    expect(within(board).getByTestId('mock-phase-timer').textContent).toContain(
      formatClock(q.delivery.budget.requirements * 60_000),
    )

    await user.click(screen.getByTestId('mock-advance'))
    expect(screen.getByTestId('mock-phase-timer').textContent).toContain('Phase 2 of 6')
    expect(screen.getByTestId('mock-phase-timer').textContent).toContain(
      formatClock(q.delivery.budget.estimates * 60_000),
    )
    expect(
      board.querySelector('[data-phase="requirements"]')?.getAttribute('data-phase-state'),
    ).toBe('done')

    for (const secret of [q.solution.architecture, q.delivery.traps[0], q.delivery.whenPushed[0].answer]) {
      expect(container.textContent, 'the answer is not on the page yet').not.toContain(secret)
    }
  })

  it('says which phase the clock thinks you should be in once you fall behind', () => {
    const q = sdQuestions[0]
    const overdue = (q.delivery.budget.requirements + 1) * 60_000

    // Still on phase one — no phase has been closed — a minute after the
    // schedule said to move on. This is the exact failure the drill exists to
    // surface: twenty minutes spent on requirements, unnoticed.
    useMock.setState({
      active: session({
        kind: 'design',
        itemId: q.id,
        budgetMs: q.minutes * 60_000,
        startedAt: Date.now() - overdue,
      }),
      history: [],
    })
    render(<MockRunner kind="design" />)

    expect(screen.getByTestId('mock-behind').textContent).toContain('Estimates')
    expect(screen.getByTestId('mock-phase-timer').getAttribute('data-tone')).toBe('over')
    expect(screen.getByTestId('mock-phase-timer').textContent).toContain('Phase 1 of 6')
  })
})

describe('MockRunner — behavioural', () => {
  it('gives two minutes and holds the probes back until the answer is over', async () => {
    pinRandom()
    const user = userEvent.setup()
    const { container } = render(<MockRunner kind="behavioural" />)
    await user.click(screen.getByTestId('mock-draw'))

    const q = behaviouralQuestions[0]
    expect(screen.getByTestId('mock-heading').textContent).toBe(q.prompt)
    expect(screen.getByTestId('mock-timer').textContent).toContain('02:00')
    for (const probe of q.probes) expect(container.textContent).not.toContain(probe)
    for (const trap of q.traps) expect(container.textContent).not.toContain(trap)

    await user.click(screen.getByTestId('mock-end'))

    const reveal = screen.getByTestId('mock-reveal')
    for (const probe of q.probes) expect(reveal.textContent).toContain(probe)
    for (const trap of q.traps) expect(reveal.textContent).toContain(trap)
  })

  it('does not show the coding script on a behavioural drill', async () => {
    pinRandom()
    const user = userEvent.setup()
    render(<MockRunner kind="behavioural" />)
    await user.click(screen.getByTestId('mock-draw'))
    expect(screen.queryByTestId('coding-script')).toBeNull()
    expect(screen.queryByTestId('mock-phases')).toBeNull()
  })
})

describe('MockRunner — resuming', () => {
  it('picks a live session back up from storage rather than starting over', () => {
    useMock.setState({
      active: session({ kind: 'coding', itemId: dsaProblems[0].id, startedAt: Date.now() - 600_000 }),
      history: [],
    })
    render(<MockRunner kind="coding" />)

    expect(screen.getByTestId('mock-drill')).toBeTruthy()
    expect(screen.getByTestId('mock-heading').textContent).toBe(dsaProblems[0].name)
    expect(screen.getByTestId('mock-timer').textContent, '10 of 25 minutes gone').toContain('15:00')
  })

  it('points at a drill left open on another kind instead of silently clobbering it', () => {
    useMock.setState({ active: session({ kind: 'design', itemId: 'sdq-api-gateway' }), history: [] })
    render(<MockRunner kind="coding" />)
    const note = screen.getByTestId('mock-elsewhere')
    expect(note.textContent).toContain('system design drill is still open')
    expect(within(note).getByRole('link').getAttribute('href')).toBe('/mock/design')
  })

  it('does not fall over when a stored drill is no longer in the bank', () => {
    useMock.setState({ active: session({ itemId: 'dsa-999-deleted' }), history: [] })
    render(<MockRunner kind="coding" />)
    expect(screen.getByText(/no longer in the question bank/)).toBeTruthy()
  })
})

describe('MockHistory', () => {
  it('says what is missing before anything has been drilled', () => {
    render(<MockHistory />)
    expect(screen.getByTestId('mock-history').textContent).toContain('Nothing yet')
  })

  it('records the drill, the real time, the pauses and the phases that overran', () => {
    useMock.setState({
      active: null,
      history: [
        {
          id: 'r1', kind: 'design', itemId: 'sdq-api-gateway', label: 'Design an API gateway',
          finishedAt: Date.UTC(2026, 8, 6, 10, 0), budgetMs: 60 * 60_000,
          elapsedMs: 66 * 60_000, pausedMs: 90_000, pauses: 2,
          phases: [
            { name: 'Requirements', budgetMs: 8 * 60_000, actualMs: 19 * 60_000 },
            { name: 'Architecture', budgetMs: 15 * 60_000, actualMs: 10 * 60_000 },
          ],
        },
      ],
    })
    render(<MockHistory />)

    const row = screen.getByTestId('mock-history').textContent ?? ''
    expect(row).toContain('Design an API gateway')
    expect(row).toContain('System design')
    expect(row).toContain('66m 00s of 60m 00s')
    expect(row).toContain('2 pauses (1m 30s)')
    expect(row).toContain('over: Requirements')
  })

  it('filters to one kind on a drill page', () => {
    useMock.setState({
      active: null,
      history: [
        {
          id: 'a', kind: 'coding', itemId: 'x', label: 'A coding drill', finishedAt: 0,
          budgetMs: 1, elapsedMs: 1, pausedMs: 0, pauses: 0, phases: [],
        },
        {
          id: 'b', kind: 'behavioural', itemId: 'y', label: 'A behavioural drill', finishedAt: 0,
          budgetMs: 1, elapsedMs: 1, pausedMs: 0, pauses: 0, phases: [],
        },
      ],
    })
    render(<MockHistory kind="coding" />)
    const text = screen.getByTestId('mock-history').textContent ?? ''
    expect(text).toContain('A coding drill')
    expect(text).not.toContain('A behavioural drill')
  })
})
