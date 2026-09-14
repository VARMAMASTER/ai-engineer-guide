import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlanWeekTable from '@/app/diet/_components/PlanWeekTable'
import PlanDayEditor from '@/app/diet/_components/PlanDayEditor'
import {
  proteinFixesFor,
  resolveWeeklyPlan,
  scorePlanDay,
  summarisePlan,
  type MealSlot,
  type PlanDayScore,
  type WeekDay,
} from '@/lib/diet/plan'
import {
  PLAN_FOODS,
  PLAN_MAINTENANCE_KCAL,
  PLAN_PROTEIN_FIXES,
  PLAN_TARGETS,
  seedWeeklyPlan,
} from '@/lib/diet/plan-seed'

/**
 * What the plan screens must REFUSE to do.
 *
 * The arithmetic is already tested to death in `plan.test.ts`. The failure this
 * file exists for is a component that holds the honest number and renders a
 * friendlier version of it: a protein shortfall shown as a nearly-full bar, a
 * one-tap fix whose calorie cost is left off the button, a gram quantity with
 * no weight basis next to it.
 */

afterEach(() => {
  cleanup()
})

function ids(prefix = 'i'): () => string {
  let n = 0
  return () => {
    n += 1
    return `${prefix}${n}`
  }
}

const PLAN = seedWeeklyPlan(ids())
const DAYS = resolveWeeklyPlan(PLAN, PLAN_FOODS)
const OPTIONS = { targets: PLAN_TARGETS, maintenanceKcal: PLAN_MAINTENANCE_KCAL }
const SCORES = new Map<WeekDay, PlanDayScore>(
  summarisePlan(DAYS, OPTIONS).days.map((d) => [d.day, d]),
)

describe('the weekly table', () => {
  function renderTable() {
    return render(
      <PlanWeekTable
        days={DAYS}
        scores={SCORES}
        proteinFloorG={PLAN_TARGETS.proteinG}
        today="mon"
        onOpenDay={() => {}}
      />,
    )
  }

  it('shows every gram quantity with the state it was weighed in', () => {
    renderTable()
    const monday = screen.getByTestId('plan-week-scroller').querySelector('[data-day="mon"]')!
    // Dry, raw and cooked all appear on the same day, and all three have to.
    expect(monday.textContent).toContain('50 g dry')
    expect(monday.textContent).toContain('100 g cooked')
    expect(monday.textContent).toContain('200 g')
  })

  it('shows the raw weight on a chicken day, where the error would be 30%', () => {
    renderTable()
    const wednesday = screen.getByTestId('plan-week-scroller').querySelector('[data-day="wed"]')!
    expect(wednesday.textContent).toContain('250 g raw')
  })

  it('flags the protein shortfall on every day that has one, not once at the bottom', () => {
    renderTable()
    const rows = screen.getAllByTestId('plan-week-row')
    expect(rows).toHaveLength(7)
    for (const row of rows) {
      // Every one of the seven days misses the floor, so every one is flagged.
      expect(row.textContent).toMatch(/g under 150/)
    }
  })

  it('does not flag a day that clears the floor', () => {
    const generous = { ...OPTIONS, targets: { ...PLAN_TARGETS, proteinG: 100 } }
    const scores = new Map<WeekDay, PlanDayScore>(
      summarisePlan(DAYS, generous).days.map((d) => [d.day, d]),
    )
    render(
      <PlanWeekTable
        days={DAYS}
        scores={scores}
        proteinFloorG={100}
        today="mon"
        onOpenDay={() => {}}
      />,
    )
    for (const row of screen.getAllByTestId('plan-week-row')) {
      // The seeded NOTE for Tuesday mentions its 44 g shortfall in prose, and
      // that stays — this asserts the flag on the protein column is gone.
      expect(row.textContent).not.toMatch(/g under 100/)
    }
  })

  it('carries maintenance and the deficit alongside the calories, not instead of them', () => {
    renderTable()
    const monday = screen.getByTestId('plan-week-scroller').querySelector('[data-day="mon"]')!
    expect(monday.textContent).toContain('2,231')
    expect(monday.textContent).toContain('2,700')
    expect(monday.textContent).toContain('469')
  })

  it('keeps its ten columns in a scroller of its own, so the page cannot scroll sideways', () => {
    renderTable()
    const scroller = screen.getByTestId('plan-week-scroller')
    expect(scroller.className).toContain('overflow-x-auto')
    // Ten columns: day, four meals, kcal, maintenance, deficit, protein, notes.
    expect(within(scroller).getAllByRole('columnheader')).toHaveLength(10)
  })
})

