import { describe, it, expect } from 'vitest'
import {
  buildProfile,
  entryToRow,
  foodToRow,
  offProductToFood,
  rowToEntry,
  rowToFood,
  rowToStoredForecast,
  rowToTargets,
  rowToWeight,
  rowToWindow,
  storedForecastToRow,
  type DietEntryRow,
  type DietProfileRow,
} from '@/lib/diet/data'
import { DEFAULT_EATING_WINDOW } from '@/lib/diet/types'

/**
 * The persistence contract, asserted against hand-written rows.
 *
 * These are the translations that sit between a database that knows about
 * `numeric` and `date` and a domain that knows about wall-clock strings, and
 * every one of them has a failure mode that is invisible on screen: a day
 * summed from one column and windowed from another, a partial target that
 * becomes a protein floor of zero, a `numeric` arriving as a string and turning
 * `1850 + 320` into `"1850.00320"`.
 */

const PROFILE_ROW: DietProfileRow = {
  sex: 'male',
  age_years: 30,
  height_cm: 175,
  activity: 'moderate',
  goal: 'lose',
  target_kcal: 2050,
  target_protein_g: 140,
  kcal_band: 150,
  window_start: '12:00',
  window_end: '18:00',
  window_enabled: true,
}

const ENTRY_ROW: DietEntryRow = {
  id: 'e1',
  food_id: 'f1',
  name: 'Dal',
  servings: 1,
  kcal: 180,
  protein_g: 9,
  at_local: '2026-09-14T13:30',
  entry_date: '2026-09-14',
}

describe('entry codec', () => {
  it('reads the meal date off the timestamp, not off the date column', () => {
    // The two disagreeing is the failure this guards: the eating window is
    // judged from the timestamp, so the timestamp has to win everywhere.
    const entry = rowToEntry({ ...ENTRY_ROW, entry_date: '2026-09-13' })
    expect(entry.date).toBe('2026-09-14')
    expect(entry.at).toBe('2026-09-14T13:30')
  })

  it('derives entry_date on the way out, so the two cannot drift', () => {
    const row = entryToRow({
      id: 'e2',
      name: 'Lunch',
      servings: 1,
      kcal: 500,
      proteinG: 30,
      at: '2026-09-13T13:00',
      // A caller passing the wrong day here is exactly the bug; the codec does
      // not take its word for it.
      date: '2026-09-14',
    })
    expect(row.entry_date).toBe('2026-09-13')
    expect(row.at_local).toBe('2026-09-13T13:00')
  })

  it('coerces numeric columns that arrive as strings', () => {
    const entry = rowToEntry({ ...ENTRY_ROW, kcal: '180.00', protein_g: '9.50', servings: '2' })
    expect(entry.kcal).toBe(180)
    expect(entry.proteinG).toBe(9.5)
    expect(entry.servings).toBe(2)
    expect(entry.kcal + 20).toBe(200)
  })

  it('keeps a null food_id as absent rather than as the string "null"', () => {
    expect(rowToEntry({ ...ENTRY_ROW, food_id: null }).foodId).toBeUndefined()
  })
})

describe('food codec', () => {
  it('round-trips a library item', () => {
    const food = rowToFood({
      id: 'f1',
      name: 'Dal',
      serving_label: '1 bowl',
      serving_grams: '200.0',
      kcal_per_serving: '180.00',
      protein_g_per_serving: '9.00',
      source: 'custom',
    })
    expect(food).toEqual({
      id: 'f1',
      name: 'Dal',
      servingLabel: '1 bowl',
      servingGrams: 200,
      kcalPerServing: 180,
      proteinGPerServing: 9,
      source: 'custom',
    })
    expect(foodToRow(food)).toMatchObject({ serving_grams: 200, kcal_per_serving: 180 })
  })

  it('writes a missing serving weight as null, not as zero', () => {
    const row = foodToRow({
      id: 'f2',
      name: 'Roti',
      servingLabel: '1 roti',
      kcalPerServing: 110,
      proteinGPerServing: 3,
      source: 'custom',
    })
    expect(row.serving_grams).toBeNull()
  })
})

describe('weight codec', () => {
  it('maps the date column onto the reading date and coerces kg', () => {
    expect(rowToWeight({ id: 'w1', reading_date: '2026-09-14', kg: '72.40', at_local: null })).toEqual(
      { date: '2026-09-14', kg: 72.4 },
    )
  })
})

