import { describe, it, expect } from 'vitest'
import {
  applyProteinFix,
  bandVerdict,
  DEFAULT_MEAL_TIMES,
  emptyPlanMeals,
  gradePlanAgainstTrend,
  MEAL_SLOTS,
  planDayToEntries,
  planMealToEntries,
  proteinFixApplies,
  proteinFixesFor,
  proteinGapSentence,
  removePlanItem,
  resolvePlanDay,
  resolveWeeklyPlan,
  scorePlanDay,
  setPlanItemServings,
  summarisePlan,
  WEEK_DAYS,
  weekDayOf,
  type PlanDay,
  type ResolvedDay,
  type WeekDay,
} from '@/lib/diet/plan'
import {
  PLAN_FOODS,
  PLAN_FOOD_IDS,
  PLAN_MAINTENANCE_KCAL,
  PLAN_PROTEIN_FIXES,
  PLAN_PROTEIN_FLOOR_G,
  PLAN_TARGETS,
  seedWeeklyPlan,
} from '@/lib/diet/plan-seed'
import { bmi, bmr, KCAL_PER_KG } from '@/lib/diet/energy'
import { dayTotals } from '@/lib/diet/aggregate'
import { weightTrend, trendChange } from '@/lib/diet/trend'
import { PLAN_PROFILE } from '@/lib/diet/plan-seed'
import { dailyWeights } from './fixtures'

/**
 * The weekly meal plan, held to the owner's own hand-computed table.
 *
 * This file's first job is arithmetic, and its second is a claim: **the plan is
 * on target for calories and misses its protein floor on every single day.**
 * That finding is the whole reason the feature exists, so it is asserted here
 * rather than left to be noticed — if a future edit to a reference value made
 * the shortfall disappear, the tests below would go red and somebody would have
 * to decide whether the data changed or the finding did.
 *
 *     Mon 2231 / 118.2    Tue 2109 / 106.2    Wed 2181 / 139.7
 *     Thu 2231 / 118.2    Fri 2109 / 106.2    Sat 2231 / 118.2
 *     Sun 2181 / 139.7            mean 2182 / 120.9
 */

/** Deterministic ids, so a plan built twice is identical. */
function idFactory(prefix = 'i'): () => string {
  let n = 0
  return () => {
    n += 1
    return `${prefix}${n}`
  }
}

const PLAN = seedWeeklyPlan(idFactory())
const RESOLVED = resolveWeeklyPlan(PLAN, PLAN_FOODS)
const BY_DAY = new Map<WeekDay, ResolvedDay>(RESOLVED.map((d) => [d.day, d]))

/** The owner's table, verbatim. */
const EXPECTED: Record<WeekDay, { kcal: number; proteinG: number }> = {
  mon: { kcal: 2231, proteinG: 118.2 },
  tue: { kcal: 2109, proteinG: 106.2 },
  wed: { kcal: 2181, proteinG: 139.7 },
  thu: { kcal: 2231, proteinG: 118.2 },
  fri: { kcal: 2109, proteinG: 106.2 },
  sat: { kcal: 2231, proteinG: 118.2 },
  sun: { kcal: 2181, proteinG: 139.7 },
}

const SCORE_OPTIONS = { targets: PLAN_TARGETS, maintenanceKcal: PLAN_MAINTENANCE_KCAL }

describe('the seeded plan reproduces the owner’s own figures', () => {
  it('has all seven days, Monday first', () => {
    expect(RESOLVED.map((d) => d.day)).toEqual([...WEEK_DAYS])
  })

  for (const day of WEEK_DAYS) {
    it(`${day} is ${EXPECTED[day].kcal} kcal and ${EXPECTED[day].proteinG} g of protein`, () => {
      const resolved = BY_DAY.get(day)!
      expect(resolved.kcal).toBeCloseTo(EXPECTED[day].kcal, 1)
      expect(resolved.proteinG).toBeCloseTo(EXPECTED[day].proteinG, 1)
    })
  }

  it('averages 2,182 kcal and 120.9 g of protein across the week', () => {
    const summary = summarisePlan(RESOLVED, SCORE_OPTIONS)
    expect(Math.round(summary.meanKcal)).toBe(2182)
    expect(summary.meanProteinG).toBeCloseTo(120.9, 1)
  })

  it('leaves no item unresolved — every plan food is in the seeded library', () => {
    for (const day of RESOLVED) expect(day.unknownItems).toBe(0)
  })

  it('carries a complete macro split, so carbs and fat are totals not partials', () => {
    for (const day of RESOLVED) expect(day.macrosComplete).toBe(true)
  })
})

