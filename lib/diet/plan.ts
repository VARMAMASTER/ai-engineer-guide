/**
 * The weekly meal plan — a template that produces log entries (spec 5.1).
 *
 * WHY THIS EXISTS. "People eat 20-30 things on repeat" and "log yesterday
 * again" is the primary path. A fixed repeating diet is the limit of that: one
 * cook, the same twelve foods, seven days a week. Entering twelve foods by hand
 * every morning is the friction that kills diet tracking, so the plan turns the
 * day into a tap.
 *
 * WHAT IT IS NOT. It is not a second logging system and not a second set of
 * totals. A plan is a TEMPLATE: `planDayToEntries` turns it into ordinary
 * `LogEntry` values that go down the existing path, get aggregated by
 * `aggregate.ts`, scored against targets by the existing dashboard and read by
 * `measureTdee` like anything else. Nothing here re-implements arithmetic that
 * already exists elsewhere in `lib/diet`.
 *
 * THE ONE THING THIS MODULE IS FOR, beyond saving taps: **a plan can be on
 * target for calories and quietly miss its protein floor every single day.**
 * That is not hypothetical — it is what the owner's own plan does, by 10 g on
 * chicken days and 44 g on tofu days. An app that computes the number and
 * renders it without comment has technically told the truth and practically
 * hidden it. So `scorePlanDay` reports the shortfall as a field, `proteinFixes`
 * quantifies what would close it, and the UI is expected to say so out loud.
 *
 * Pure, like the rest of `lib/diet`: no I/O, no clock, no randomness. Ids and
 * meal times are passed in rather than generated, which is also what makes
 * `planDayToEntries` testable against hand-computed totals.
 */
import { z } from 'zod'
import {
  foodItemSchema,
  isoDateSchema,
  localTimeSchema,
  WEIGHT_BASIS_LABEL,
  type DietTargets,
  type FoodItem,
  type IsoDate,
  type LocalTime,
  type LogEntry,
  type WeightBasis,
} from './types'
import { KCAL_PER_KG } from './energy'
import type { TrendChange } from './trend'

/* ---------------------------------------------------------------- shape -- */

/** Monday first. The week starts where the plan's cooking rhythm starts. */
export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type WeekDay = (typeof WEEK_DAYS)[number]
export const weekDaySchema = z.enum(WEEK_DAYS)

export const WEEK_DAY_LABEL: Record<WeekDay, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export const WEEK_DAY_SHORT: Record<WeekDay, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

/** The four meals, in the order they are eaten. */
export const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const
export type MealSlot = (typeof MEAL_SLOTS)[number]
export const mealSlotSchema = z.enum(MEAL_SLOTS)

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Evening snack',
  dinner: 'Dinner',
}

/**
 * Default clock time for each meal, local.
 *
 * A time is not optional: `LogEntry.at` is the meal's own timestamp and the
 * whole eating-window analysis reads it, so a plan that logged everything at
 * one instant would compress a twelve-hour eating span to zero. These are
 * defaults the caller may override, not facts.
 */
export const DEFAULT_MEAL_TIMES: Record<MealSlot, LocalTime> = {
  breakfast: '08:00',
  lunch: '13:00',
  snack: '17:00',
  dinner: '20:00',
}

/**
 * One line of the plan.
 *
 * `foodId` points into the food library and `servings` is the quantity, so
 * editing a quantity recomputes energy and every macro from one number — which
 * is exactly what the plan screen needs and the opposite of `LogEntry`, where
 * the resolved figures are frozen onto the row so that correcting a library
 * item cannot rewrite history.
 *
 * `name` is denormalised for display only. A plan item whose food has been
 * deleted from the library still says what it was rather than rendering blank,
 * and `resolvePlanItem` marks it `known: false` instead of inventing a zero.
 */
export const planItemSchema = z.object({
  id: z.string().min(1),
  foodId: z.string().min(1),
  name: z.string().min(1),
  servings: z.number().positive().max(100),
})
export type PlanItem = z.infer<typeof planItemSchema>

