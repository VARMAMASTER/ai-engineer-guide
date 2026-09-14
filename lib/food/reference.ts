import { computeRecipe } from './compute'
import { INGREDIENTS } from './data/ingredients'
import { RECIPES } from './data/recipes'
import type { Ingredient, Recipe, RecipeNutrition, SearchHit } from './types'

/**
 * The built-in reference set, indexed — and the offline search fallback.
 *
 * Everything here is pure, synchronous and needs no database, which is what
 * lets `/food/[id]` prerender and stay readable with JavaScript off and the
 * network gone. Postgres is the search index and the growth path; this module
 * is the authored content.
 */

const INGREDIENT_BY_ID = new Map<string, Ingredient>(INGREDIENTS.map((i) => [i.id, i]))
const RECIPE_BY_ID = new Map<string, Recipe>(RECIPES.map((r) => [r.id, r]))

export { INGREDIENTS, RECIPES }

export function getIngredient(id: string): Ingredient | undefined {
  return INGREDIENT_BY_ID.get(id)
}

export function getRecipe(id: string): Recipe | undefined {
  return RECIPE_BY_ID.get(id)
}

/** Every id `/food/[id]` can serve, for `generateStaticParams`. */
export function allFoodIds(): string[] {
  return [...RECIPES.map((r) => r.id), ...INGREDIENTS.map((i) => i.id)]
}

/** A recipe's nutrition, computed against the built-in ingredient set. */
export function nutritionFor(recipe: Recipe): RecipeNutrition {
  return computeRecipe(recipe, getIngredient)
}

/**
 * ---------------------------------------------------------------------------
 * THE OFFLINE FALLBACK, and why it scores rather than filters.
 *
 * Postgres does the real search: trigram indexes, an unstemmed full-text
 * prefix query, and a similarity threshold that survives "panner". None of
 * that exists in JavaScript, and reimplementing it would be a second ranking
 * function to keep in step with the first.
 *
 * So this is deliberately a SMALLER promise, and the page says so: substring
 * and prefix matching over the same name-plus-aliases document, scored in
 * roughly the same bands as the SQL so the ordering does not jump when the
 * database comes back. It will not fix a typo. What it must never do is return
 * nothing and let that read as "no such food" — `SearchResult.degraded` is
 * what carries that distinction to the page.
 * ---------------------------------------------------------------------------
 */

interface Indexed {
  hit: () => SearchHit
  document: string
  name: string
  prominence: number
  kind: 'ingredient' | 'recipe'
}

let cachedIndex: Indexed[] | null = null

function buildIndex(): Indexed[] {
  const rows: Indexed[] = []

  for (const recipe of RECIPES) {
    // Computed once, lazily, and reused: a recipe's per-100 g figures are what
    // a search result shows, and recomputing 39 recipes per keystroke would be
    // work for nothing.
    let nutrition: RecipeNutrition | null = null
    rows.push({
      kind: 'recipe',
      name: recipe.name,
      prominence: recipe.prominence,
      document: [recipe.name, ...recipe.aliases].join(' ').toLowerCase(),
      hit: () => {
        nutrition ??= nutritionFor(recipe)
        return {
          kind: 'recipe',
          id: recipe.id,
          name: recipe.name,
          aliases: recipe.aliases,
          group: 'dish',
          score: 0,
          kcalPer100g: nutrition.per100g.kcal,
          proteinPer100g: nutrition.per100g.protein_g,
          serving: recipe.servings[0] ?? null,
          source: recipe.source,
          confidence: recipe.confidence,
        }
      },
    })
  }

  for (const ingredient of INGREDIENTS) {
    rows.push({
      kind: 'ingredient',
      name: ingredient.name,
      prominence: ingredient.prominence,
      document: [ingredient.name, ...ingredient.aliases].join(' ').toLowerCase(),
      hit: () => ({
        kind: 'ingredient',
        id: ingredient.id,
        name: ingredient.name,
        aliases: ingredient.aliases,
        group: ingredient.group,
        score: 0,
        kcalPer100g: ingredient.per100g.kcal,
        proteinPer100g: ingredient.per100g.protein_g,
        serving: ingredient.servings[0] ?? null,
        source: ingredient.source,
        confidence: ingredient.confidence,
      }),
    })
  }

  return rows
}

function scoreOf(row: Indexed, query: string): number {
  if (row.document === query) return 1
  if (row.name.toLowerCase().startsWith(query)) return 0.94
  // Word-start match anywhere in the document — "dal" finding "toor dal".
  const words = row.document.split(/[^a-z0-9]+/)
  if (words.some((word) => word.startsWith(query))) return 0.8
  if (row.document.includes(query)) return 0.55
  return 0
}

/** The same shape the SQL returns, so the page renders one code path either way. */
export function searchReference(query: string, limit = 24): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  cachedIndex ??= buildIndex()

  // Every word in a multi-word query has to land somewhere, which is what
  // makes "dal tadka" narrower than "dal" rather than wider.
  const terms = q.split(/[^a-z0-9]+/).filter(Boolean)
  if (terms.length === 0) return []

  const scored: { row: Indexed; score: number }[] = []
  for (const row of cachedIndex) {
    let worst = 1
    for (const term of terms) {
      const score = scoreOf(row, term)
      if (score === 0) {
        worst = 0
        break
      }
      worst = Math.min(worst, score)
    }
    if (worst >= 0.3) scored.push({ row, score: worst })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Recipes first on a tie: somebody searching "dal" wants the bowl.
    if (a.row.kind !== b.row.kind) return a.row.kind === 'recipe' ? -1 : 1
    if (b.row.prominence !== a.row.prominence) return b.row.prominence - a.row.prominence
    if (a.row.name.length !== b.row.name.length) return a.row.name.length - b.row.name.length
    return a.row.name.localeCompare(b.row.name)
  })

  return scored.slice(0, limit).map(({ row, score }) => ({ ...row.hit(), score }))
}

/**
 * A handful of dishes for the landing page, so `/food` with no query is a
 * useful page rather than an empty box. Ordered by prominence, which is a
 * fact about what people look up.
 */
export function popularFoods(count = 8): SearchHit[] {
  cachedIndex ??= buildIndex()
  return cachedIndex
    .filter((row) => row.kind === 'recipe')
    .sort((a, b) => b.prominence - a.prominence || a.name.localeCompare(b.name))
    .slice(0, count)
    .map((row) => ({ ...row.hit(), score: 1 }))
}