describe('the day editor', () => {
  const monday = DAYS.find((d) => d.day === 'mon')!
  const tuesday = DAYS.find((d) => d.day === 'tue')!

  function renderDay(
    day = tuesday,
    overrides: Partial<React.ComponentProps<typeof PlanDayEditor>> = {},
  ) {
    const props: React.ComponentProps<typeof PlanDayEditor> = {
      day,
      score: scorePlanDay(day, OPTIONS),
      proteinFloorG: PLAN_TARGETS.proteinG,
      fixes: proteinFixesFor(PLAN[day.day]!, PLAN_PROTEIN_FIXES),
      busy: false,
      loggedSlots: new Set<MealSlot>(),
      canLog: true,
      onSetServings: () => {},
      onRemoveItem: () => {},
      onApplyFix: () => {},
      onLogMeal: () => {},
      ...overrides,
    }
    return render(<PlanDayEditor {...props} />)
  }

  it('states the size of the gap in the heading of the fixes, not just in a colour', () => {
    renderDay()
    const fixes = screen.getByTestId('plan-day-fixes')
    expect(fixes.textContent).toContain('43.8 g gap')
  })

  it('puts the calorie cost of every fix next to its protein gain', () => {
    renderDay()
    const fixes = screen.getByTestId('plan-day-fixes')
    // The free swap says so rather than showing "+0 kcal", which reads as a
    // rounding artefact.
    expect(fixes.textContent).toContain('+12 g protein')
    expect(fixes.textContent).toContain('no extra calories')
    // And the expensive ones show the number they cost.
    expect(fixes.textContent).toContain('+14.4 g protein')
    expect(fixes.textContent).toContain('+68 kcal')
  })

  it('offers no fixes panel at all on a day that clears the floor', () => {
    const generous = { ...OPTIONS, targets: { ...PLAN_TARGETS, proteinG: 100 } }
    renderDay(tuesday, { score: scorePlanDay(tuesday, generous) })
    expect(screen.queryByTestId('plan-day-fixes')).toBeNull()
  })

  it('labels every quantity field with what the number means', () => {
    renderDay(monday)
    const rice = screen.getAllByTestId('plan-item').find((el) =>
      el.textContent?.includes('Brown rice'),
    )!
    expect(rice.textContent).toContain('grams DRY, weighed before cooking')
    const chicken = renderDay(DAYS.find((d) => d.day === 'wed')!)
    expect(
      chicken
        .getAllByTestId('plan-item')
        .find((el) => el.textContent?.includes('Chicken breast'))!.textContent,
    ).toContain('grams RAW, weighed before cooking')
  })

  it('edits a quantity in grams and reports it back in servings', async () => {
    const user = userEvent.setup()
    const seen: { itemId: string; servings: number }[] = []
    renderDay(monday, { onSetServings: (itemId, servings) => seen.push({ itemId, servings }) })

    const paneerRow = screen
      .getAllByTestId('plan-item')
      .find((el) => el.textContent?.includes('Low-fat paneer'))!
    const field = within(paneerRow).getByRole('textbox')
    // 200 g of paneer is 2 servings of 100 g. Typing 300 must report 3, not 300.
    await user.clear(field)
    await user.type(field, '300')
    expect(seen[seen.length - 1].servings).toBeCloseTo(3, 6)
  })

  it('never reports a zero or empty quantity, which would be an item of nothing', async () => {
    const user = userEvent.setup()
    const seen: number[] = []
    renderDay(monday, { onSetServings: (_id, servings) => seen.push(servings) })
    const row = screen
      .getAllByTestId('plan-item')
      .find((el) => el.textContent?.includes('Low-fat paneer'))!
    await user.clear(within(row).getByRole('textbox'))
    expect(seen).toEqual([])
  })

  it('refuses to log a day that is not today, and says why in the title', () => {
    renderDay(monday, { canLog: false })
    for (const chip of screen.getAllByTestId('plan-log-meal')) {
      expect(chip.hasAttribute('disabled')).toBe(true)
      expect(chip.getAttribute('title')).toContain('Only today')
    }
  })

  it('shows a logged meal as logged rather than inviting a second copy', () => {
    renderDay(monday, { loggedSlots: new Set<MealSlot>(['breakfast']) })
    const chip = screen
      .getAllByTestId('plan-log-meal')
      .find((el) => el.getAttribute('data-slot') === 'breakfast')!
    expect(chip.textContent).toContain('Breakfast logged')
    expect(chip.getAttribute('aria-pressed')).toBe('true')
  })
})