export const planMealsSchema = z.object({
  breakfast: z.array(planItemSchema).max(40),
  lunch: z.array(planItemSchema).max(40),
  snack: z.array(planItemSchema).max(40),
  dinner: z.array(planItemSchema).max(40),
})
export type PlanMeals = z.infer<typeof planMealsSchema>

export const planDaySchema = z.object({
  day: weekDaySchema,
  meals: planMealsSchema,
  /** The owner's own note for the day — "chicken day", "tofu, protein low". */
  note: z.string().max(400).optional(),
})
export type PlanDay = z.infer<typeof planDaySchema>

/**
 * All seven days, keyed by day.
 *
 * A record rather than an array, so a plan with two Mondays and no Thursday is
 * not representable. The rendering order is `WEEK_DAYS`, which is the one place
 * it is decided.
 */
export const weeklyPlanSchema = z.record(weekDaySchema, planDaySchema)
export type WeeklyPlan = z.infer<typeof weeklyPlanSchema>

export function emptyPlanMeals(): PlanMeals {
  return { breakfast: [], lunch: [], snack: [], dinner: [] }
}

export function emptyWeeklyPlan(): WeeklyPlan {
  return Object.fromEntries(
    WEEK_DAYS.map((day) => [day, { day, meals: emptyPlanMeals() }]),
  ) as WeeklyPlan
}

/**
 * The weekday a local date falls on.
 *
 * Built from the date PARTS in UTC, never from a local `Date`, for the reason
 * `time.ts` gives at length: the date `2026-09-14` is Monday everywhere, and
 * constructing it in local time would let a timezone west of UTC call it
 * Sunday.
 */
export function weekDayOf(date: IsoDate): WeekDay {
  const [y, m, d] = isoDateSchema.parse(date).split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  // getUTCDay is Sunday-first; WEEK_DAYS is Monday-first.
  return WEEK_DAYS[(dow + 6) % 7]
}

/* ------------------------------------------------------------- resolve -- */

export interface ResolvedPlanItem {
  id: string
  foodId: string
  name: string
  servings: number
  servingLabel: string
  /** Grams in ONE serving, when the food is measured by weight at all. */
  servingGrams: number | undefined
  /**
   * Grams of this item — `servingGrams * servings`.
   *
   * Both this and `servingGrams` are here so the quantity editor can offer the
   * field in the unit a person actually measures in: grams for rice and
   * chicken, a count for eggs and slices of bread. Deriving one from the other
   * at the call site would mean dividing by `servings`, which is exactly the
   * sort of arithmetic that ends up in a component.
   */
  grams: number | undefined
  /** The state the grams are measured in. See `WEIGHT_BASES` in `types.ts`. */
  weightBasis: WeightBasis | undefined
  /** "100 g dry", "250 g raw", "3 × 1 egg" — the quantity as a person reads it. */
  quantityLabel: string
  kcal: number
  proteinG: number
  /** `undefined` when the library item carries no carbohydrate figure. */
  carbG: number | undefined
  /** `undefined` when the library item carries no fat figure. */
  fatG: number | undefined
  /**
   * False when `foodId` is not in the library. The item contributes NOTHING to
   * any total in that case — a missing food is unknown, not free.
   */
  known: boolean
}

export interface ResolvedMacros {
  kcal: number
  proteinG: number
  carbG: number
  fatG: number
  /**
   * True only when every contributing item carried both a carb and a fat
   * figure. When false, `carbG` and `fatG` are the sum of what was known and
   * must be shown as a partial figure rather than a total.
   */
  macrosComplete: boolean
}

export interface ResolvedMeal extends ResolvedMacros {
  slot: MealSlot
  label: string
  items: ResolvedPlanItem[]
}

