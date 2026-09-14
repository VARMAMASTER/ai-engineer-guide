/**
 * The shared food reference layer (spec 4.2).
 *
 * `lib/food` holds NO user data and belongs to no mini-app. Anything may read
 * it — Diet could log against these ids tomorrow, the agent could cite them —
 * the same way `lib/db` and `lib/auth` are read from everywhere. Nothing in
 * here imports from `lib/diet`, `lib/train` or `lib/ops`, and nothing in here
 * writes to the database.
 *
 * THIS BARREL IS SAFE ON BOTH SIDES OF THE WIRE. `lib/food/search` is NOT —
 * it pulls in `lib/db/server`, which imports `next/headers` and which Next
 * rejects inside a Client Component. Import it by its own path, from server
 * code only, exactly as `lib/db` splits its two clients.
 */

export * from './types'
export {
  MACRO_NUTRIENTS,
  MICRO_NUTRIENTS,
  NOT_KNOWN,
  NUTRIENTS,
  confidenceBlurb,
  confidenceLabel,
  formatNutrient,
  knownCount,
  scaleNutrients,
  sourceBlurb,
  sourceLabel,
  weakest,
} from './nutrients'
export type { FormattedNutrient, NutrientSpec } from './nutrients'
export {
  UnknownIngredientError,
  computeRecipe,
  ingredientServing,
  servingNutrition,
  yieldRatio,
} from './compute'
export type { IngredientLookup } from './compute'
export {
  INGREDIENTS,
  RECIPES,
  allFoodIds,
  getIngredient,
  getRecipe,
  nutritionFor,
  popularFoods,
  searchReference,
} from './reference'
