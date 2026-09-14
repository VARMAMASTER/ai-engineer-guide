import { describe, expect, it } from 'vitest'
import {
  UnknownIngredientError,
  computeRecipe,
  ingredientServing,
  servingNutrition,
  yieldRatio,
} from '@/lib/food/compute'
import { formatNutrient, NOT_KNOWN, NUTRIENTS, scaleNutrients } from '@/lib/food/nutrients'
import { getIngredient, getRecipe, nutritionFor } from '@/lib/food/reference'
import type { NutrientSpec } from '@/lib/food/nutrients'
import type { Ingredient, Recipe } from '@/lib/food/types'

const KCAL_SPEC = NUTRIENTS.find((n) => n.key === 'kcal') as NutrientSpec
const FIBRE_SPEC = NUTRIENTS.find((n) => n.key === 'fibre_g') as NutrientSpec

function ingredient(over: Partial<Ingredient> & Pick<Ingredient, 'id'>): Ingredient {
  return {
    name: over.id,
    aliases: [],
    group: 'other',
    state: 'raw',
    prominence: 0,
    source: 'estimate',
    confidence: 'low',
    servings: [{ label: '100 g', grams: 100 }],
    per100g: {
      kcal: 100,
      protein_g: 10,
      carb_g: 10,
      fat_g: 10,
      sugar_g: 1,
      sat_fat_g: 1,
      fibre_g: 1,
      sodium_mg: 1,
      calcium_mg: 1,
      iron_mg: 1,
      potassium_mg: 1,
      vitamin_c_mg: 1,
    },
    ...over,
  }
}

function recipe(over: Partial<Recipe> & Pick<Recipe, 'id' | 'items' | 'yieldG'>): Recipe {
  return {
    name: over.id,
    aliases: [],
    prominence: 0,
    source: 'derived',
    confidence: 'medium',
    servings: [{ label: '1 bowl', grams: 100 }],
    ...over,
  }
}

describe('computeRecipe', () => {
  it('sums a dish from its ingredients and divides by the yield, not the input', () => {
    // 100 g of a 100 kcal/100 g food plus 100 g of water, yielding 200 g:
    // the batch is 100 kcal and the dish is 50 kcal per 100 g. Dividing by the
    // dry weight instead would say 100, which is the classic mistake.
    const lookup = (id: string) =>
      id === 'food'
        ? ingredient({ id: 'food' })
        : ingredient({
            id: 'water',
            per100g: {
              kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, sugar_g: 0, sat_fat_g: 0,
              fibre_g: 0, sodium_mg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0, vitamin_c_mg: 0,
            },
          })

    const result = computeRecipe(
      recipe({ id: 'test', items: [{ ingredientId: 'food', grams: 100 }, { ingredientId: 'water', grams: 100 }], yieldG: 200 }),
      lookup,
    )

    expect(result.batch.kcal).toBeCloseTo(100)
    expect(result.per100g.kcal).toBeCloseTo(50)
    expect(result.inputG).toBe(200)
  })

  it('makes a nutrient UNKNOWN for the dish when any ingredient lacks it', () => {
    const known = ingredient({ id: 'known' })
    const gap = ingredient({
      id: 'gap',
      name: 'Mystery leaf',
      per100g: { ...known.per100g, fibre_g: null },
    })

    const result = computeRecipe(
      recipe({ id: 'test', items: [{ ingredientId: 'known', grams: 100 }, { ingredientId: 'gap', grams: 100 }], yieldG: 200 }),
      (id) => (id === 'known' ? known : gap),
    )

    // Not 1 g. The honest answer is that the dish's fibre is not known, and
    // summing the half that has a figure would understate it silently.
    expect(result.batch.fibre_g).toBeNull()
    expect(result.per100g.fibre_g).toBeNull()
    expect(result.missing.fibre_g).toEqual(['Mystery leaf'])
    // ...while the macros, which no row may omit, still add up.
    expect(result.batch.kcal).toBeCloseTo(200)
  })

  it('renders an unknown nutrient as words, never as zero', () => {
    expect(formatNutrient(null, FIBRE_SPEC)).toEqual({ known: false, text: NOT_KNOWN })
    expect(formatNutrient(undefined, FIBRE_SPEC).text).toBe(NOT_KNOWN)
    expect(formatNutrient(Number.NaN, FIBRE_SPEC).text).toBe(NOT_KNOWN)
    // A measured zero is a different fact and reads as one.
    expect(formatNutrient(0, FIBRE_SPEC)).toEqual({ known: true, text: '0.0 g' })
    expect(formatNutrient(124.4, KCAL_SPEC)).toEqual({ known: true, text: '124 kcal' })
  })

  it('takes the weakest ingredient confidence as the dish ceiling', () => {
    const good = ingredient({ id: 'good', confidence: 'high' })
    const guess = ingredient({ id: 'guess', confidence: 'low' })
    const result = computeRecipe(
      recipe({ id: 'test', items: [{ ingredientId: 'good', grams: 50 }, { ingredientId: 'guess', grams: 1 }], yieldG: 51 }),
      (id) => (id === 'good' ? good : guess),
    )
    expect(result.weakestConfidence).toBe('low')
  })

  it('throws rather than skipping an ingredient it cannot find', () => {
    expect(() =>
      computeRecipe(recipe({ id: 'test', items: [{ ingredientId: 'ghost', grams: 10 }], yieldG: 10 }), () => undefined),
    ).toThrow(UnknownIngredientError)
  })
})

