import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Panel from '@/components/ui/Panel'
import Stat from '@/components/ui/Stat'
import Tag from '@/components/ui/Tag'
import { ingredientServing, servingNutrition } from '@/lib/food/compute'
import { allFoodIds, getIngredient, getRecipe, nutritionFor } from '@/lib/food/reference'
import { NOT_KNOWN, NUTRIENTS, formatNutrient, type NutrientSpec } from '@/lib/food/nutrients'
import NutritionTable from '../_components/NutritionTable'
import Provenance from '../_components/Provenance'
import RecipeBreakdown from '../_components/RecipeBreakdown'

/**
 * One food: a dish or an ingredient.
 *
 * ---------------------------------------------------------------------------
 * PRERENDERED FROM THE BUILT-IN SET, NOT FETCHED
 *
 * `generateStaticParams` returns every id in `lib/food/data`, so all 186 pages
 * are in the build output: they answer with JavaScript off, they survive the
 * database being down, and the service worker caches them like any other page.
 * Postgres is the search index and the growth path; the authored data is what
 * a detail page renders.
 *
 * The consequence to be honest about: a food added to the database but not to
 * `lib/food/data` has no page here yet. That is the trade for a database-free
 * detail page, and it is the right way round — the page people link to and
 * share is the one that must never 500.
 * ---------------------------------------------------------------------------
 */

export function generateStaticParams() {
  return allFoodIds().map((id) => ({ id }))
}

export async function generateMetadata({
  params,
}: PageProps<'/food/[id]'>): Promise<Metadata> {
  const { id } = await params
  const recipe = getRecipe(id)
  const ingredient = getIngredient(id)
  const name = recipe?.name ?? ingredient?.name
  if (!name) return {}

  const kcal = recipe
    ? nutritionFor(recipe).per100g.kcal
    : (ingredient?.per100g.kcal ?? 0)

  return {
    title: `${name} | Food | Unyfide`,
    description: `${name}: ${kcal.toFixed(0)} kcal per 100 g, with the full nutrition panel, ${
      recipe ? 'the recipe it is computed from, ' : ''
    }and where every number came from.`,
  }
}

const STATE_LABEL: Record<string, string> = {
  dry: 'dry / uncooked',
  raw: 'raw',
  cooked: 'cooked',
  'as-purchased': 'as bought',
}

/** Two headline numbers plus the one that is most often unknown. */
function Headline({
  kcal,
  protein,
  fibre,
  unit,
}: {
  kcal: number
  protein: number
  fibre: number | null
  unit: string
}) {
  const fibreSpec = NUTRIENTS.find((n) => n.key === 'fibre_g') as NutrientSpec
  const formattedFibre = formatNutrient(fibre, fibreSpec)
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Panel tier="panel" className="p-4">
        <Stat label={`Energy ${unit}`} value={kcal.toFixed(0)} unit="kcal" />
      </Panel>
      <Panel tier="panel" className="p-4">
        <Stat label={`Protein ${unit}`} value={protein.toFixed(1)} unit="g" />
      </Panel>
      <Panel tier="panel" className="p-4">
        <Stat
          label={`Fibre ${unit}`}
          value={
            formattedFibre.known ? (
              (fibre ?? 0).toFixed(1)
            ) : (
              <span className="text-base font-normal italic text-[var(--text-faint)]">
                {NOT_KNOWN}
              </span>
            )
          }
          unit={formattedFibre.known ? 'g' : undefined}
        />
      </Panel>
    </div>
  )
}

export default async function FoodDetailPage({ params }: PageProps<'/food/[id]'>) {
  const { id } = await params
  const recipe = getRecipe(id)
  const ingredient = recipe ? undefined : getIngredient(id)
  if (!recipe && !ingredient) notFound()

  if (recipe) {
    const nutrition = nutritionFor(recipe)
    const defaultServing = recipe.servings[0]
    const perServing = defaultServing ? servingNutrition(nutrition, defaultServing) : null

    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="eyebrow">
            <Link href="/food" className="hover:text-[var(--text)]">
              Food
            </Link>{' '}
            · Dish
          </p>
          <h1>{recipe.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Tag variant="accent">Computed from its recipe</Tag>
            {recipe.region ? <Tag variant="outline">{recipe.region}</Tag> : null}
          </div>
          {recipe.summary ? (
            <p className="max-w-2xl text-sm text-[var(--text-muted)]">{recipe.summary}</p>
          ) : null}
          {recipe.aliases.length > 0 ? (
            <p className="text-sm text-[var(--text-faint)]">
              Also called {recipe.aliases.join(', ')}.
            </p>
          ) : null}
        </header>

        {perServing && defaultServing ? (
          <Headline
            kcal={perServing.kcal}
            protein={perServing.protein_g}
            fibre={perServing.fibre_g}
            unit={`per ${defaultServing.label}`}
          />
        ) : null}

        <NutritionTable
          per100g={nutrition.per100g}
          servings={recipe.servings}
          missing={nutrition.missing}
          caption={`Per 100 g as eaten, and per serving. The batch is ${recipe.yieldG} g cooked, and every figure below is that batch divided by it.`}
        />

        <RecipeBreakdown recipe={recipe} nutrition={nutrition} />

        <Provenance
          source={recipe.source}
          confidence={recipe.confidence}
          note={recipe.sourceNote}
          weakestIngredientConfidence={nutrition.weakestConfidence}
        />
      </div>
    )
  }

  const food = ingredient!
  const defaultServing = food.servings[0]
  const perServing = defaultServing ? ingredientServing(food, defaultServing) : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="eyebrow">
          <Link href="/food" className="hover:text-[var(--text)]">
            Food
          </Link>{' '}
          · Ingredient
        </p>
        <h1>{food.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Tag variant="outline">{STATE_LABEL[food.state] ?? food.state}</Tag>
        </div>
        {/*
          The state is on the page as a tag AND spelled out here, because it is
          the single most misread thing in a food table: 343 kcal is true of a
          bag of dry dal and three times wrong about a bowl of cooked dal.
        */}
        <p className="max-w-2xl text-sm text-[var(--text-muted)]">
          Figures are for this food {STATE_LABEL[food.state] ?? food.state}. Cooking changes the
          weight, not the nutrients — for a cooked dish, search the dish instead.
        </p>
        {food.aliases.length > 0 ? (
          <p className="text-sm text-[var(--text-faint)]">Also called {food.aliases.join(', ')}.</p>
        ) : null}
      </header>

      {perServing && defaultServing ? (
        <Headline
          kcal={perServing.kcal}
          protein={perServing.protein_g}
          fibre={perServing.fibre_g}
          unit={`per ${defaultServing.label}`}
        />
      ) : null}

      <NutritionTable
        per100g={food.per100g}
        servings={food.servings}
        caption="Per 100 g, and per the household measures people actually use."
      />

      <Provenance source={food.source} confidence={food.confidence} note={food.sourceNote} />
    </div>
  )
}