export interface ResolvedDay extends ResolvedMacros {
  day: WeekDay
  label: string
  meals: ResolvedMeal[]
  note: string | undefined
  /** Items whose food is missing from the library. Shown, never silently dropped. */
  unknownItems: number
}

function foodMap(foods: FoodItem[] | Map<string, FoodItem>): Map<string, FoodItem> {
  if (foods instanceof Map) return foods
  return new Map(foods.map((f) => [f.id, foodItemSchema.parse(f)]))
}

/** Trim a computed float to one decimal. Quantities and labels only. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Two decimals, for every macro total.
 *
 * TWO and not one, and this is not a cosmetic choice. Half the pressure-cooker
 * batch is 12.35 g of protein and half the day's lunch curry 3.6; rounding each
 * meal to one decimal before summing the four turns 106.2 g into 106.3, and the
 * protein shortfall the whole feature reports into 43.7 rather than 43.8. Two
 * decimals is finer than the reference data itself, which is exactly what a
 * rounding step in the middle of an arithmetic chain should be — it exists only
 * to keep 0.30000000000000004 off the screen, not to lose precision.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function quantityLabelFor(food: FoodItem | undefined, servings: number): string {
  if (!food) return `${round1(servings)} × unknown food`
  if (food.servingGrams !== undefined) {
    const grams = round1(food.servingGrams * servings)
    const basis = food.weightBasis ? WEIGHT_BASIS_LABEL[food.weightBasis] : ''
    return basis ? `${grams} g ${basis}` : `${grams} g`
  }
  const count = round1(servings)
  const basis = food.weightBasis ? WEIGHT_BASIS_LABEL[food.weightBasis] : ''
  const unit = count === 1 ? food.servingLabel : `${count} × ${food.servingLabel}`
  return basis ? `${unit} ${basis}` : unit
}

export function resolvePlanItem(
  item: PlanItem,
  foods: FoodItem[] | Map<string, FoodItem>,
): ResolvedPlanItem {
  const parsed = planItemSchema.parse(item)
  const food = foodMap(foods).get(parsed.foodId)
  const servings = parsed.servings

  return {
    id: parsed.id,
    foodId: parsed.foodId,
    name: food?.name ?? parsed.name,
    servings,
    servingLabel: food?.servingLabel ?? '—',
    servingGrams: food?.servingGrams,
    grams: food?.servingGrams === undefined ? undefined : round1(food.servingGrams * servings),
    weightBasis: food?.weightBasis,
    quantityLabel: quantityLabelFor(food, servings),
    kcal: food ? food.kcalPerServing * servings : 0,
    proteinG: food ? food.proteinGPerServing * servings : 0,
    carbG:
      food?.carbGPerServing === undefined ? undefined : round2(food.carbGPerServing * servings),
    fatG: food?.fatGPerServing === undefined ? undefined : round2(food.fatGPerServing * servings),
    known: food !== undefined,
  }
}

function sumMacros(items: ResolvedPlanItem[]): ResolvedMacros {
  let kcal = 0
  let proteinG = 0
  let carbG = 0
  let fatG = 0
  let macrosComplete = true
  for (const item of items) {
    if (!item.known) {
      macrosComplete = false
      continue
    }
    kcal += item.kcal
    proteinG += item.proteinG
    if (item.carbG === undefined || item.fatG === undefined) macrosComplete = false
    carbG += item.carbG ?? 0
    fatG += item.fatG ?? 0
  }
  return {
    kcal: round2(kcal),
    proteinG: round2(proteinG),
    carbG: round2(carbG),
    fatG: round2(fatG),
    macrosComplete,
  }
}

function combine(parts: ResolvedMacros[]): ResolvedMacros {
  return {
    kcal: round2(parts.reduce((s, p) => s + p.kcal, 0)),
    proteinG: round2(parts.reduce((s, p) => s + p.proteinG, 0)),
    carbG: round2(parts.reduce((s, p) => s + p.carbG, 0)),
    fatG: round2(parts.reduce((s, p) => s + p.fatG, 0)),
    macrosComplete: parts.every((p) => p.macrosComplete),
  }
}

export function resolvePlanDay(
  day: PlanDay,
  foods: FoodItem[] | Map<string, FoodItem>,
): ResolvedDay {
  const parsed = planDaySchema.parse(day)
  const lookup = foodMap(foods)

  const meals: ResolvedMeal[] = MEAL_SLOTS.map((slot) => {
    const items = parsed.meals[slot].map((item) => resolvePlanItem(item, lookup))
    return { slot, label: MEAL_SLOT_LABEL[slot], items, ...sumMacros(items) }
  })

  return {
    day: parsed.day,
    label: WEEK_DAY_LABEL[parsed.day],
    meals,
    note: parsed.note,
    unknownItems: meals.reduce((n, m) => n + m.items.filter((i) => !i.known).length, 0),
    ...combine(meals),
  }
}

/** All seven days, in `WEEK_DAYS` order. Missing days resolve to empty ones. */
export function resolveWeeklyPlan(
  plan: WeeklyPlan,
  foods: FoodItem[] | Map<string, FoodItem>,
): ResolvedDay[] {
  const lookup = foodMap(foods)
  return WEEK_DAYS.map((day) =>
    resolvePlanDay(plan[day] ?? { day, meals: emptyPlanMeals() }, lookup),
  )
}

