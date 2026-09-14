'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import { useToast } from '@/components/ui/Toast'
import { measureTdee } from '@/lib/diet/energy'
import {
  applyProteinFix,
  gradePlanAgainstTrend,
  loggedPlanSlots,
  planDayToEntries,
  planMealToEntries,
  proteinFixesFor,
  proteinGapSentence,
  removePlanItem,
  resolvePlanDay,
  resolveWeeklyPlan,
  setPlanItemServings,
  summarisePlan,
  WEEK_DAYS,
  WEEK_DAY_LABEL,
  WEEK_DAY_SHORT,
  weekDayOf,
  PLAN_DISCLAIMER,
  WEIGHT_BASIS_NOTE,
  type MealSlot,
  type PlanDay,
  type ProteinFix,
  type WeekDay,
  type WeeklyPlan,
} from '@/lib/diet/plan'
import {
  PLAN_FOODS,
  PLAN_HEADROOM_NOTE,
  PLAN_MAINTENANCE_KCAL,
  PLAN_PROTEIN_CEILING_G,
  PLAN_PROTEIN_FIXES,
  PLAN_TARGETS,
  seedWeeklyPlan,
} from '@/lib/diet/plan-seed'
import { addDays } from '@/lib/diet/time'
import { trendChange, weightTrend } from '@/lib/diet/trend'
import type { DietTargets, FoodItem, LogEntry, UserProfile, WeightReading } from '@/lib/diet/types'
import { addEntries, newId, savePlanDay, savePlanDays, saveProfile, upsertFoods } from '../_data/mutations'
import { dayLabel, kcalText } from '../_lib/format'
import { useLocalToday } from '../_lib/useLocalToday'
import PlanDayEditor from './PlanDayEditor'
import PlanWeekTable from './PlanWeekTable'
import TdeeCard from './TdeeCard'

/**
 * The weekly plan.
 *
 * ORDERING IS THE DESIGN, and it is ordered for a phone in a kitchen at 7am:
 * the first thing under the heading is one thumb-sized button that logs the
 * whole of today, and the second is whether today reaches its protein floor.
 * Everything that is a Sunday job — editing quantities, reading the week as a
 * table, comparing the predicted loss against the scale — is below that.
 *
 * WHAT THIS SCREEN REFUSES TO DO is the more interesting half. The plan is on
 * target for calories and misses the 150 g protein floor on all seven days, so
 * the shortfall is stated in words with the number in it, on every day that has
 * one, next to one-tap fixes that each declare their calorie cost. A screen
 * that rendered "121 g" in a nice typeface and moved on would have told the
 * truth and hidden the finding.
 *
 * It also does not build a second dashboard. Calories and protein against
 * target already live on the Log screen and the measured expenditure already
 * lives in `TdeeCard`, which is reused here verbatim — including its refusal to
 * show a point estimate from thin logging.
 */

export interface PlanClientProps {
  userId: string
  serverToday: string
  initialPlan: WeeklyPlan | undefined
  initialFoods: FoodItem[]
  entries: LogEntry[]
  weights: WeightReading[]
  profile: UserProfile | undefined
  targets: DietTargets | undefined
  loadError: string | null
}

/** Days of weight trend the plan's prediction is graded over. */
const REALITY_WINDOW_DAYS = 28