describe('the pressure-cooker batch', () => {
  it('is 732 kcal and 24.7 g of protein, split 366 / 12.35 between lunch and dinner', () => {
    const monday = BY_DAY.get('mon')!
    const batchIds = new Set<string>([
      PLAN_FOOD_IDS.brownRiceDry,
      PLAN_FOOD_IDS.rajmaDry,
      PLAN_FOOD_IDS.moongDalDry,
      PLAN_FOOD_IDS.greenPeas,
      PLAN_FOOD_IDS.mixedVeg,
      PLAN_FOOD_IDS.oil,
    ])

    const halves = monday.meals
      .filter((m) => m.slot === 'lunch' || m.slot === 'dinner')
      .map((m) => m.items.filter((i) => batchIds.has(i.foodId)))

    expect(halves).toHaveLength(2)
    for (const half of halves) {
      expect(half.reduce((s, i) => s + i.kcal, 0)).toBeCloseTo(366, 1)
      expect(half.reduce((s, i) => s + i.proteinG, 0)).toBeCloseTo(12.35, 2)
    }

    const whole = halves.flat()
    expect(whole.reduce((s, i) => s + i.kcal, 0)).toBeCloseTo(732, 1)
    expect(whole.reduce((s, i) => s + i.proteinG, 0)).toBeCloseTo(24.7, 2)
  })

  it('records rice and pulses at DRY weight, before cooking', () => {
    const lunch = BY_DAY.get('mon')!.meals.find((m) => m.slot === 'lunch')!
    const rice = lunch.items.find((i) => i.foodId === PLAN_FOOD_IDS.brownRiceDry)!
    expect(rice.weightBasis).toBe('dry')
    // Half of 100 g dry. The label has to SAY dry: 50 g of cooked rice is
    // about a third of the calories and nothing on screen would look wrong.
    expect(rice.quantityLabel).toBe('50 g dry')
    for (const id of [PLAN_FOOD_IDS.rajmaDry, PLAN_FOOD_IDS.moongDalDry]) {
      expect(lunch.items.find((i) => i.foodId === id)!.weightBasis).toBe('dry')
    }
  })
})

describe('weight basis, where getting it wrong is invisible', () => {
  it('weighs chicken RAW and only ever at dinner, on Wednesday and Sunday', () => {
    for (const day of RESOLVED) {
      const chickenDay = day.day === 'wed' || day.day === 'sun'
      for (const meal of day.meals) {
        const chicken = meal.items.filter((i) => i.foodId === PLAN_FOOD_IDS.chickenRaw)
        if (!chickenDay || meal.slot !== 'dinner') {
          expect(chicken, `${day.day} ${meal.slot} must have no chicken`).toHaveLength(0)
          continue
        }
        expect(chicken).toHaveLength(1)
        expect(chicken[0].weightBasis).toBe('raw')
        expect(chicken[0].quantityLabel).toBe('250 g raw')
      }
    }
  })

  it('weighs chana and sprouts BOILED, not dry', () => {
    const snack = BY_DAY.get('tue')!.meals.find((m) => m.slot === 'snack')!
    const chana = snack.items.find((i) => i.foodId === PLAN_FOOD_IDS.chanaBoiled)!
    expect(chana.weightBasis).toBe('cooked')
    expect(chana.quantityLabel).toBe('100 g cooked')
    expect(snack.items.find((i) => i.foodId === PLAN_FOOD_IDS.sproutsBoiled)!.weightBasis).toBe(
      'cooked',
    )
  })

  it('counts eggs and bread rather than converting them to grams nobody weighs', () => {
    const breakfast = BY_DAY.get('mon')!.meals.find((m) => m.slot === 'breakfast')!
    expect(breakfast.items.find((i) => i.foodId === PLAN_FOOD_IDS.eggWhole)!.quantityLabel).toBe(
      '3 × egg',
    )
    expect(breakfast.items.find((i) => i.foodId === PLAN_FOOD_IDS.brownBread)!.quantityLabel).toBe(
      '3 × slice',
    )
  })

  it('never claims a figure for a food that is not in the library', () => {
    const orphan: PlanDay = {
      day: 'mon',
      meals: {
        ...emptyPlanMeals(),
        dinner: [{ id: 'x', foodId: 'not-in-the-library', name: 'Mystery', servings: 2 }],
      },
    }
    const resolved = resolvePlanDay(orphan, PLAN_FOODS)
    expect(resolved.kcal).toBe(0)
    expect(resolved.unknownItems).toBe(1)
    // And it is not silently a complete macro split either.
    expect(resolved.macrosComplete).toBe(false)
    expect(resolved.meals.find((m) => m.slot === 'dinner')!.items[0].known).toBe(false)
  })
})