/* --------------------------------------------------------------- score -- */

/** Where a day's calories sit relative to the target band. Three-valued. */
export type BandVerdict = 'below' | 'within' | 'above'

export function bandVerdict(kcal: number, targets: DietTargets): BandVerdict {
  if (kcal < targets.kcal - targets.kcalBand) return 'below'
  if (kcal > targets.kcal + targets.kcalBand) return 'above'
  return 'within'
}

export interface PlanDayScore {
  day: WeekDay
  label: string
  kcal: number
  proteinG: number
  maintenanceKcal: number
  /** Maintenance minus planned intake. Positive is a deficit. */
  deficitKcal: number
  kcalVerdict: BandVerdict
  /**
   * Grams of protein short of the floor, or `null` when the floor is met.
   *
   * `null` rather than 0 for the same reason an unlogged day has no `kcal`: a
   * day that meets its floor and a day that misses it by nothing are different
   * facts, and `shortfall > 0` reads better at every call site than a sentinel.
   */
  proteinShortfallG: number | null
}

export interface PlanScoreOptions {
  targets: DietTargets
  /** Maintenance calories. The user's own estimate or a measured TDEE. */
  maintenanceKcal: number
}

export function scorePlanDay(day: ResolvedDay, options: PlanScoreOptions): PlanDayScore {
  const { targets, maintenanceKcal } = options
  const shortfall = targets.proteinG - day.proteinG
  return {
    day: day.day,
    label: day.label,
    kcal: day.kcal,
    proteinG: day.proteinG,
    maintenanceKcal,
    deficitKcal: round2(maintenanceKcal - day.kcal),
    kcalVerdict: bandVerdict(day.kcal, targets),
    proteinShortfallG: shortfall > 0.005 ? round2(shortfall) : null,
  }
}

export interface WeeklyPlanSummary {
  days: PlanDayScore[]
  meanKcal: number
  meanProteinG: number
  meanDeficitKcal: number
  /** The verdict on the WEEK's mean, which can differ from every single day's. */
  kcalVerdict: BandVerdict
  daysAboveBand: WeekDay[]
  daysBelowBand: WeekDay[]
  daysUnderProteinFloor: WeekDay[]
  /** Largest and smallest protein shortfall across the week, 0 when none. */
  worstShortfallG: number
  bestShortfallG: number
  /**
   * Weight change the mean deficit implies, kg per week. NEGATIVE for loss,
   * so it has the same sign as `TrendChange.kgPerWeek` and the two can be
   * compared without either caller remembering to flip one.
   */
  predictedKgPerWeek: number
}

