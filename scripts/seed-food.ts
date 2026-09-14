/**
 * Push `lib/food/data/*` into Postgres.
 *
 *   npx tsx scripts/seed-food.ts
 *
 * ---------------------------------------------------------------------------
 * THIS RUNS AS THE SERVICE ROLE, AND THAT IS THE POINT.
 *
 * `food_ingredient`, `food_recipe`, `food_recipe_item` and `food_serving` are
 * granted SELECT and nothing else to `anon` and `authenticated`, and they carry
 * no insert/update/delete policy at all. There is therefore no path by which a
 * browser can write a nutrition number — not a signed-in one, not the app's own
 * publishable key. The only writer is this script, with a key that never leaves
 * a shell.
 *
 * A public database anybody can write is a public database anybody can poison,
 * and a poisoned calorie figure is not a defaced wiki page: somebody eats
 * against it.
 * ---------------------------------------------------------------------------
 *
 * It is idempotent — upsert by primary key — so it is safe to re-run after
 * editing a value. Servings and recipe items are deleted and rewritten per
 * row rather than diffed, because a removed serving has to actually disappear.
 */

import { createClient } from '@supabase/supabase-js'
import { INGREDIENTS } from '../lib/food/data/ingredients'
import { RECIPES } from '../lib/food/data/recipes'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error(
    'Need SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in the environment.',
  )
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

function fail(what: string, error: { message: string } | null): void {
  if (!error) return
  console.error(`${what}: ${error.message}`)
  process.exit(1)
}

async function main(): Promise<void> {
  const ingredientRows = INGREDIENTS.map((i) => ({
    id: i.id,
    name: i.name,
    aliases: i.aliases,
    food_group: i.group,
    state: i.state,
    kcal: i.per100g.kcal,
    protein_g: i.per100g.protein_g,
    carb_g: i.per100g.carb_g,
    fat_g: i.per100g.fat_g,
    sugar_g: i.per100g.sugar_g,
    sat_fat_g: i.per100g.sat_fat_g,
    fibre_g: i.per100g.fibre_g,
    sodium_mg: i.per100g.sodium_mg,
    calcium_mg: i.per100g.calcium_mg,
    iron_mg: i.per100g.iron_mg,
    potassium_mg: i.per100g.potassium_mg,
    vitamin_c_mg: i.per100g.vitamin_c_mg,
    source: i.source,
    confidence: i.confidence,
    source_note: i.sourceNote ?? null,
    prominence: i.prominence,
  }))

  const { error: ingredientError } = await db
    .from('food_ingredient')
    .upsert(ingredientRows, { onConflict: 'id' })
  fail('food_ingredient upsert', ingredientError)
  console.log(`food_ingredient: ${ingredientRows.length} rows`)

  const recipeRows = RECIPES.map((r) => ({
    id: r.id,
    name: r.name,
    aliases: r.aliases,
    region: r.region ?? null,
    summary: r.summary ?? null,
    method: r.method ?? null,
    yield_g: r.yieldG,
    source: r.source,
    confidence: r.confidence,
    source_note: r.sourceNote ?? null,
    prominence: r.prominence,
  }))

  const { error: recipeError } = await db.from('food_recipe').upsert(recipeRows, { onConflict: 'id' })
  fail('food_recipe upsert', recipeError)
  console.log(`food_recipe: ${recipeRows.length} rows`)

  // Items are keyed (recipe_id, ingredient_id), so an upsert would leave an
  // item behind that has been removed from the recipe. Rewrite instead.
  const { error: itemWipe } = await db
    .from('food_recipe_item')
    .delete()
    .in('recipe_id', RECIPES.map((r) => r.id))
  fail('food_recipe_item delete', itemWipe)

  const itemRows = RECIPES.flatMap((r) =>
    r.items.map((item, index) => ({
      recipe_id: r.id,
      ingredient_id: item.ingredientId,
      grams: item.grams,
      note: item.note ?? null,
      sort_order: index,
    })),
  )
  const { error: itemError } = await db.from('food_recipe_item').insert(itemRows)
  fail('food_recipe_item insert', itemError)
  console.log(`food_recipe_item: ${itemRows.length} rows`)

  // `food_serving` has a generated identity key, so the same argument applies
  // with more force: there is no natural key to upsert on.
  const { error: servingWipe } = await db.from('food_serving').delete().gt('id', 0)
  fail('food_serving delete', servingWipe)

  const servingRows = [
    ...INGREDIENTS.flatMap((i) =>
      i.servings.map((s, index) => ({
        ingredient_id: i.id,
        recipe_id: null,
        label: s.label,
        grams: s.grams,
        sort_order: index,
      })),
    ),
    ...RECIPES.flatMap((r) =>
      r.servings.map((s, index) => ({
        ingredient_id: null,
        recipe_id: r.id,
        label: s.label,
        grams: s.grams,
        sort_order: index,
      })),
    ),
  ]
  const { error: servingError } = await db.from('food_serving').insert(servingRows)
  fail('food_serving insert', servingError)
  console.log(`food_serving: ${servingRows.length} rows`)
}

void main()
