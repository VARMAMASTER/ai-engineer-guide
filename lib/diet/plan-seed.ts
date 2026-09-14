/**
 * The owner's own diet, as data.
 *
 * Every number in this file is a REFERENCE ESTIMATE, and `source: 'library'`
 * on each food says where it came from: a composition table, not a laboratory
 * analysis of the thing in your kitchen. Brand, variety, how long the rice was
 * cooked and how much of the oil stayed in the pan all move these figures by
 * several percent, and the plan screen states that once, plainly.
 *
 * They are still worth being exact about, because the whole feature turns on
 * one finding that only survives if the arithmetic is right: **this plan is on
 * target for calories and misses its protein floor every single day.** The
 * values below reproduce the owner's own hand-computed table to the decimal —
 * `tests/unit/diet/plan.test.ts` asserts all seven days against it — so the
 * shortfall the app reports is his shortfall and not a rounding artefact of a
 * different set of reference values:
 *
 *     Mon 2231 / 118.2    Tue 2109 / 106.2    Wed 2181 / 139.7
 *     Thu 2231 / 118.2    Fri 2109 / 106.2    Sat 2231 / 118.2
 *     Sun 2181 / 139.7            mean 2182 / 120.9
 *
 * Two internal consistency checks that fall out of the same numbers, and that
 * the tests pin so a future edit cannot quietly break them:
 *
 *  - the pressure-cooker batch is 732 kcal / 24.7 g protein, so each of its two
 *    halves is 366 / 12.35;
 *  - tofu is 9.5 kcal per gram of protein and low-fat paneer 9.7, so tofu is
 *    NOT the worse choice per calorie — there is simply not enough of it at
 *    300 g. That is the whole reason `fix-more-tofu` exists.
 *
 * WEIGHT BASIS IS PART OF THE DATA, not a note attached to it. Rice and pulses
 * are dry weights, chicken is raw, chana and sprouts are boiled. See
 * `WEIGHT_BASES` in `types.ts` for why that distinction is load-bearing.
 */
import type { DietTargets, FoodItem, UserProfile } from './types'
import {
  WEEK_DAYS,
  type PlanDay,
  type PlanItem,
  type ProteinFix,
  type WeeklyPlan,
  type WeekDay,
} from './plan'

/* --------------------------------------------------------- the targets -- */

/**
 * 2,100-2,200 kcal, expressed as the two-sided band `aggregate.ts` scores
 * against: a 2,150 midpoint with a 50 kcal half-width is exactly 2,100-2,200,
 * and a one-sided target would let a 1,400 kcal day count as a success.
 */
export const PLAN_TARGETS: DietTargets = { kcal: 2150, proteinG: 150, kcalBand: 50 }

/** The floor and the ceiling of the protein range, 150-170 g/day. */
export const PLAN_PROTEIN_FLOOR_G = 150
export const PLAN_PROTEIN_CEILING_G = 170

/**
 * Maintenance calories, ~2,700.
 *
 * The owner's own estimate, and Mifflin-St Jeor corroborates it rather than
 * the other way round: BMR for a 25-year-old male at 173 cm and 98 kg is
 * 10(98) + 6.25(173) - 5(25) + 5 = 1,941 kcal, and 1,941 x 1.4 for an office
 * job plus ~45 minutes of daily walking and dumbbells is 2,717.
 *
 * It is a STARTING figure and nothing more. `measureTdee` solves expenditure
 * from logged intake and the weight trend once there are 14 days of both, and
 * that number replaces this one — which is the entire point of pairing the
 * plan's predicted loss with what the scale actually did.
 */
export const PLAN_MAINTENANCE_KCAL = 2700

/** The owner's profile, as Mifflin-St Jeor takes it. Weight comes from the trend. */
export const PLAN_PROFILE: UserProfile = {
  sex: 'male',
  ageYears: 25,
  heightCm: 173,
  weightKg: 98,
  // 1.375 is the closest published multiplier to the 1.4 above. It is used
  // only as the formula fallback; the plan's own maintenance figure is the
  // constant above, and a measured TDEE beats both.
  activity: 'light',
  goal: 'lose',
  targets: PLAN_TARGETS,
}

/* ----------------------------------------------------------- the foods -- */