export function summarisePlan(
  days: ResolvedDay[],
  options: PlanScoreOptions,
): WeeklyPlanSummary {
  const scores = days.map((day) => scorePlanDay(day, options))
  const n = Math.max(1, scores.length)
  const meanKcal = round2(scores.reduce((s, d) => s + d.kcal, 0) / n)
  const meanProteinG = round2(scores.reduce((s, d) => s + d.proteinG, 0) / n)
  const meanDeficitKcal = round2(scores.reduce((s, d) => s + d.deficitKcal, 0) / n)
  // Every shortfall is >= 0 (a met floor contributes 0), so `worst` is the
  // largest and `best` the smallest — and `best` being 0 means at least one day
  // of the week already clears the floor.
  const shortfalls = scores.length > 0 ? scores.map((d) => d.proteinShortfallG ?? 0) : [0]

  return {
    days: scores,
    meanKcal,
    meanProteinG,
    meanDeficitKcal,
    kcalVerdict: bandVerdict(meanKcal, options.targets),
    daysAboveBand: scores.filter((d) => d.kcalVerdict === 'above').map((d) => d.day),
    daysBelowBand: scores.filter((d) => d.kcalVerdict === 'below').map((d) => d.day),
    daysUnderProteinFloor: scores.filter((d) => d.proteinShortfallG !== null).map((d) => d.day),
    worstShortfallG: round2(Math.max(...shortfalls)),
    bestShortfallG: round2(Math.min(...shortfalls)),
    // A deficit removes mass, so the predicted change is negative.
    predictedKgPerWeek: round2((-meanDeficitKcal * 7) / KCAL_PER_KG),
  }
}

/* ---------------------------------------------- plan against reality -- */

/** Days of trend the plan may be graded over. Below this, the answer is "wait". */
export const PLAN_GRADE_MIN_DAYS = 14

/** How much slower/faster than predicted counts as disagreement, kg/week. */
export const PLAN_GRADE_TOLERANCE_KG = 0.15

export type PlanRealityVerdict = 'unknown' | 'agrees' | 'slower' | 'faster'

export interface PlanReality {
  verdict: PlanRealityVerdict
  predictedKgPerWeek: number
  actualKgPerWeek: number | null
  days: number | null
  /** A sentence written to be rendered verbatim, not paraphrased. */
  sentence: string
}

/**
 * The plan's prediction, graded against the weight trend that actually arrived.
 *
 * This is the most useful number the feature produces, and it is also the
 * easiest one to fake. A planned 500 kcal deficit predicts about 0.45 kg a
 * week; if the scale says 0.1, then either the plan is not being eaten as
 * written or maintenance is lower than assumed, and both of those are worth
 * knowing far more than the prediction was. `measureTdee` exists to answer
 * which — it solves expenditure from the same two arrays.
 *
 * Under a fortnight of trend, the verdict is `unknown` and says so. Two weeks
 * is the same bar `measureTdee` uses, and for the same reason: water weight
 * swings 1-2 kg, which over 7 days is 0.5-1.0 kg/week of pure noise and would
 * make this function report a disagreement that does not exist.
 */