describe('the finding: calories on target, protein short every day', () => {
  const summary = summarisePlan(RESOLVED, SCORE_OPTIONS)

  it('puts the week’s mean inside the 2,100–2,200 band', () => {
    expect(summary.kcalVerdict).toBe('within')
    expect(bandVerdict(2150, PLAN_TARGETS)).toBe('within')
    expect(bandVerdict(2099, PLAN_TARGETS)).toBe('below')
    expect(bandVerdict(2201, PLAN_TARGETS)).toBe('above')
  })

  it('names the three paneer days that sit ABOVE the band rather than rounding them in', () => {
    expect(summary.daysAboveBand).toEqual(['mon', 'thu', 'sat'])
    expect(summary.daysBelowBand).toEqual([])
  })

  it('misses the 150 g protein floor on all seven days', () => {
    expect(summary.daysUnderProteinFloor).toEqual([...WEEK_DAYS])
  })

  it('is 10 g short on chicken days and 44 g short on tofu days', () => {
    const score = (day: WeekDay) => scorePlanDay(BY_DAY.get(day)!, SCORE_OPTIONS)
    expect(score('wed').proteinShortfallG).toBeCloseTo(10.3, 1)
    expect(score('sun').proteinShortfallG).toBeCloseTo(10.3, 1)
    expect(score('tue').proteinShortfallG).toBeCloseTo(43.8, 1)
    expect(score('fri').proteinShortfallG).toBeCloseTo(43.8, 1)
    expect(score('mon').proteinShortfallG).toBeCloseTo(31.8, 1)
    expect(summary.worstShortfallG).toBeCloseTo(43.8, 1)
    expect(summary.bestShortfallG).toBeCloseTo(10.3, 1)
  })

  it('reports a met floor as null rather than a shortfall of zero', () => {
    const generous = { ...SCORE_OPTIONS, targets: { ...PLAN_TARGETS, proteinG: 100 } }
    expect(scorePlanDay(BY_DAY.get('wed')!, generous).proteinShortfallG).toBeNull()
  })

  it('says so in a sentence, with the numbers in it', () => {
    const sentence = proteinGapSentence(
      scorePlanDay(BY_DAY.get('tue')!, SCORE_OPTIONS),
      PLAN_PROTEIN_FLOOR_G,
    )
    expect(sentence).toContain('Tuesday')
    expect(sentence).toContain('106 g')
    expect(sentence).toContain('43.8 g under')
    expect(sentence).toContain('150 g floor')
  })

  it('has nothing to say when the floor is met', () => {
    const generous = { ...SCORE_OPTIONS, targets: { ...PLAN_TARGETS, proteinG: 100 } }
    expect(proteinGapSentence(scorePlanDay(BY_DAY.get('wed')!, generous), 100)).toBeNull()
  })
})

describe('the deficit and what it predicts', () => {
  const summary = summarisePlan(RESOLVED, SCORE_OPTIONS)

  it('averages a 518 kcal deficit against 2,700 maintenance', () => {
    expect(Math.round(summary.meanDeficitKcal)).toBe(518)
  })

  it('predicts 0.47 kg of loss a week, signed the same way the trend is', () => {
    expect(summary.predictedKgPerWeek).toBeCloseTo(-0.47, 2)
    // Derivation, not a magic number: 518 kcal x 7 days / 7,700 kcal per kg.
    expect(summary.predictedKgPerWeek).toBeCloseTo(-(518 * 7) / KCAL_PER_KG, 2)
  })

  it('corroborates the 2,700 maintenance figure with Mifflin-St Jeor', () => {
    // 10(98) + 6.25(173) - 5(25) + 5
    expect(Math.round(bmr(PLAN_PROFILE))).toBe(1941)
    expect(Math.round(bmr(PLAN_PROFILE) * 1.4)).toBe(2718)
    expect(bmi(98, 173).bmi).toBeCloseTo(32.7, 1)
    expect(bmi(98, 173).category).toBe('obese-i')
  })
})