/** Food ids, as constants, so a typo is a compile error and not a blank row. */
export const PLAN_FOOD_IDS = {
  brownRiceDry: 'plan-brown-rice-dry',
  rajmaDry: 'plan-rajma-dry',
  moongDalDry: 'plan-moong-dal-dry',
  greenPeas: 'plan-green-peas',
  mixedVeg: 'plan-mixed-veg',
  oil: 'plan-cooking-oil',
  eggWhole: 'plan-egg-whole',
  eggWhite: 'plan-egg-white',
  brownBread: 'plan-brown-bread',
  juice: 'plan-carrot-beetroot-juice',
  saladVeg: 'plan-salad-veg',
  vegCurry: 'plan-veg-curry',
  curdPlain: 'plan-curd-plain',
  curdGreek: 'plan-curd-greek',
  sproutsBoiled: 'plan-sprouts-boiled',
  chanaBoiled: 'plan-chana-boiled',
  fruit: 'plan-fruit',
  dryFruits: 'plan-dry-fruits',
  paneerLowFat: 'plan-paneer-low-fat',
  tofu: 'plan-tofu',
  chickenRaw: 'plan-chicken-raw',
} as const

/**
 * The library this plan is built from. Per 100 g where the food is weighed,
 * per unit where it is counted.
 *
 * `servingGrams` is set only on the gram-weighed foods, and that is what makes
 * the plan screen show "180 g raw" for the vegetables and "3 × egg" for the
 * eggs rather than converting eggs to grams nobody weighs.
 */
export const PLAN_FOODS: FoodItem[] = [
  // --- the daily pressure-cooker batch. Dry weights, before cooking. ---
  {
    id: PLAN_FOOD_IDS.brownRiceDry,
    name: 'Brown rice',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 362,
    proteinGPerServing: 7.3,
    carbGPerServing: 76,
    fatGPerServing: 2.7,
    weightBasis: 'dry',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.rajmaDry,
    name: 'Rajma (kidney beans)',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 332,
    proteinGPerServing: 24,
    carbGPerServing: 60,
    fatGPerServing: 0.8,
    weightBasis: 'dry',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.moongDalDry,
    name: 'Moong dal',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 348,
    proteinGPerServing: 24,
    carbGPerServing: 59,
    fatGPerServing: 1.2,
    weightBasis: 'dry',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.greenPeas,
    name: 'Green peas',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 80,
    proteinGPerServing: 5.4,
    carbGPerServing: 14,
    fatGPerServing: 0.4,
    weightBasis: 'raw',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.mixedVeg,
    name: 'Mixed vegetables',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 40,
    proteinGPerServing: 1.5,
    carbGPerServing: 7,
    fatGPerServing: 0.3,
    weightBasis: 'raw',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.oil,
    name: 'Cooking oil',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 880,
    proteinGPerServing: 0,
    carbGPerServing: 0,
    fatGPerServing: 100,
    weightBasis: 'as-served',
    source: 'library',
  },

  // --- breakfast, fixed, daily ---
  {
    id: PLAN_FOOD_IDS.eggWhole,
    name: 'Whole egg',
    servingLabel: 'egg',
    kcalPerServing: 72,
    proteinGPerServing: 6.3,
    carbGPerServing: 0.4,
    fatGPerServing: 4.8,
    weightBasis: 'as-served',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.brownBread,
    name: 'Brown bread',
    servingLabel: 'slice',
    kcalPerServing: 75,
    proteinGPerServing: 2.8,
    carbGPerServing: 13.8,
    fatGPerServing: 0.9,
    weightBasis: 'as-served',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.juice,
    name: 'Carrot & beetroot juice',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 40,
    proteinGPerServing: 0.7,
    carbGPerServing: 9,
    fatGPerServing: 0.1,
    weightBasis: 'as-served',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.saladVeg,
    name: 'Salad vegetables',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 20,
    proteinGPerServing: 1.2,
    carbGPerServing: 3.8,
    fatGPerServing: 0.2,
    weightBasis: 'raw',
    source: 'library',
  },

  // --- lunch, fixed, daily. Never chicken. ---
  {
    id: PLAN_FOOD_IDS.vegCurry,
    name: 'Homemade vegetable curry',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 60,
    proteinGPerServing: 1.6,
    carbGPerServing: 6.5,
    fatGPerServing: 3,
    weightBasis: 'cooked',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.curdPlain,
    name: 'Plain curd',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 60,
    proteinGPerServing: 3.5,
    carbGPerServing: 4.5,
    fatGPerServing: 3.1,
    weightBasis: 'as-served',
    source: 'library',
  },
  {
    // The best swap in the plan: same calories, six more grams of protein per
    // 100 g. Not in the default week — it is what `fix-greek-curd` puts there.
    id: PLAN_FOOD_IDS.curdGreek,
    name: 'Greek / high-protein curd',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 60,
    proteinGPerServing: 9.5,
    carbGPerServing: 3.6,
    fatGPerServing: 0.4,
    weightBasis: 'as-served',
    source: 'library',
  },

  // --- evening snack, fixed, daily. Chana is BOILED weight, not dry. ---
  {
    id: PLAN_FOOD_IDS.sproutsBoiled,
    name: 'Sprouts, boiled',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 100,
    proteinGPerServing: 7,
    carbGPerServing: 15,
    fatGPerServing: 0.5,
    weightBasis: 'cooked',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.chanaBoiled,
    name: 'Chana, boiled',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 164,
    proteinGPerServing: 8.9,
    carbGPerServing: 27.4,
    fatGPerServing: 2.6,
    weightBasis: 'cooked',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.fruit,
    name: 'One fruit, medium',
    servingLabel: 'fruit',
    kcalPerServing: 89,
    proteinGPerServing: 1.1,
    carbGPerServing: 22.8,
    fatGPerServing: 0.3,
    weightBasis: 'as-served',
    source: 'library',
  },
  {
    // The alternative to the fruit, and the reason it is in grams: dry fruits
    // are six times as energy-dense as fresh, so "a handful" is anywhere
    // between 100 and 350 kcal. Measured, or not tracked at all.
    id: PLAN_FOOD_IDS.dryFruits,
    name: 'Dry fruits, measured',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 600,
    proteinGPerServing: 18,
    carbGPerServing: 20,
    fatGPerServing: 50,
    weightBasis: 'as-served',
    source: 'library',
  },

  // --- dinner protein. Chicken ONLY on Wednesday and Sunday, at dinner. ---
  {
    id: PLAN_FOOD_IDS.paneerLowFat,
    name: 'Low-fat paneer',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 175,
    proteinGPerServing: 18,
    carbGPerServing: 3.5,
    fatGPerServing: 9.5,
    weightBasis: 'as-served',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.tofu,
    name: 'Tofu',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 76,
    proteinGPerServing: 8,
    carbGPerServing: 1.9,
    fatGPerServing: 4.2,
    weightBasis: 'as-served',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.chickenRaw,
    name: 'Chicken breast',
    servingLabel: '100 g',
    servingGrams: 100,
    kcalPerServing: 120,
    proteinGPerServing: 23,
    carbGPerServing: 0,
    fatGPerServing: 2.6,
    weightBasis: 'raw',
    source: 'library',
  },
  {
    id: PLAN_FOOD_IDS.eggWhite,
    name: 'Egg white',
    servingLabel: 'egg white',
    kcalPerServing: 17,
    proteinGPerServing: 3.6,
    carbGPerServing: 0.2,
    fatGPerServing: 0.1,
    weightBasis: 'as-served',
    source: 'library',
  },
]