export function gradePlanAgainstTrend(
  predictedKgPerWeek: number,
  actual: TrendChange | null,
): PlanReality {
  const predictedText = `${Math.abs(predictedKgPerWeek).toFixed(2)} kg/week`

  if (!actual || actual.days < PLAN_GRADE_MIN_DAYS) {
    const have = actual ? actual.days : 0
    return {
      verdict: 'unknown',
      predictedKgPerWeek,
      actualKgPerWeek: actual ? round2(actual.kgPerWeek) : null,
      days: actual ? actual.days : null,
      sentence:
        `This plan predicts ${predictedText}. Grading that needs ` +
        `${PLAN_GRADE_MIN_DAYS} days of weight trend and there are ${have} — ` +
        'under a fortnight, water weight alone is bigger than the signal.',
    }
  }

  const actualKgPerWeek = round2(actual.kgPerWeek)
  const gap = actualKgPerWeek - predictedKgPerWeek
  const gapText = `${Math.abs(actualKgPerWeek).toFixed(2)} kg/week`
  const direction = actualKgPerWeek < 0 ? 'losing' : actualKgPerWeek > 0 ? 'gaining' : 'holding'

  if (Math.abs(gap) <= PLAN_GRADE_TOLERANCE_KG) {
    return {
      verdict: 'agrees',
      predictedKgPerWeek,
      actualKgPerWeek,
      days: actual.days,
      sentence:
        `Predicted ${predictedText}; over ${actual.days} days you are ${direction} ` +
        `${gapText}. The plan and the scale agree, so the maintenance figure it is ` +
        'built on is holding up.',
    }
  }

  // "Slower" means less loss than predicted, whichever side of zero it lands on.
  const slower = gap > 0
  return {
    verdict: slower ? 'slower' : 'faster',
    predictedKgPerWeek,
    actualKgPerWeek,
    days: actual.days,
    sentence: slower
      ? `Predicted ${predictedText}; over ${actual.days} days you are ${direction} ` +
        `${gapText} — less than the plan expects. Either it is not being eaten as ` +
        'written, or maintenance is lower than assumed. The measured expenditure ' +
        'on Trends tells you which; trust it over the prediction.'
      : `Predicted ${predictedText}; over ${actual.days} days you are ${direction} ` +
        `${gapText} — faster than the plan expects. Worth checking the measured ` +
        'expenditure on Trends before cutting anything further.',
  }
}

/* --------------------------------------------------- the protein gap -- */

/** How a fix changes the plan. Drives both the arithmetic and the wording. */
export type ProteinFixKind = 'swap' | 'add'

/**
 * A quantified way to close a protein shortfall.
 *
 * Every field is a number the user can check, on purpose. "Add more protein" is
 * advice; "Greek curd instead of plain: +12 g protein, +0 kcal" is a decision
 * someone can make in a kitchen. And `deltaKcal` is shown alongside because a
 * fix that closes 18 g of protein by adding 175 kcal moves the day out of its
 * calorie band, and hiding that would trade one silent miss for another.
 */
export interface ProteinFix {
  id: string
  kind: ProteinFixKind
  /** Which meal it changes. */
  slot: MealSlot
  /** Short label for the button. */
  label: string
  /** One sentence of why, including the trade-off. Rendered verbatim. */
  detail: string
  deltaProteinG: number
  deltaKcal: number
  /** The food the fix puts in, or whose quantity it raises. */
  foodId: string
  /**
   * For `add`, servings to ADD. For `swap`, servings of the replacement.
   *
   * A serving is whatever the library item says it is — usually 100 g — so
   * `1` against low-fat paneer is the 100 g the `deltaKcal` above was computed
   * from.
   */
  servings: number
  /**
   * For `add` only: the fix is offered only while the meal already holds
   * exactly this many servings of `foodId`. Defaults to 0.
   *
   * This is what keeps `deltaProteinG` and `deltaKcal` TRUE rather than
   * approximately true. "+18 g, +175 kcal" is the effect of 100 g of paneer on
   * top of what the day already plans; offering the same button again after it
   * has been applied would promise the same numbers for a second helping the
   * user can already see is there. It also makes the button idempotent, which
   * matters on a phone with one bar of signal.
   */
  fromServings?: number
  /** For `swap`, the food being replaced. */
  replaceFoodId?: string
  /** Display name for `foodId`, so the item reads correctly before any reload. */
  name: string
}

function itemsIn(day: PlanDay, slot: MealSlot): PlanItem[] {
  return day.meals[slot]
}

function servingsOf(items: PlanItem[], foodId: string): number {
  return items.filter((i) => i.foodId === foodId).reduce((s, i) => s + i.servings, 0)
}