describe('the plan graded against the weight trend that actually arrived', () => {
  const predicted = -0.47

  it('refuses to grade under a fortnight of trend, and says why', () => {
    const short = trendChange(weightTrend(dailyWeights('2026-09-01', 8, (i) => 98 - i * 0.05)), '2026-09-01', '2026-09-08')
    const result = gradePlanAgainstTrend(predicted, short)
    expect(result.verdict).toBe('unknown')
    expect(result.sentence).toContain('14 days of weight trend')
  })

  it('says nothing confident with no weight at all', () => {
    const result = gradePlanAgainstTrend(predicted, null)
    expect(result.verdict).toBe('unknown')
    expect(result.actualKgPerWeek).toBeNull()
  })

  it('agrees when the scale does what the plan said', () => {
    // 0.47 kg/week for 28 days is 1.88 kg. The EWMA lags a straight line, so
    // the readings are laid down steeper than the trend that comes out.
    const weights = dailyWeights('2026-08-18', 28, (i) => 98 - i * (0.47 / 7))
    const change = trendChange(weightTrend(weights), '2026-08-18', '2026-09-14')
    const result = gradePlanAgainstTrend(predicted, change)
    expect(result.days).toBe(27)
    expect(result.verdict).toBe('agrees')
    expect(result.sentence).toContain('The plan and the scale agree')
  })

  it('calls out a stall as SLOWER and points at the measured expenditure', () => {
    const weights = dailyWeights('2026-08-18', 28, () => 98)
    const change = trendChange(weightTrend(weights), '2026-08-18', '2026-09-14')
    const result = gradePlanAgainstTrend(predicted, change)
    expect(result.verdict).toBe('slower')
    expect(result.sentence).toContain('maintenance is lower than assumed')
    expect(result.sentence).toContain('measured expenditure')
  })

  it('calls out faster-than-predicted loss without celebrating it', () => {
    const weights = dailyWeights('2026-08-18', 28, (i) => 98 - i * 0.2)
    const change = trendChange(weightTrend(weights), '2026-08-18', '2026-09-14')
    const result = gradePlanAgainstTrend(predicted, change)
    expect(result.verdict).toBe('faster')
    expect(result.sentence).toContain('faster than the plan expects')
  })
})