/* ------------------------------------------------------------ the week -- */

/**
 * The batch, as one cook: brown rice 100 g dry, rajma 25 g dry, moong dal 25 g
 * dry, green peas 50 g, mixed vegetables 180 g and 10 g of oil.
 *
 * 732 kcal and 24.7 g of protein in the pot. It is split 50/50 between lunch
 * and dinner, so this returns ONE HALF — 366 kcal and 12.35 g — and both meals
 * get a copy. Writing the half rather than the whole is what lets a quantity
 * edit on the plan screen mean what it says: raise the rice at lunch and only
 * lunch changes.
 */
function halfBatch(nextId: () => string): PlanItem[] {
  return [
    { id: nextId(), foodId: PLAN_FOOD_IDS.brownRiceDry, name: 'Brown rice', servings: 0.5 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.rajmaDry, name: 'Rajma (kidney beans)', servings: 0.125 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.moongDalDry, name: 'Moong dal', servings: 0.125 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.greenPeas, name: 'Green peas', servings: 0.25 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.mixedVeg, name: 'Mixed vegetables', servings: 0.9 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.oil, name: 'Cooking oil', servings: 0.05 },
  ]
}

/** 3 whole eggs, 3 slices of brown bread, 200 g of juice, salad. Every day. */
function breakfast(nextId: () => string): PlanItem[] {
  return [
    { id: nextId(), foodId: PLAN_FOOD_IDS.eggWhole, name: 'Whole egg', servings: 3 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.brownBread, name: 'Brown bread', servings: 3 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.juice, name: 'Carrot & beetroot juice', servings: 2 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.saladVeg, name: 'Salad vegetables', servings: 1 },
  ]
}

