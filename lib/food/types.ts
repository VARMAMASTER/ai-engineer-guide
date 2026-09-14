/**
 * The food reference vocabulary.
 *
 * `lib/food` is a SHARED REFERENCE LAYER, not a mini-app (spec 4.2). It holds
 * no user data and any app may read it, the way `lib/db` and `lib/auth` are
 * read from everywhere. Diet may one day log against these ids; Diet does not
 * own them, and nothing here imports from `lib/diet`.
 *
 * ---------------------------------------------------------------------------
 * THE ONE RULE THAT SHAPES EVERY TYPE BELOW: null IS NOT ZERO.
 *
 * `fibre_g: 0` says somebody measured coconut oil and found no fibre.
 * `fibre_g: null` says nobody has measured it. A database that stores the
 * second as the first reports a confident total that is quietly too low, and
 * then somebody eats against it. So every nutrient that sources routinely
 * leave blank is typed `number | null`, and `formatNutrient` renders null as
 * "not known" — never as 0, never as "—" with no explanation.
 *
 * The four macros every source publishes are plain `number`, because a row
 * without them is not a food record at all.
 * ---------------------------------------------------------------------------
 */

/** Where a number came from. Ordered loosely from most to least defensible. */
export type NutritionSource =
  /** Indian Food Composition Tables 2017, ICMR-NIN. The authority for Indian foods. */
  | 'ifct-2017'
  /** USDA FoodData Central. Excellent for whole foods; its composed dishes are American. */
  | 'usda-fdc'
  /** Read off a pack. True of that pack, and of nothing else. */
  | 'label'
  /** Computed from other rows here — every recipe total is this. */
  | 'derived'
  /** Somebody's considered guess. Labelled as one, always. */
  | 'estimate'

/**
 * How much to trust the figure. Deliberately three coarse buckets rather than
 * a percentage: a percentage invites arithmetic on a number that was never
 * measured, and "87% confident" about a fibre value is a fiction.
 */
export type Confidence = 'high' | 'medium' | 'low'

export type FoodGroup =
  | 'pulse'
  | 'grain'
  | 'flour'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'fat'
  | 'meat'
  | 'fish'
  | 'egg'
  | 'nut'
  | 'spice'
  | 'sweetener'
  | 'beverage'
  | 'other'

/**
 * Dry lentils and cooked dal are different foods, not one food in two moods.
 * 343 kcal/100 g is true of the bag and three times wrong about the bowl, and
 * collapsing the two is what makes a barcode database useless for cooking.
 */
export type PreparationState = 'dry' | 'raw' | 'cooked' | 'as-purchased'

/** Nutrients that every source publishes, so a row must carry them. */
export interface CoreNutrients {
  kcal: number
  protein_g: number
  carb_g: number
  fat_g: number
}

/** Nutrients a source may simply not have measured. `null` means NOT KNOWN. */
export interface OptionalNutrients {
  /** Of which sugars. */
  sugar_g: number | null
  /** Of which saturates. */
  sat_fat_g: number | null
  fibre_g: number | null
  sodium_mg: number | null
  calcium_mg: number | null
  iron_mg: number | null
  potassium_mg: number | null
  vitamin_c_mg: number | null
}

export type Nutrients = CoreNutrients & OptionalNutrients

export type NutrientKey = keyof Nutrients

/** A household measure, with what it actually weighs. */
export interface Serving {
  label: string
  grams: number
}

export interface Provenance {
  source: NutritionSource
  confidence: Confidence
  /** Why this figure and not another. Shown to the user, so write it for them. */
  sourceNote?: string
}

export interface Ingredient extends Provenance {
  id: string
  name: string
  /**
   * Every other name this food goes by — `dahi` for curd, `chana` and
   * `garbanzo` for chickpea, `baingan` and `eggplant` for brinjal. Search
   * folds these into the same document as the name, which is the only reason a
   * query in one language finds a row named in another.
   */
  aliases: string[]
  group: FoodGroup
  state: PreparationState
  /** Per 100 g of this food in this state. */
  per100g: Nutrients
  servings: Serving[]
  /** Search tie-break: how commonly this is looked up, 0 to 100. */
  prominence: number
}

export interface RecipeItem {
  ingredientId: string
  /** As it goes into the pot, in the ingredient's own state (dry dal is dry). */
  grams: number
  note?: string
}

export interface Recipe extends Provenance {
  id: string
  name: string
  aliases: string[]
  region?: string
  summary?: string
  method?: string
  items: RecipeItem[]
  /**
   * The cooked weight of the whole batch, and the denominator for every
   * per-100 g figure the dish reports.
   *
   * It is NOT the sum of the item weights and must not be derived from them:
   * dal takes up three times its dry weight in water, a sabzi loses a third of
   * its to steam. Nutrients come from the items; the yield is what turns them
   * into per-100 g-as-eaten. Get it wrong and the dish's energy density is
   * wrong by exactly that factor.
   */
  yieldG: number
  servings: Serving[]
  prominence: number
}

/** A recipe's nutrition, resolved. See `lib/food/compute.ts`. */
export interface RecipeNutrition {
  /** Nutrients for the whole batch. `null` where any item lacks the value. */
  batch: Nutrients
  /** Per 100 g as eaten: `batch` divided by `yieldG`. */
  per100g: Nutrients
  /**
   * For each nutrient that came out null, which ingredients had no value.
   * This is what lets the panel say "not known — 2 of 9 ingredients have no
   * figure" instead of a bare dash the user cannot act on.
   */
  missing: Partial<Record<NutrientKey, string[]>>
  /** Every item, with its own contribution. This is the audit trail. */
  lines: RecipeLine[]
  /** Total weight going in, for comparison against the yield. */
  inputG: number
  /** The weakest confidence among the ingredients — the dish's real ceiling. */
  weakestConfidence: Confidence
}

export interface RecipeLine {
  ingredient: Ingredient
  grams: number
  note?: string
  /** This item's share of the batch. */
  contribution: Nutrients
}

/** Either kind of public food, as search returns it. */
export type FoodKind = 'ingredient' | 'recipe'

export interface SearchHit {
  kind: FoodKind
  id: string
  name: string
  aliases: string[]
  group: FoodGroup | 'dish'
  /** 0 to 1. Exact name is 1; the floor for a returned hit is 0.30. */
  score: number
  kcalPer100g: number
  proteinPer100g: number
  serving: Serving | null
  source: NutritionSource
  confidence: Confidence
}

/**
 * What a search actually produced, including the ways it can fail.
 *
 * `degraded` exists because an empty list and an unreachable database look
 * identical to a user, and telling them "no results for dal" when the truth is
 * "we could not ask" is the single most misleading thing this page could do.
 */
export interface SearchResult {
  query: string
  hits: SearchHit[]
  /** Set when the hits came from the built-in set because the database was unreachable. */
  degraded: 'no-database' | 'unreachable' | null
}