describe('the one-tap protein fixes, with the real figures', () => {
  const monday = PLAN.mon!
  const tuesday = PLAN.tue!
  const wednesday = PLAN.wed!

  function resolvedOf(day: PlanDay) {
    return resolvePlanDay(day, PLAN_FOODS)
  }

  it('offers the free swap first and the most expensive fix last', () => {
    const offered = proteinFixesFor(tuesday, PLAN_PROTEIN_FIXES).map((f) => f.id)
    expect(offered[0]).toBe('fix-greek-curd')
    expect(offered[1]).toBe('fix-egg-whites')
    expect(offered).toContain('fix-more-tofu')
    // Exactly one of the two paneer variants applies on any given day.
    expect(offered.filter((id) => id.startsWith('fix-extra-paneer'))).toEqual(['fix-extra-paneer'])
  })

  it('offers the paneer-day variant on a paneer day instead', () => {
    const offered = proteinFixesFor(monday, PLAN_PROTEIN_FIXES).map((f) => f.id)
    expect(offered.filter((id) => id.startsWith('fix-extra-paneer'))).toEqual([
      'fix-extra-paneer-on-paneer-day',
    ])
    expect(offered).not.toContain('fix-more-tofu')
  })

  it('Greek curd is +12 g protein for +0 kcal, exactly as claimed', () => {
    const fix = PLAN_PROTEIN_FIXES.find((f) => f.id === 'fix-greek-curd')!
    const before = resolvedOf(monday)
    const after = resolvedOf(applyProteinFix(monday, fix, idFactory('f')))
    expect(after.proteinG - before.proteinG).toBeCloseTo(12, 1)
    expect(after.kcal - before.kcal).toBeCloseTo(0, 1)
    expect(after.proteinG - before.proteinG).toBeCloseTo(fix.deltaProteinG, 1)
    expect(after.kcal - before.kcal).toBeCloseTo(fix.deltaKcal, 1)
  })

  it('every fix moves the day by exactly what its label promises', () => {
    for (const day of [monday, tuesday, wednesday]) {
      for (const fix of proteinFixesFor(day, PLAN_PROTEIN_FIXES)) {
        const before = resolvedOf(day)
        const after = resolvedOf(applyProteinFix(day, fix, idFactory('f')))
        expect(
          after.proteinG - before.proteinG,
          `${fix.id} on ${day.day}: protein`,
        ).toBeCloseTo(fix.deltaProteinG, 1)
        expect(after.kcal - before.kcal, `${fix.id} on ${day.day}: kcal`).toBeCloseTo(
          fix.deltaKcal,
          1,
        )
      }
    }
  })

  it('is idempotent — a double tap does not add eight egg whites', () => {
    const fix = PLAN_PROTEIN_FIXES.find((f) => f.id === 'fix-egg-whites')!
    const once = applyProteinFix(monday, fix, idFactory('f'))
    expect(proteinFixApplies(once, fix)).toBe(false)
    const twice = applyProteinFix(once, fix, idFactory('g'))
    expect(resolvedOf(twice).proteinG).toBeCloseTo(resolvedOf(once).proteinG, 2)
  })

  it('raises the existing line rather than listing paneer twice', () => {
    const fix = PLAN_PROTEIN_FIXES.find((f) => f.id === 'fix-extra-paneer-on-paneer-day')!
    const after = applyProteinFix(monday, fix, idFactory('f'))
    const paneer = after.meals.dinner.filter((i) => i.foodId === PLAN_FOOD_IDS.paneerLowFat)
    expect(paneer).toHaveLength(1)
    expect(paneer[0].servings).toBeCloseTo(3, 3)
  })

  it('reaches the owner’s stated headroom: Greek curd plus 4 egg whites', () => {
    const curd = PLAN_PROTEIN_FIXES.find((f) => f.id === 'fix-greek-curd')!
    const whites = PLAN_PROTEIN_FIXES.find((f) => f.id === 'fix-egg-whites')!
    const ids = idFactory('f')
    const reach = (day: PlanDay) =>
      resolvedOf(applyProteinFix(applyProteinFix(day, curd, ids), whites, ids)).proteinG

    expect(Math.round(reach(wednesday))).toBe(166)
    expect(Math.round(reach(monday))).toBe(145)
    expect(Math.round(reach(tuesday))).toBe(133)

    // And the honest cost: the paneer days leave the calorie band.
    const boosted = resolvedOf(applyProteinFix(applyProteinFix(monday, curd, ids), whites, ids))
    expect(Math.round(boosted.kcal)).toBe(2299)
    expect(bandVerdict(boosted.kcal, PLAN_TARGETS)).toBe('above')
  })

  it('tofu is not worse per calorie than paneer — 9.5 against 9.7', () => {
    const tofu = PLAN_FOODS.find((f) => f.id === PLAN_FOOD_IDS.tofu)!
    const paneer = PLAN_FOODS.find((f) => f.id === PLAN_FOOD_IDS.paneerLowFat)!
    expect(tofu.kcalPerServing / tofu.proteinGPerServing).toBeCloseTo(9.5, 1)
    expect(paneer.kcalPerServing / paneer.proteinGPerServing).toBeCloseTo(9.7, 1)
    expect(tofu.kcalPerServing / tofu.proteinGPerServing).toBeLessThan(
      paneer.kcalPerServing / paneer.proteinGPerServing,
    )
  })
})

