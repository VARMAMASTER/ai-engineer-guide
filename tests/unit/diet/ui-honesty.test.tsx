import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import TdeeCard from '@/app/diet/_components/TdeeCard'
import IntakeChart from '@/app/diet/_components/IntakeChart'
import type { TdeeEstimate } from '@/lib/diet/energy'
import type { DayTotals, DietTargets } from '@/lib/diet/types'

/**
 * The rules from spec 5.1.2 that the UI is allowed to break silently.
 *
 * Every assertion in here is about something the app must REFUSE to say. The
 * arithmetic in `lib/diet` already gets these right and is tested to death; the
 * failure mode this file exists for is a component that has the honest value in
 * hand and renders a friendlier one — a range flattened to its midpoint, an
 * unlogged day painted as a zero, a population estimate presented as a
 * measurement.
 */

beforeAll(() => {
  // The charts draw at 1:1 pixels off a measured container, so jsdom has to be
  // given both halves of that: a ResizeObserver (it has none) and a non-zero
  // clientWidth (it has no layout). Without them the component renders its
  // loading skeleton and the assertions below would pass against nothing.
  if (!('ResizeObserver' in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => 600,
  })
})

afterEach(() => {
  cleanup()
})

const COVERAGE = { windowDays: 28, daysOfIntake: 15, daysOfWeight: 16, coverage: 15 / 28 }

const PROVISIONAL: TdeeEstimate = {
  kind: 'provisional',
  confidence: 'low',
  basis: 'measured',
  lowKcal: 2050,
  highKcal: 2780,
  meanIntakeKcal: 2300,
  trendDeltaKg: -0.4,
  elapsedDays: 27,
  from: '2026-08-18',
  to: '2026-09-14',
  warning: 'Only 54% of the last 28 days are logged, so this is a range rather than a number.',
  ...COVERAGE,
}

const MEASURED: TdeeEstimate = {
  kind: 'measured',
  confidence: 'high',
  basis: 'measured',
  kcal: 2412,
  lowKcal: 2291,
  highKcal: 2533,
  meanIntakeKcal: 2300,
  trendDeltaKg: -0.4,
  elapsedDays: 27,
  from: '2026-08-18',
  to: '2026-09-14',
  windowDays: 28,
  daysOfIntake: 26,
  daysOfWeight: 25,
  coverage: 25 / 28,
}

const UNAVAILABLE: TdeeEstimate = {
  kind: 'unavailable',
  reason: 'Using the population formula: 2 days of intake and 1 day of weight in the last 28.',
  daysNeeded: 12,
  windowDays: 28,
  daysOfIntake: 2,
  daysOfWeight: 1,
  coverage: 1 / 28,
}

describe('TdeeCard', () => {
  it('renders a provisional estimate as a range, with no point estimate anywhere', () => {
    render(<TdeeCard estimate={PROVISIONAL} />)

    const value = screen.getByTestId('tdee-value')
    expect(value.textContent).toContain('2,050–2,780')
    // The midpoint is what a component that "just wanted a number" would show.
    // 2415 is (2050 + 2780) / 2, and it must not appear.
    expect(value.textContent).not.toContain('2,415')
    expect(screen.getByTestId('tdee-basis').textContent).toContain('range rather than a number')
  })

  it('says the logging is thin rather than only implying it', () => {
    render(<TdeeCard estimate={PROVISIONAL} />)
    expect(screen.getByText(/Range only/)).toBeTruthy()
    expect(screen.getByTestId('tdee-basis').textContent).toMatch(/54%/)
  })

  it('renders a measured estimate as a number, and names the basis', () => {
    render(<TdeeCard estimate={MEASURED} />)
    expect(screen.getByTestId('tdee-value').textContent).toContain('2,412')
    expect(screen.getByText('Measured from your data')).toBeTruthy()
    expect(screen.getByTestId('tdee-basis').textContent).toContain('Measured from your own 28 days')
  })

  it('renders no number at all when there is nothing to measure or compute', () => {
    render(<TdeeCard estimate={UNAVAILABLE} />)
    const value = screen.getByTestId('tdee-value')
    expect(value.textContent).toContain('No number yet')
    expect(value.textContent).not.toMatch(/\d,\d{3}/)
  })

  it('always shows how much of the window was logged', () => {
    render(<TdeeCard estimate={PROVISIONAL} />)
    expect(screen.getByRole('progressbar', { name: /both food and weight logged/ })).toBeTruthy()
  })
})

const TARGETS: DietTargets = { kcal: 2050, proteinG: 140, kcalBand: 150 }

const DAYS: DayTotals[] = [
  { date: '2026-09-12', logged: true, kcal: 1980, proteinG: 130, entryCount: 4 },
  { date: '2026-09-13', logged: false, entryCount: 0 },
  { date: '2026-09-14', logged: true, kcal: 2310, proteinG: 150, entryCount: 5 },
]

describe('IntakeChart', () => {
  it('names an unlogged day rather than showing it as zero', () => {
    render(<IntakeChart days={DAYS} targets={TARGETS} />)

    const table = screen.getByRole('table')
    const row = within(table).getByRole('row', { name: /2026-09-13/ })
    expect(row.textContent).toContain('Not logged')
    expect(row.textContent).not.toContain('0 kcal')
  })

  it('puts every day in the table, logged or not', () => {
    render(<IntakeChart days={DAYS} targets={TARGETS} />)
    const table = screen.getByRole('table')
    // Three days plus the header row.
    expect(within(table).getAllByRole('row')).toHaveLength(4)
  })

  it('reports both the logged and the unlogged count', () => {
    render(<IntakeChart days={DAYS} targets={TARGETS} />)
    // The readout is the live region the hover writes into; with no hover it
    // carries the summary.
    expect(screen.getByText('2 of 3 days logged')).toBeTruthy()
  })

  it('draws the unlogged day as an absence, not as a bar of height zero', () => {
    const { container } = render(<IntakeChart days={DAYS} targets={TARGETS} />)
    const titles = [...container.querySelectorAll('svg title')].map((t) => t.textContent)
    expect(titles).toContain('2026-09-13: Not logged')
    expect(titles).toContain('2026-09-14: 2,310 kcal')

    const unlogged = [...container.querySelectorAll('svg rect')].find((rect) =>
      rect.querySelector('title')?.textContent?.includes('Not logged'),
    )
    // A hollow outline: no fill to average with the eye, a stroke to mark the
    // slot as a day that exists and was not logged.
    expect(unlogged?.getAttribute('fill')).toBe('none')
  })

  it('names the absence in the legend, so the shape is not left to be guessed', () => {
    render(<IntakeChart days={DAYS} targets={TARGETS} />)
    const legend = screen.getAllByText('Not logged')
    expect(legend.length).toBeGreaterThan(0)
  })

  it('describes the gaps in the image label, for anyone who cannot see the plot', () => {
    render(<IntakeChart days={DAYS} targets={TARGETS} />)
    const image = screen.getByRole('img')
    expect(image.getAttribute('aria-label')).toContain('shown as gaps rather than zeroes')
  })
})