/** Half the batch, 225 g of veg curry, 200 g of curd. Never chicken. */
function lunch(nextId: () => string): PlanItem[] {
  return [
    ...halfBatch(nextId),
    {
      id: nextId(),
      foodId: PLAN_FOOD_IDS.vegCurry,
      name: 'Homemade vegetable curry',
      servings: 2.25,
    },
    { id: nextId(), foodId: PLAN_FOOD_IDS.curdPlain, name: 'Plain curd', servings: 2 },
  ]
}

/** 100 g boiled sprouts, 100 g boiled chana, one fruit. */
function snack(nextId: () => string): PlanItem[] {
  return [
    { id: nextId(), foodId: PLAN_FOOD_IDS.sproutsBoiled, name: 'Sprouts, boiled', servings: 1 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.chanaBoiled, name: 'Chana, boiled', servings: 1 },
    { id: nextId(), foodId: PLAN_FOOD_IDS.fruit, name: 'One fruit, medium', servings: 1 },
  ]
}

/** The rotating half of the plan: half the batch plus the day's protein. */
const DINNER_PROTEIN: Record<WeekDay, { foodId: string; name: string; servings: number }> = {
  mon: { foodId: PLAN_FOOD_IDS.paneerLowFat, name: 'Low-fat paneer', servings: 2 },
  tue: { foodId: PLAN_FOOD_IDS.tofu, name: 'Tofu', servings: 3 },
  wed: { foodId: PLAN_FOOD_IDS.chickenRaw, name: 'Chicken breast', servings: 2.5 },
  thu: { foodId: PLAN_FOOD_IDS.paneerLowFat, name: 'Low-fat paneer', servings: 2 },
  fri: { foodId: PLAN_FOOD_IDS.tofu, name: 'Tofu', servings: 3 },
  sat: { foodId: PLAN_FOOD_IDS.paneerLowFat, name: 'Low-fat paneer', servings: 2 },
  sun: { foodId: PLAN_FOOD_IDS.chickenRaw, name: 'Chicken breast', servings: 2.5 },
}

const DAY_NOTES: Record<WeekDay, string> = {
  mon: 'Paneer day. One cook in the morning; half the pot at lunch, half at dinner.',
  // Deliberately no figure in the prose. The protein column beside it carries
  // the live shortfall, and a note that said "44 g under" would still say it
  // after the tofu was raised to 450 g.
  tue: 'Tofu day — the lowest-protein day of the week as written.',
  wed: 'Chicken day. Chicken only ever at dinner, and only Wednesday and Sunday.',
  thu: 'Paneer day. Identical to Monday.',
  fri: 'Tofu day — the lowest-protein day of the week as written.',
  sat: 'Paneer 200 g as planned, or swap in 300 g of tofu if you would rather.',
  sun: 'Chicken day. Chicken only ever at dinner, and only Wednesday and Sunday.',
}

/**
 * The seeded week.
 *
 * `nextId` is passed in rather than generated here, both because `lib/diet` is
 * pure and because the caller is the one that knows whether it is writing rows
 * (needs real uuids) or running a test (wants `i1`, `i2`, `i3`).
 */
export function seedWeeklyPlan(nextId: () => string): WeeklyPlan {
  const plan = {} as Record<WeekDay, PlanDay>
  for (const day of WEEK_DAYS) {
    const protein = DINNER_PROTEIN[day]
    plan[day] = {
      day,
      meals: {
        breakfast: breakfast(nextId),
        lunch: lunch(nextId),
        snack: snack(nextId),
        dinner: [...halfBatch(nextId), { id: nextId(), ...protein }],
      },
      note: DAY_NOTES[day],
    }
  }
  return plan
}

/* ----------------------------------------------------------- the fixes -- */