describe('the real dishes', () => {
  it('makes dal tadka a bowl of dal and not a bag of lentils', () => {
    const dal = getRecipe('dal-tadka')!
    const nutrition = nutritionFor(dal)
    const toor = getIngredient('toor-dal')!

    // The dry dal is about 343 kcal/100 g. The dish must be a fraction of that
    // — this is the exact confusion that makes a barcode database useless.
    expect(toor.per100g.kcal).toBeGreaterThan(300)
    expect(nutrition.per100g.kcal).toBeLessThan(120)
    expect(nutrition.per100g.kcal).toBeGreaterThan(50)

    const katori = dal.servings.find((s) => s.label === '1 katori')!
    const serving = servingNutrition(nutrition, katori)
    expect(serving.kcal).toBeCloseTo((nutrition.per100g.kcal * katori.grams) / 100, 6)
  })

  it('has a dish total that equals the sum of its ingredient lines', () => {
    // The audit claim the page makes, tested. If these ever disagree, the
    // breakdown on screen is decoration.
    for (const recipeId of ['dal-tadka', 'sambar', 'idli', 'paneer-butter-masala', 'chicken-biryani']) {
      const nutrition = nutritionFor(getRecipe(recipeId)!)
      const summed = nutrition.lines.reduce((total, line) => total + line.contribution.kcal, 0)
      expect(summed, recipeId).toBeCloseTo(nutrition.batch.kcal, 6)

      const protein = nutrition.lines.reduce((total, line) => total + line.contribution.protein_g, 0)
      expect(protein, recipeId).toBeCloseTo(nutrition.batch.protein_g, 6)
    }
  })

  it('leaves sambar with an unknown nutrient rather than a flattering sum', () => {
    // Drumstick and curry leaves carry no sugar figure in IFCT, so the dish's
    // sugar is genuinely not known. This test exists so that "fill the gap
    // with a plausible number" cannot pass review quietly.
    const nutrition = nutritionFor(getRecipe('sambar')!)
    expect(nutrition.batch.sugar_g).toBeNull()
    expect(nutrition.missing.sugar_g?.length ?? 0).toBeGreaterThan(0)
  })

  it('reports a yield ratio that exposes a wrong yield', () => {
    const dal = getRecipe('dal-tadka')!
    const ratio = yieldRatio(dal, nutritionFor(dal))
    // Water is listed as an ingredient, so the ratio is a little under 1: a
    // dal simmered open after pressure cooking loses 15 to 20 per cent of its
    // water to steam, and 0.8 says so. A ratio ABOVE 1 would mean water that
    // was never listed, which is the mistake this number exists to expose.
    expect(ratio).toBeGreaterThan(0.7)
    expect(ratio).toBeLessThan(1.0)
  })

  it('scales an ingredient serving off its per-100 g row', () => {
    const almond = getIngredient('almond')!
    const ten = almond.servings.find((s) => s.label === '10 almonds')!
    const nutrition = ingredientServing(almond, ten)
    expect(nutrition.kcal).toBeCloseTo((579 * 12) / 100, 6)
    expect(nutrition.protein_g).toBeCloseTo((21.2 * 12) / 100, 6)
  })

  it('keeps null null when scaling', () => {
    const scaled = scaleNutrients(
      { kcal: 100, protein_g: 1, carb_g: 1, fat_g: 1, sugar_g: null, sat_fat_g: null, fibre_g: null, sodium_mg: null, calcium_mg: null, iron_mg: null, potassium_mg: null, vitamin_c_mg: null },
      250,
    )
    expect(scaled.kcal).toBe(250)
    expect(scaled.fibre_g).toBeNull()
    expect(scaled.iron_mg).toBeNull()
  })
})