export default function PlanClient({
  userId,
  serverToday,
  initialPlan,
  initialFoods,
  entries: initialEntries,
  weights,
  profile,
  targets,
  loadError,
}: PlanClientProps) {
  const toast = useToast()
  const today = useLocalToday(serverToday)
  const todayWeekDay = weekDayOf(today)

  const [plan, setPlan] = useState<WeeklyPlan | undefined>(initialPlan)
  const [foods, setFoods] = useState<FoodItem[]>(initialFoods)
  const [entries, setEntries] = useState<LogEntry[]>(initialEntries)
  const [selected, setSelected] = useState<WeekDay>(todayWeekDay)
  const [busy, setBusy] = useState(false)

  // Without targets in Setup there is still a band to score against — the
  // plan's own. It is labelled as the plan's rather than presented as the
  // user's, because silently adopting a number the user never chose is how an
  // app ends up scoring somebody against a stranger's diet.
  const scoringTargets = targets ?? PLAN_TARGETS
  const usingPlanTargets = targets === undefined

  const resolved = useMemo(
    () => (plan ? resolveWeeklyPlan(plan, foods) : []),
    [plan, foods],
  )
  const options = useMemo(
    () => ({ targets: scoringTargets, maintenanceKcal: PLAN_MAINTENANCE_KCAL }),
    [scoringTargets],
  )
  const summary = useMemo(
    () => (resolved.length > 0 ? summarisePlan(resolved, options) : null),
    [resolved, options],
  )
  const scores = useMemo(
    () => new Map(summary ? summary.days.map((d) => [d.day, d]) : []),
    [summary],
  )

  const todayResolved = resolved.find((d) => d.day === todayWeekDay)
  const todayScore = scores.get(todayWeekDay)
  const selectedResolved = resolved.find((d) => d.day === selected)
  const selectedScore = scores.get(selected)
  const selectedPlanDay = plan?.[selected]

  const loggedSlots = useMemo(
    () =>
      todayResolved && selected === todayWeekDay
        ? loggedPlanSlots(todayResolved, entries, today)
        : new Set<MealSlot>(),
    [todayResolved, selected, todayWeekDay, entries, today],
  )

  const tdee = useMemo(
    () => measureTdee({ asOf: today, entries, weights, profile }),
    [today, entries, weights, profile],
  )

  const reality = useMemo(() => {
    if (!summary) return null
    const change = trendChange(
      weightTrend(weights),
      addDays(today, -(REALITY_WINDOW_DAYS - 1)),
      today,
    )
    return gradePlanAgainstTrend(summary.predictedKgPerWeek, change)
  }, [summary, weights, today])

  /* ------------------------------------------------------------ seeding -- */

  async function seed() {
    setBusy(true)
    const seeded = seedWeeklyPlan(newId)
    const foodResult = await upsertFoods(userId, PLAN_FOODS)
    if (foodResult.error) {
      setBusy(false)
      toast.show({ message: `Could not save the foods: ${foodResult.error}`, tone: 'error' })
      return
    }
    const planResult = await savePlanDays(userId, WEEK_DAYS.map((day) => seeded[day] as PlanDay))
    if (planResult.error) {
      setBusy(false)
      toast.show({ message: `Could not save the plan: ${planResult.error}`, tone: 'error' })
      return
    }
    // Targets only, and only when there are none. The rest of the profile is
    // Setup's to own, and overwriting a height somebody typed would be rude.
    if (usingPlanTargets) {
      void saveProfile(userId, {
        target_kcal: PLAN_TARGETS.kcal,
        target_protein_g: PLAN_TARGETS.proteinG,
        kcal_band: PLAN_TARGETS.kcalBand,
      })
    }
    setFoods((current) => {
      const byId = new Map(current.map((f) => [f.id, f]))
      for (const food of PLAN_FOODS) byId.set(food.id, food)
      return [...byId.values()]
    })
    setPlan(seeded)
    setBusy(false)
    toast.show({ message: 'Plan saved. Every quantity is yours to change.', tone: 'success' })
  }

  /* ------------------------------------------------------------- edits -- */

  async function mutateDay(next: PlanDay, message: string) {
    if (!plan) return
    const previous = plan
    setPlan({ ...plan, [next.day]: next })
    setBusy(true)
    const { error } = await savePlanDay(userId, next)
    setBusy(false)
    if (error) {
      setPlan(previous)
      toast.show({ message: `Could not save: ${error}`, tone: 'error' })
      return
    }
    if (message) toast.show({ message, tone: 'success' })
  }

  function onSetServings(itemId: string, servings: number) {
    if (!selectedPlanDay) return
    void mutateDay(setPlanItemServings(selectedPlanDay, itemId, servings), '')
  }

  function onRemoveItem(itemId: string) {
    if (!selectedPlanDay) return
    void mutateDay(removePlanItem(selectedPlanDay, itemId), 'Removed from the plan.')
  }

  function onApplyFix(fix: ProteinFix) {
    if (!selectedPlanDay) return
    const next = applyProteinFix(selectedPlanDay, fix, newId)
    const before = resolvePlanDay(selectedPlanDay, foods)
    const after = resolvePlanDay(next, foods)
    void mutateDay(
      next,
      `${fix.label}: ${Math.round(before.proteinG)} → ${Math.round(after.proteinG)} g protein, ` +
        `${kcalText(before.kcal)} → ${kcalText(after.kcal)} kcal.`,
    )
  }

  /* ------------------------------------------------------------ logging -- */

  async function write(toLog: LogEntry[], message: string) {
    if (toLog.length === 0) return
    const ids = new Set(toLog.map((e) => e.id))
    setEntries((current) => [...current, ...toLog])
    setBusy(true)
    const { error } = await addEntries(userId, toLog)
    setBusy(false)
    if (error) {
      setEntries((current) => current.filter((e) => !ids.has(e.id)))
      toast.show({ message: `Could not log: ${error}`, tone: 'error' })
      return
    }
    toast.show({ message, tone: 'success' })
  }

  async function logWholeDay() {
    if (!todayResolved) return
    const toLog = planDayToEntries(todayResolved, { date: today, nextId: newId })
    await write(
      toLog,
      `${WEEK_DAY_LABEL[todayWeekDay]} logged: ${toLog.length} entries, ` +
        `${kcalText(todayResolved.kcal)} kcal, ${Math.round(todayResolved.proteinG)} g protein.`,
    )
  }

  async function logMeal(slot: MealSlot) {
    if (!todayResolved) return
    const meal = todayResolved.meals.find((m) => m.slot === slot)
    if (!meal) return
    const toLog = planMealToEntries(meal, { date: today, nextId: newId })
    await write(
      toLog,
      `${meal.label} logged: ${kcalText(meal.kcal)} kcal, ${Math.round(meal.proteinG)} g protein.`,
    )
  }

  /* -------------------------------------------------------------- render -- */

  if (loadError) {
    return (
      <p className="panel p-4 text-sm text-[var(--danger)]" role="alert">
        Your plan could not be loaded ({loadError}). Reload before changing anything, so you are
        not editing on top of a half-read week.
      </p>
    )
  }

  if (!plan || !summary || !todayResolved || !todayScore) {
    return (
      <div className="panel p-4">
        <EmptyState
          title="No weekly plan yet."
          description="A plan is a template: it fills your food library, then logs a whole day in one tap instead of twelve. Everything in it — every quantity, every meal — is yours to change afterwards."
          action={
            <Button variant="accent" onClick={() => void seed()} disabled={busy} data-testid="plan-seed">
              {busy ? 'Saving…' : 'Set up the fat-loss plan'}
            </Button>
          }
        />
      </div>
    )
  }

  const todayGap = proteinGapSentence(todayScore, scoringTargets.proteinG)
  const allLogged = loggedSlots.size === todayResolved.meals.filter((m) => m.items.length > 0).length

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------------------------------------------------- today -- */}
      <section className="panel flex flex-col gap-4 p-4" aria-labelledby="plan-today">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="plan-today" className="eyebrow">
            {WEEK_DAY_LABEL[todayWeekDay]} · {dayLabel(today)}
          </h2>
          {allLogged ? <Tag variant="accent">Logged</Tag> : null}
        </div>

        {/* The one tap the whole feature exists for. Full width on a phone so
            it is a thumb target rather than something to aim at. */}
        <Button
          variant="accent"
          className="w-full md:w-auto"
          onClick={() => void logWholeDay()}
          disabled={busy}
          data-testid="log-todays-plan"
        >
          {busy
            ? 'Logging…'
            : `Log today’s plan · ${kcalText(todayResolved.kcal)} kcal, ${Math.round(todayResolved.proteinG)} g protein`}
        </Button>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Calories" value={kcalText(todayResolved.kcal)} unit="kcal" />
          <Stat label="Protein" value={Math.round(todayResolved.proteinG)} unit="g" />
          <Stat label="Deficit" value={kcalText(todayScore.deficitKcal)} unit="kcal" />
          <Stat label="Maintenance" value={kcalText(PLAN_MAINTENANCE_KCAL)} unit="kcal" />
        </div>

        {allLogged ? (
          <p className="hint">
            Every meal in today&rsquo;s plan is already in the log. Logging it again would double
            the day — go to the food log to check or correct what is there.
          </p>
        ) : loggedSlots.size > 0 ? (
          <p className="hint">
            {loggedSlots.size} of today&rsquo;s meals are already logged. &ldquo;Log today&rsquo;s
            plan&rdquo; writes all four, so use the per-meal buttons below for the rest.
          </p>
        ) : null}

        {/* The finding, not buried. */}
        {todayGap ? (
          <p
            className="text-sm text-[var(--warning)]"
            role="status"
            data-testid="plan-protein-warning"
          >
            {todayGap}
          </p>
        ) : (
          <p className="text-sm text-[var(--positive)]" data-testid="plan-protein-ok">
            Today clears your {Math.round(scoringTargets.proteinG)} g protein floor at{' '}
            {Math.round(todayResolved.proteinG)} g.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------- the week -- */}
      <section className="flex flex-col gap-3" aria-labelledby="plan-week">
        <div className="flex flex-col gap-1">
          <h2 id="plan-week" className="eyebrow">
            The week
          </h2>
          <p className="hint">{WEIGHT_BASIS_NOTE}</p>
        </div>

        <PlanWeekTable
          days={resolved}
          scores={scores}
          proteinFloorG={scoringTargets.proteinG}
          today={todayWeekDay}
          onOpenDay={setSelected}
        />
      </section>

      {/* ---------------------------------------------------- the summary -- */}
      <section className="panel flex flex-col gap-4 p-4" aria-labelledby="plan-summary">
        <h2 id="plan-summary" className="eyebrow">
          What the week adds up to
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Average calories" value={kcalText(summary.meanKcal)} unit="kcal" />
          <Stat label="Average protein" value={Math.round(summary.meanProteinG)} unit="g" />
          <Stat label="Average deficit" value={kcalText(summary.meanDeficitKcal)} unit="kcal" />
          <Stat
            label="Predicted"
            value={kgPerWeek(summary.predictedKgPerWeek)}
            unit="kg/week"
          />
        </div>

        <p className="text-sm text-[var(--text-muted)]" data-testid="plan-band-verdict">
          {bandSentence(summary.kcalVerdict, summary.meanKcal, scoringTargets)}
          {summary.daysAboveBand.length > 0
            ? ` ${namedDays(summary.daysAboveBand)} ${summary.daysAboveBand.length === 1 ? 'is' : 'are'} above it on ${summary.daysAboveBand.length === 1 ? 'its' : 'their'} own — an average inside a band is not the same as seven days inside it.`
            : ''}
          {summary.daysBelowBand.length > 0
            ? ` ${namedDays(summary.daysBelowBand)} ${summary.daysBelowBand.length === 1 ? 'is' : 'are'} below it.`
            : ''}
        </p>

        <p className="text-sm text-[var(--warning)]" data-testid="plan-week-protein">
          {summary.daysUnderProteinFloor.length === 0
            ? `Every day clears the ${Math.round(scoringTargets.proteinG)} g protein floor.`
            : `${summary.daysUnderProteinFloor.length} of 7 days miss the ${Math.round(scoringTargets.proteinG)} g protein floor — ` +
              `${namedDays(summary.daysUnderProteinFloor)}. The gap runs from ${summary.bestShortfallG} g to ` +
              `${summary.worstShortfallG} g. Calories are the easy part of this plan; protein is the part that needs a decision.`}
        </p>

        {summary.daysUnderProteinFloor.length > 0 ? (
          <p className="hint">{PLAN_HEADROOM_NOTE}</p>
        ) : null}

        {usingPlanTargets ? (
          <p className="hint">
            Scored against the plan&rsquo;s own {kcalText(scoringTargets.kcal - scoringTargets.kcalBand)}
            &ndash;{kcalText(scoringTargets.kcal + scoringTargets.kcalBand)} kcal band and a{' '}
            {Math.round(scoringTargets.proteinG)}&ndash;{PLAN_PROTEIN_CEILING_G} g protein range,
            because you have not set your own targets in Setup yet.
          </p>
        ) : null}

        {reality ? (
          <p className="text-sm text-[var(--text-muted)]" data-testid="plan-reality">
            {reality.sentence}
          </p>
        ) : null}
      </section>

      {/* The measured expenditure — the number that decides whether the
          prediction above is worth anything. Reused rather than rebuilt. */}
      <TdeeCard estimate={tdee} />

      {/* ---------------------------------------------------- one day, edit -- */}
      <section className="flex flex-col gap-4" aria-labelledby="plan-editor">
        <div className="flex flex-col gap-2">
          <h2 id="plan-editor" className="eyebrow">
            Edit a day
          </h2>
          <p className="hint">
            Change a quantity and the calories, protein, carbs, fat and deficit all move with it.
            Saved as you go.
          </p>
        </div>

        {/* Chips rather than the `Tabs` primitive in panel mode: the editor
            below is not a tabpanel, and `aria-controls` pointing at a panel
            that does not exist is the kind of ARIA that reads worse than none.
            A radio group is what this is, so that is what it announces. */}
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Day of the week"
          data-testid="plan-day-picker"
        >
          {WEEK_DAYS.map((day) => (
            <Chip
              key={day}
              role="radio"
              aria-checked={day === selected}
              pressed={day === selected}
              onClick={() => setSelected(day)}
              data-testid="plan-day-chip"
              data-day={day}
            >
              {day === todayWeekDay ? `${WEEK_DAY_SHORT[day]} · today` : WEEK_DAY_SHORT[day]}
            </Chip>
          ))}
        </div>

        {selectedResolved && selectedScore && selectedPlanDay ? (
          <PlanDayEditor
            day={selectedResolved}
            score={selectedScore}
            proteinFloorG={scoringTargets.proteinG}
            fixes={proteinFixesFor(selectedPlanDay, PLAN_PROTEIN_FIXES)}
            busy={busy}
            loggedSlots={loggedSlots}
            canLog={selected === todayWeekDay}
            onSetServings={onSetServings}
            onRemoveItem={onRemoveItem}
            onApplyFix={onApplyFix}
            onLogMeal={(slot) => void logMeal(slot)}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Chip onClick={() => setSelected(todayWeekDay)} disabled={selected === todayWeekDay}>
            Back to today
          </Chip>
        </div>
      </section>

      {/* -------------------------------------------------------- honesty -- */}
      <section className="panel flex flex-col gap-2 p-4" aria-labelledby="plan-disclaimer">
        <h2 id="plan-disclaimer" className="eyebrow">
          About these numbers
        </h2>
        <p className="text-sm text-[var(--text-muted)]" data-testid="plan-disclaimer">
          {PLAN_DISCLAIMER}
        </p>
      </section>
    </div>
  )
}

/**
 * A rate of weight change, two decimals and always signed.
 *
 * Two decimals because the number is 0.47 and rounding it to 0.5 would make
 * the prediction and the trend it is compared against agree more often than
 * they do. `format.ts`'s `signedKg` is one decimal, which is right for a
 * bathroom scale reading and wrong for a weekly rate.
 */
function kgPerWeek(value: number): string {
  if (Math.abs(value) < 0.005) return '0.00'
  return `${value > 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}`
}

function namedDays(days: WeekDay[]): string {
  const names = days.map((d) => WEEK_DAY_SHORT[d])
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function bandSentence(
  verdict: 'below' | 'within' | 'above',
  meanKcal: number,
  targets: DietTargets,
): string {
  const low = kcalText(targets.kcal - targets.kcalBand)
  const high = kcalText(targets.kcal + targets.kcalBand)
  const mean = kcalText(meanKcal)
  switch (verdict) {
    case 'within':
      return `The week averages ${mean} kcal, inside your ${low}–${high} band.`
    case 'above':
      return `The week averages ${mean} kcal, above your ${low}–${high} band.`
    case 'below':
      return `The week averages ${mean} kcal, below your ${low}–${high} band — a deficit larger than planned is not a better one.`
  }
}