/** Whether a fix is still available on this day — i.e. not already applied. */
export function proteinFixApplies(day: PlanDay, fix: ProteinFix): boolean {
  const items = itemsIn(day, fix.slot)
  if (fix.kind === 'swap') return items.some((i) => i.foodId === fix.replaceFoodId)
  return Math.abs(servingsOf(items, fix.foodId) - (fix.fromServings ?? 0)) < 1e-9
}

/**
 * The fixes worth offering on this day: the ones that are still available, most
 * protein per calorie first.
 *
 * Ordered by kcal per gram of protein rather than by grams, because the day is
 * already at the top of its calorie band. A swap that costs nothing beats an
 * addition that closes more of the gap, and the ordering is the advice.
 */
export function proteinFixesFor(day: PlanDay, fixes: ProteinFix[]): ProteinFix[] {
  return fixes
    .filter((fix) => proteinFixApplies(day, fix))
    .sort((a, b) => a.deltaKcal / a.deltaProteinG - b.deltaKcal / b.deltaProteinG)
}

/**
 * Apply a fix, returning a new plan day. Pure: `nextId` is passed in.
 *
 * A fix that does not apply returns the day UNCHANGED rather than throwing or
 * duplicating. Tapping "add 4 egg whites" twice on a slow connection must not
 * produce eight.
 */
export function applyProteinFix(day: PlanDay, fix: ProteinFix, nextId: () => string): PlanDay {
  if (!proteinFixApplies(day, fix)) return day

  const items = itemsIn(day, fix.slot)
  let next: PlanItem[]

  if (fix.kind === 'swap') {
    next = items.map((item) =>
      item.foodId === fix.replaceFoodId
        ? { ...item, foodId: fix.foodId, name: fix.name, servings: fix.servings }
        : item,
    )
  } else if (items.some((i) => i.foodId === fix.foodId)) {
    // Raise the existing line rather than adding a second one of the same
    // food: "paneer 200 g" and "paneer 100 g" on one plate is a plate of
    // 300 g of paneer, and a shopping list should say so once.
    let added = false
    next = items.map((item) => {
      if (item.foodId !== fix.foodId || added) return item
      added = true
      return { ...item, servings: item.servings + fix.servings }
    })
  } else {
    next = [...items, { id: nextId(), foodId: fix.foodId, name: fix.name, servings: fix.servings }]
  }

  return { ...day, meals: { ...day.meals, [fix.slot]: next } }
}

/** Set one item's quantity. Returns the day unchanged if the item is not in it. */
export function setPlanItemServings(day: PlanDay, itemId: string, servings: number): PlanDay {
  const value = z.number().positive().max(100).parse(servings)
  const meals = { ...day.meals }
  for (const slot of MEAL_SLOTS) {
    if (!meals[slot].some((i) => i.id === itemId)) continue
    meals[slot] = meals[slot].map((i) => (i.id === itemId ? { ...i, servings: value } : i))
  }
  return { ...day, meals }
}

/** Remove one item. The undo for every fix above. */
export function removePlanItem(day: PlanDay, itemId: string): PlanDay {
  const meals = { ...day.meals }
  for (const slot of MEAL_SLOTS) {
    if (!meals[slot].some((i) => i.id === itemId)) continue
    meals[slot] = meals[slot].filter((i) => i.id !== itemId)
  }
  return { ...day, meals }
}

/* ------------------------------------------------------- to log entries -- */

export interface PlanToEntriesOptions {
  /** The local date the entries belong to. */
  date: IsoDate
  /** A collision-free id per entry. Passed in so this stays pure. */
  nextId: () => string
  /** Per-slot clock times. Anything absent falls back to `DEFAULT_MEAL_TIMES`. */
  times?: Partial<Record<MealSlot, LocalTime>>
}

function timeFor(slot: MealSlot, times: PlanToEntriesOptions['times']): LocalTime {
  return localTimeSchema.parse(times?.[slot] ?? DEFAULT_MEAL_TIMES[slot])
}

