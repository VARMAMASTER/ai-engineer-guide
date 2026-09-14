import Link from 'next/link'
import Panel from '@/components/ui/Panel'
import { yieldRatio } from '@/lib/food/compute'
import type { Recipe, RecipeNutrition } from '@/lib/food/types'

/**
 * The recipe, line by line, with each ingredient's contribution.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE FEATURE, NOT A DETAIL
 *
 * Every other nutrition app hands you "Dal tadka — 130 kcal" and asks you to
 * believe it. Nobody does, because nobody's dal is that dal. This table shows
 * that 130 is 60 g of toor dal plus 10 g of ghee plus a handful of aromatics,
 * divided by a 400 g batch — so a user who uses two teaspoons of ghee can see
 * exactly which line to double, instead of deciding the whole app is wrong.
 *
 * It also makes the total checkable by hand. `tests/unit/food/compute.test.ts`
 * asserts the column sums to the stated batch figure, because a breakdown that
 * does not add up is worse than no breakdown: it looks like evidence.
 * ---------------------------------------------------------------------------
 */

export interface RecipeBreakdownProps {
  recipe: Recipe
  nutrition: RecipeNutrition
}

export default function RecipeBreakdown({ recipe, nutrition }: RecipeBreakdownProps) {
  const ratio = yieldRatio(recipe, nutrition)
  const lines = [...nutrition.lines].sort((a, b) => b.contribution.kcal - a.contribution.kcal)

  return (
    <Panel tier="panel" className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="eyebrow" id="recipe">
          What it is made of
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Nothing about this dish is stored as a calorie number. It is this list, summed, divided by
          the {recipe.yieldG} g the batch weighs cooked — so if your version is different, the line
          to change is below rather than the total.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[22rem] border-collapse text-sm">
          <caption className="sr-only">
            Every ingredient in {recipe.name}, its weight going in, and the energy and protein it
            contributes to the batch.
          </caption>
          <thead>
            <tr className="text-xs text-[var(--text-faint)]">
              <th scope="col" className="pb-2 text-left font-normal">
                Ingredient
              </th>
              <th scope="col" className="pb-2 pl-4 text-right font-normal whitespace-nowrap">
                In
              </th>
              <th scope="col" className="pb-2 pl-4 text-right font-normal whitespace-nowrap">
                kcal
              </th>
              <th scope="col" className="pb-2 pl-4 text-right font-normal whitespace-nowrap">
                Protein
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.ingredient.id} className="border-t border-[var(--panel-border)]">
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  <Link
                    href={`/food/${line.ingredient.id}`}
                    className="text-[var(--text)] underline decoration-[var(--panel-border)] underline-offset-2 hover:decoration-[var(--accent-line)]"
                  >
                    {line.ingredient.name}
                  </Link>
                  {line.note ? (
                    <span className="block text-xs text-[var(--text-faint)]">{line.note}</span>
                  ) : null}
                </th>
                <td className="py-2 pl-4 text-right tabular-nums whitespace-nowrap text-[var(--text-muted)]">
                  {line.grams} g
                </td>
                <td className="py-2 pl-4 text-right tabular-nums whitespace-nowrap text-[var(--text)]">
                  {line.contribution.kcal.toFixed(0)}
                </td>
                <td className="py-2 pl-4 text-right tabular-nums whitespace-nowrap text-[var(--text-muted)]">
                  {line.contribution.protein_g.toFixed(1)} g
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--panel-border)] font-medium">
              <th scope="row" className="py-2 pr-4 text-left">
                Whole batch
              </th>
              <td className="py-2 pl-4 text-right tabular-nums whitespace-nowrap text-[var(--text-muted)]">
                {nutrition.inputG.toFixed(0)} g in
              </td>
              <td className="py-2 pl-4 text-right tabular-nums whitespace-nowrap text-[var(--text)]">
                {nutrition.batch.kcal.toFixed(0)}
              </td>
              <td className="py-2 pl-4 text-right tabular-nums whitespace-nowrap text-[var(--text)]">
                {nutrition.batch.protein_g.toFixed(1)} g
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Panel tier="solid" className="flex flex-col gap-1 p-3">
        <p className="text-sm text-[var(--text-muted)]">
          <strong className="font-medium text-[var(--text)]">
            {nutrition.inputG.toFixed(0)} g in, {recipe.yieldG} g out
          </strong>{' '}
          — a ratio of {ratio.toFixed(2)}.{' '}
          {ratio < 0.98
            ? 'The batch lost water to steam, which is normal for anything simmered or fried.'
            : 'The batch weighs about what went into it.'}
        </p>
        <p className="text-xs text-[var(--text-faint)]">
          The cooked weight is the denominator for every per-100 g figure here. It is not the sum of
          the ingredients: dal takes up water it was not weighed with, a dry sabzi loses it. Get that
          number wrong and the dish’s energy density is wrong by exactly that factor.
        </p>
      </Panel>

      {recipe.method ? (
        <p className="text-sm text-[var(--text-muted)]">
          <span className="eyebrow block">Method</span>
          {recipe.method}
        </p>
      ) : null}
    </Panel>
  )
}
