import { scaleNutrients, weakest } from './nutrients'
import type {
  Confidence,
  Ingredient,
  NutrientKey,
  Nutrients,
  Recipe,
  RecipeLine,
  RecipeNutrition,
  Serving,
} from './types'

/**
 * Turning a recipe into a nutrition panel. This is the whole point of the
 * model: no dish's calories are stored anywhere, so nothing can drift out of
 * agreement with its own ingredient list.
 *
 * ---------------------------------------------------------------------------
 * THE TWO DECISIONS THAT MAKE THIS HONEST
 *
 * 1. A nutrient is UNKNOWN for the dish if ANY ingredient lacks it.
 *
 *    The tempting alternative is to sum whatever figures exist. That produces
 *    a number that is confidently too low, with nothing on screen to say so —
 *    and "sambar has 2.1 g of fibre" (because the drumstick has no figure) is
 *    a worse answer than "not known". So the total goes null, and `missing`
 *    names the ingredients responsible so the gap is fixable rather than
 *    mysterious.
 *
 * 2. Per-100 g divides by the YIELD, never by the input weight.
 *
 *    60 g of dry dal plus 300 g of water is 380 g of cooked dal, not 360 g and
 *    not 60 g. Dividing the batch's energy by the wrong denominator is the
 *    single easiest way to publish a dish at three times its real energy
 *    density, and it is exactly what happens when a "recipe" is really a list
 *    of dry ingredients with the water left out.
 * ---------------------------------------------------------------------------
 */

/**
 * The nutrients that can be absent. Written out rather than derived from
 * `NUTRIENTS`, so that adding a nutrient to the panel does not silently change
 * which ones are allowed to be unknown — that decision belongs in the type.
 */
const OPTIONAL_KEYS = [
  'sugar_g',
  'sat_fat_g',
  'fibre_g',
  'sodium_mg',
  'calcium_mg',
  'iron_mg',
  'potassium_mg',
  'vitamin_c_mg',
] as const satisfies readonly NutrientKey[]

/** Thrown rather than silently skipped: a recipe naming a food that does not exist is a bug. */
export class UnknownIngredientError extends Error {
  constructor(
    readonly recipeId: string,
    readonly ingredientId: string,
  ) {
    super(`Recipe "${recipeId}" references unknown ingredient "${ingredientId}".`)
    this.name = 'UnknownIngredientError'
  }
}

export type IngredientLookup = (id: string) => Ingredient | undefined

const ZERO: Nutrients = {
  kcal: 0,
  protein_g: 0,
  carb_g: 0,
  fat_g: 0,
  sugar_g: 0,
  sat_fat_g: 0,
  fibre_g: 0,
  sodium_mg: 0,
  calcium_mg: 0,
  iron_mg: 0,
  potassium_mg: 0,
  vitamin_c_mg: 0,
}

export function computeRecipe(recipe: Recipe, lookup: IngredientLookup): RecipeNutrition {
  const lines: RecipeLine[] = []

  for (const item of recipe.items) {
    const ingredient = lookup(item.ingredientId)
    if (!ingredient) throw new UnknownIngredientError(recipe.id, item.ingredientId)
    lines.push({
      ingredient,
      grams: item.grams,
      note: item.note,
      contribution: scaleNutrients(ingredient.per100g, item.grams),
    })
  }

  const batch: Nutrients = { ...ZERO }
  const missing: Partial<Record<NutrientKey, string[]>> = {}

  // The four macros are non-nullable on every ingredient, so they always add
  // up. Everything else has to survive a hole in the data.
  for (const line of lines) {
    batch.kcal += line.contribution.kcal
    batch.protein_g += line.contribution.protein_g
    batch.carb_g += line.contribution.carb_g
    batch.fat_g += line.contribution.fat_g
  }

  for (const key of OPTIONAL_KEYS) {
    const gaps = lines.filter((line) => line.ingredient.per100g[key] == null)
    if (gaps.length > 0) {
      missing[key] = gaps.map((line) => line.ingredient.name)
      // Assigning null here is the whole rule. `batch` is typed with the
      // optional keys nullable, so this is not a cast.
      ;(batch as Record<NutrientKey, number | null>)[key] = null
      continue
    }
    let total = 0
    for (const line of lines) total += (line.contribution[key] as number) ?? 0
    ;(batch as Record<NutrientKey, number | null>)[key] = total
  }

  const inputG = lines.reduce((sum, line) => sum + line.grams, 0)
  // `scaleNutrients(x, g)` multiplies by g/100, so passing 10000/yieldG gives
  // the factor 100/yieldG — the batch divided by its cooked weight, per 100 g.
  const per100g = scaleNutrients(batch as Nutrients, 10000 / recipe.yieldG)

  const confidences: Confidence[] = lines.map((line) => line.ingredient.confidence)

  return {
    batch,
    per100g,
    missing,
    lines,
    inputG,
    weakestConfidence: weakest(confidences),
  }
}

/**
 * One serving of a dish.
 *
 * Scaling from per-100 g rather than from the batch, deliberately: the
 * per-100 g figures are what the panel shows and what a user would check the
 * arithmetic against, so a serving derived any other way could disagree with
 * the row above it by a rounding step and look like a bug.
 */
export function servingNutrition(nutrition: RecipeNutrition, serving: Serving): Nutrients {
  return scaleNutrients(nutrition.per100g, serving.grams)
}

/** One serving of a plain ingredient — 30 g of almonds, one banana. */
export function ingredientServing(ingredient: Ingredient, serving: Serving): Nutrients {
  return scaleNutrients(ingredient.per100g, serving.grams)
}

/**
 * How much water the batch gained or lost, as a ratio of the input weight.
 *
 * Shown next to the yield because it is the one number that exposes a wrong
 * yield at a glance: 1.05 for a dal (which absorbs water and so should be well
 * above 1 unless the water is listed as an ingredient) is somebody's typo, and
 * a reader can catch it where an energy figure would hide it.
 */
export function yieldRatio(recipe: Recipe, nutrition: RecipeNutrition): number {
  return recipe.yieldG / nutrition.inputG
}