/**
 * One meal as log entries.
 *
 * Items whose food is missing are SKIPPED rather than logged as zero. A zero
 * entry is the worst of both worlds: it counts the day as logged while
 * contributing nothing, which is precisely the failure `aggregate.ts` is built
 * to avoid one level up.
 */
export function planMealToEntries(
  meal: ResolvedMeal,
  options: PlanToEntriesOptions,
): LogEntry[] {
  const date = isoDateSchema.parse(options.date)
  const at = `${date}T${timeFor(meal.slot, options.times)}`
  return meal.items
    .filter((item) => item.known)
    .map((item) => ({
      id: options.nextId(),
      foodId: item.foodId,
      name: item.name,
      servings: item.servings,
      kcal: round2(item.kcal),
      proteinG: round2(item.proteinG),
      at,
      date,
    }))
}

/** The whole day as log entries — what "Log today's plan" writes. */
export function planDayToEntries(day: ResolvedDay, options: PlanToEntriesOptions): LogEntry[] {
  return day.meals.flatMap((meal) => planMealToEntries(meal, options))
}

/**
 * Which of a day's meals are already in the log for `date`.
 *
 * Derived from the entries rather than remembered in component state, so the
 * tick marks survive a reload — a user who logs breakfast, closes the app and
 * comes back at lunchtime must not be shown an un-ticked breakfast and invited
 * to log it twice.
 *
 * A meal counts as logged when EVERY food it plans appears among that day's
 * entries. Not "any": a day where breakfast was logged and then one egg
 * deleted is a day whose breakfast is no longer what the plan says, and
 * claiming otherwise would hide the difference. Empty meals are never logged —
 * there is nothing to have logged.
 */
export function loggedPlanSlots(
  day: ResolvedDay,
  entries: LogEntry[],
  date: IsoDate,
): Set<MealSlot> {
  const onDate = new Set(
    entries.filter((e) => e.date === date && e.foodId !== undefined).map((e) => e.foodId as string),
  )
  const out = new Set<MealSlot>()
  for (const meal of day.meals) {
    const planned = meal.items.filter((i) => i.known).map((i) => i.foodId)
    if (planned.length === 0) continue
    if (planned.every((foodId) => onDate.has(foodId))) out.add(meal.slot)
  }
  return out
}

/* ------------------------------------------------------------ honesty -- */

/**
 * The disclaimer, in one place.
 *
 * One place because it is said ONCE per screen and must read identically
 * wherever it appears — a warning repeated at every number becomes wallpaper,
 * and a warning phrased three different ways reads as three different
 * warnings.
 */
export const PLAN_DISCLAIMER =
  'Every calorie and protein figure in this plan is an estimate. Food composition ' +
  'varies by brand, variety and how it is cooked, and the reference values behind ' +
  'these numbers carry real error. Treat the plan as a starting point, adjust it ' +
  'against your own weight trend, hunger and how you feel training, and take ' +
  'anything medical to a doctor or a registered dietitian.'

/** Why dry, raw and cooked weights are not interchangeable. Shown near the table. */
export const WEIGHT_BASIS_NOTE =
  'Rice and pulses are weighed DRY, before cooking. Chicken is weighed RAW. Chana ' +
  'and sprouts are weighed BOILED. This is not pedantry: 100 g of dry rice becomes ' +
  'about 300 g cooked, so weighing it out of the pot would record roughly a third ' +
  'of the calories and nothing on screen would look wrong.'

/** The sentence to show when a day misses the protein floor. */
export function proteinGapSentence(score: PlanDayScore, floorG: number): string | null {
  if (score.proteinShortfallG === null) return null
  return (
    `${score.label} plans ${Math.round(score.proteinG)} g of protein, ` +
    `${score.proteinShortfallG} g under your ${Math.round(floorG)} g floor. ` +
    'The calories are on target; the protein is not. Closing it takes a ' +
    'deliberate addition — it will not happen on its own.'
  )
}