/**
 * The ways to close the protein gap, with the real figures.
 *
 * Ordered here by preference and re-ordered at the point of use by calories per
 * gram of protein, which lands the free swap first. Each `deltaKcal` is the
 * honest cost: the day is already near the top of a 2,100-2,200 band, so a
 * 175 kcal addition pushes it out of the band and the screen must say so rather
 * than celebrate the protein.
 *
 * `fix-extra-paneer` appears twice, with different `fromServings`. That is not
 * duplication for its own sake: "+18 g, +175 kcal" is the effect of 100 g of
 * paneer on top of what the day already plans, and a day that already has
 * 200 g of it starts from 2 servings while a tofu day starts from 0. Exactly
 * one of the two is offered on any given day.
 */
export const PLAN_PROTEIN_FIXES: ProteinFix[] = [
  {
    id: 'fix-greek-curd',
    kind: 'swap',
    slot: 'lunch',
    label: 'Greek curd instead of plain',
    detail:
      'Swapping the 200 g of plain curd at lunch for Greek or high-protein curd adds ' +
      '12 g of protein for no extra calories at all. It is the best swap in this plan ' +
      'and the only one that does not touch the deficit.',
    deltaProteinG: 12,
    deltaKcal: 0,
    foodId: PLAN_FOOD_IDS.curdGreek,
    name: 'Greek / high-protein curd',
    servings: 2,
    replaceFoodId: PLAN_FOOD_IDS.curdPlain,
  },
  {
    id: 'fix-egg-whites',
    kind: 'add',
    slot: 'breakfast',
    label: '4 egg whites at breakfast',
    detail:
      '4 egg whites add 14.4 g of protein for 68 kcal — about 4.7 kcal per gram, the ' +
      'cheapest protein in the plan after the curd swap. It does push the day 68 kcal ' +
      'up, which matters on the days already at the top of the band.',
    deltaProteinG: 14.4,
    deltaKcal: 68,
    foodId: PLAN_FOOD_IDS.eggWhite,
    name: 'Egg white',
    servings: 4,
    fromServings: 0,
  },
  {
    id: 'fix-more-tofu',
    kind: 'add',
    slot: 'dinner',
    label: 'Tofu 300 g → 450 g',
    detail:
      'Another 150 g of tofu is 12 g of protein for 114 kcal. Tofu is not the worse ' +
      'choice per calorie — 9.5 kcal per gram of protein against paneer’s 9.7 — there ' +
      'is simply not enough of it at 300 g.',
    deltaProteinG: 12,
    deltaKcal: 114,
    foodId: PLAN_FOOD_IDS.tofu,
    name: 'Tofu',
    servings: 1.5,
    fromServings: 3,
  },
  {
    id: 'fix-extra-paneer-on-paneer-day',
    kind: 'add',
    slot: 'dinner',
    label: '100 g more low-fat paneer',
    detail:
      'Another 100 g of low-fat paneer is 18 g of protein — the largest single fix here ' +
      '— but it costs 175 kcal, which takes the day out of the top of the calorie band. ' +
      'Worth it on a day you have trained; not a daily habit.',
    deltaProteinG: 18,
    deltaKcal: 175,
    foodId: PLAN_FOOD_IDS.paneerLowFat,
    name: 'Low-fat paneer',
    servings: 1,
    fromServings: 2,
  },
  {
    id: 'fix-extra-paneer',
    kind: 'add',
    slot: 'dinner',
    label: '100 g low-fat paneer at dinner',
    detail:
      '100 g of low-fat paneer alongside the day’s protein is 18 g of protein — the ' +
      'largest single fix here — for 175 kcal, which takes the day out of the top of ' +
      'the calorie band. Worth it on a day you have trained; not a daily habit.',
    deltaProteinG: 18,
    deltaKcal: 175,
    foodId: PLAN_FOOD_IDS.paneerLowFat,
    name: 'Low-fat paneer',
    servings: 1,
    fromServings: 0,
  },
]

/**
 * What the two cheapest fixes together actually achieve, stated up front.
 *
 * Greek curd and 4 egg whites every day is +26.4 g: the chicken days clear the
 * floor at 166 g, the paneer days reach 145 g and the tofu days 133 g. In other
 * words the two free-est fixes are not enough on four days of seven, and saying
 * so is more useful than offering them and leaving the user to discover it.
 */
export const PLAN_HEADROOM_NOTE =
  'Greek curd plus 4 egg whites, every day, adds 26.4 g: Wednesday and Sunday then ' +
  'clear the 150 g floor at 166 g, Monday, Thursday and Saturday reach 145 g, and ' +
  'Tuesday and Friday 133 g. Four days of seven still need a third addition, and the ' +
  'egg whites push the paneer days to 2,299 kcal — 99 over the band.'