describe('editing quantities', () => {
  it('recomputes energy and every macro from one number', () => {
    const monday = PLAN.mon!
    const chana = monday.meals.snack.find((i) => i.foodId === PLAN_FOOD_IDS.chanaBoiled)!
    const doubled = setPlanItemServings(monday, chana.id, 2)
    const before = resolvePlanDay(monday, PLAN_FOODS)
    const after = resolvePlanDay(doubled, PLAN_FOODS)

    expect(after.kcal - before.kcal).toBeCloseTo(164, 1)
    expect(after.proteinG - before.proteinG).toBeCloseTo(8.9, 1)
    expect(after.carbG - before.carbG).toBeCloseTo(27.4, 1)
    expect(after.fatG - before.fatG).toBeCloseTo(2.6, 1)
  })

  it('leaves the day alone when the item is not in it', () => {
    const monday = PLAN.mon!
    expect(setPlanItemServings(monday, 'no-such-item', 5)).toEqual(monday)
  })

  it('removes an item, which is the undo for every fix', () => {
    const fix = PLAN_PROTEIN_FIXES.find((f) => f.id === 'fix-egg-whites')!
    const ids = idFactory('f')
    const boosted = applyProteinFix(PLAN.mon!, fix, ids)
    const added = boosted.meals.breakfast.find((i) => i.foodId === PLAN_FOOD_IDS.eggWhite)!
    const reverted = removePlanItem(boosted, added.id)
    expect(resolvePlanDay(reverted, PLAN_FOODS).kcal).toBeCloseTo(2231, 1)
    expect(proteinFixApplies(reverted, fix)).toBe(true)
  })
})

describe('the plan as log entries — one tap for a whole day', () => {
  const monday = BY_DAY.get('mon')!
  const options = { date: '2026-09-14', nextId: idFactory('e') }

  it('writes every item of every meal', () => {
    const entries = planDayToEntries(monday, options)
    expect(entries).toHaveLength(monday.meals.reduce((n, m) => n + m.items.length, 0))
    for (const entry of entries) expect(entry.date).toBe('2026-09-14')
  })

  it('totals to exactly what the plan said, through the existing aggregate', () => {
    // The point of the whole feature: the plan produces ORDINARY log entries,
    // and `dayTotals` — which knows nothing about plans — agrees with the table.
    const entries = planDayToEntries(monday, { date: '2026-09-14', nextId: idFactory('e') })
    const totals = dayTotals(entries, '2026-09-14')
    expect(totals.logged).toBe(true)
    if (!totals.logged) throw new Error('unreachable')
    expect(Math.round(totals.kcal)).toBe(2231)
    expect(totals.proteinG).toBeCloseTo(118.2, 1)
  })

  it('gives each meal its own clock time, so the eating span is not zero', () => {
    const entries = planDayToEntries(monday, { date: '2026-09-14', nextId: idFactory('e') })
    const times = new Set(entries.map((e) => e.at.slice(11, 16)))
    expect([...times].sort()).toEqual(
      [...new Set(MEAL_SLOTS.map((slot) => DEFAULT_MEAL_TIMES[slot]))].sort(),
    )
  })

  it('accepts overridden meal times', () => {
    const entries = planMealToEntries(monday.meals.find((m) => m.slot === 'dinner')!, {
      date: '2026-09-14',
      nextId: idFactory('e'),
      times: { dinner: '21:30' },
    })
    for (const entry of entries) expect(entry.at).toBe('2026-09-14T21:30')
  })

  it('ticks off one meal at a time', () => {
    const lunch = monday.meals.find((m) => m.slot === 'lunch')!
    const entries = planMealToEntries(lunch, { date: '2026-09-14', nextId: idFactory('e') })
    expect(Math.round(entries.reduce((s, e) => s + e.kcal, 0))).toBe(621)
    expect(entries.reduce((s, e) => s + e.proteinG, 0)).toBeCloseTo(22.95, 1)
  })

  it('skips an unresolved item rather than logging a zero that counts as a day', () => {
    const orphan = resolvePlanDay(
      {
        day: 'mon',
        meals: {
          ...emptyPlanMeals(),
          dinner: [
            { id: 'x', foodId: 'gone', name: 'Gone', servings: 1 },
            { id: 'y', foodId: PLAN_FOOD_IDS.tofu, name: 'Tofu', servings: 3 },
          ],
        },
      },
      PLAN_FOODS,
    )
    const entries = planDayToEntries(orphan, { date: '2026-09-14', nextId: idFactory('e') })
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('Tofu')
  })
})

describe('calendar mapping', () => {
  it('maps a local date to its weekday, Monday first', () => {
    // 2026-09-14 is a Monday.
    expect(weekDayOf('2026-09-14')).toBe('mon')
    expect(weekDayOf('2026-09-20')).toBe('sun')
    expect(weekDayOf('2026-09-16')).toBe('wed')
  })

  it('covers all seven days across a week of dates', () => {
    const days = Array.from({ length: 7 }, (_, i) => weekDayOf(`2026-09-${14 + i}`))
    expect(new Set(days).size).toBe(7)
  })
})