describe('profile codec', () => {
  it('defaults the window to 12:00-18:00 when there is no row at all', () => {
    expect(rowToWindow(null)).toEqual(DEFAULT_EATING_WINDOW)
  })

  it('keeps a window whose start is later than its end', () => {
    // 20:00-04:00 crosses midnight and is legal. Nothing may "correct" it.
    expect(rowToWindow({ ...PROFILE_ROW, window_start: '20:00', window_end: '04:00' })).toEqual({
      start: '20:00',
      end: '04:00',
      enabled: true,
    })
  })

  it('reports a disabled window as disabled rather than as absent', () => {
    expect(rowToWindow({ ...PROFILE_ROW, window_enabled: false }).enabled).toBe(false)
  })

  it('returns no targets at all when only one of the pair is set', () => {
    // The alternative is a protein target of zero, which every logged day meets.
    expect(rowToTargets({ ...PROFILE_ROW, target_protein_g: null })).toBeUndefined()
    expect(rowToTargets({ ...PROFILE_ROW, target_kcal: null })).toBeUndefined()
  })

  it('reads targets, defaulting the band to 150 kcal', () => {
    expect(rowToTargets({ ...PROFILE_ROW, kcal_band: null })).toEqual({
      kcal: 2050,
      proteinG: 140,
      kcalBand: 150,
    })
  })

  it('builds a profile from the row plus the weight the caller supplies', () => {
    const profile = buildProfile(PROFILE_ROW, 80)
    expect(profile).toMatchObject({ sex: 'male', heightCm: 175, weightKg: 80, activity: 'moderate' })
    expect(profile?.targets).toEqual({ kcal: 2050, proteinG: 140, kcalBand: 150 })
  })

  it('has no profile without a weight — a formula run on a guess is worse than none', () => {
    expect(buildProfile(PROFILE_ROW, null)).toBeUndefined()
  })

  it('has no profile while any Mifflin input is missing', () => {
    expect(buildProfile({ ...PROFILE_ROW, height_cm: null }, 80)).toBeUndefined()
    expect(buildProfile({ ...PROFILE_ROW, age_years: null }, 80)).toBeUndefined()
    expect(buildProfile({ ...PROFILE_ROW, sex: null }, 80)).toBeUndefined()
    expect(buildProfile({ ...PROFILE_ROW, activity: null }, 80)).toBeUndefined()
    expect(buildProfile({ ...PROFILE_ROW, goal: null }, 80)).toBeUndefined()
  })
})

describe('forecast codec', () => {
  const row = {
    id: 'f-2026-09-14-30',
    made_on: '2026-09-14',
    for_date: '2026-10-14',
    horizon_days: 30,
    kg: null,
    low_kg: '78.20',
    high_kg: '81.40',
    basis: 'measured',
    confidence: 'low',
  }

  it('keeps a range forecast pointless — null kg survives the round trip', () => {
    const stored = rowToStoredForecast(row)
    expect(stored.kg).toBeNull()
    expect(storedForecastToRow(stored).kg).toBeNull()
  })

  it('round-trips a point forecast', () => {
    const stored = rowToStoredForecast({ ...row, kg: '79.80', confidence: 'high' })
    expect(stored.kg).toBe(79.8)
    expect(storedForecastToRow(stored)).toMatchObject({ kg: 79.8, confidence: 'high' })
  })
})

describe('open food facts mapping', () => {
  it('prefers the per-serving figures and says which serving they are', () => {
    const food = offProductToFood({
      code: '123',
      product_name: 'Peanut butter',
      brands: 'Acme, Other',
      serving_size: '32 g',
      nutriments: { 'energy-kcal_serving': 190, proteins_serving: 7, 'energy-kcal_100g': 594 },
    })
    expect(food).toMatchObject({
      name: 'Peanut butter (Acme)',
      servingLabel: '32 g',
      kcalPerServing: 190,
      proteinGPerServing: 7,
      source: 'openfoodfacts',
    })
  })

  it('accepts brands as an array, which is how the search service returns them', () => {
    const food = offProductToFood({
      code: '321',
      product_name: 'Peanut Butter',
      brands: ['Peanut Butter & Co'],
      nutriments: { 'energy-kcal_100g': 562.5, proteins_100g: 21.875 },
    })
    expect(food?.name).toBe('Peanut Butter (Peanut Butter & Co)')
  })

  it('falls back to per-100g and labels it as 100 g, not as "1 serving"', () => {
    // Labelling a per-100g figure as one serving is how somebody logs three
    // times what they ate without any way of noticing.
    const food = offProductToFood({
      code: '456',
      product_name: 'Biscuits',
      nutriments: { 'energy-kcal_100g': '480', proteins_100g: '6.2' },
    })
    expect(food).toMatchObject({ servingLabel: '100 g', servingGrams: 100, kcalPerServing: 480 })
    expect(food?.proteinGPerServing).toBeCloseTo(6.2)
  })

  it('drops a product with no energy rather than logging it as zero', () => {
    expect(offProductToFood({ code: '789', product_name: 'Mystery', nutriments: {} })).toBeNull()
  })

  it('drops a product with no name', () => {
    expect(offProductToFood({ code: '1', nutriments: { 'energy-kcal_100g': 100 } })).toBeNull()
  })
})
