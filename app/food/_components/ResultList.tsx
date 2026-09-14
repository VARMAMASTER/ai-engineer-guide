import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import { confidenceLabel } from '@/lib/food/nutrients'
import type { SearchHit } from '@/lib/food/types'

/**
 * A list of search hits.
 *
 * Each row carries the energy per 100 g AND per household serving, because
 * "86 kcal" next to a dal is meaningless on its own and "130 kcal per katori"
 * is the number somebody came for. A grams-only result list is the reason
 * nutrition databases get abandoned.
 *
 * The confidence tag is on the row rather than only on the detail page: a
 * result list that hides which figures are guesses is a result list that
 * launders them.
 */

const GROUP_LABEL: Record<string, string> = {
  dish: 'Dish',
  pulse: 'Dal / pulse',
  grain: 'Grain',
  flour: 'Flour',
  vegetable: 'Vegetable',
  fruit: 'Fruit',
  dairy: 'Dairy',
  fat: 'Fat / oil',
  meat: 'Meat',
  fish: 'Fish',
  egg: 'Egg',
  nut: 'Nut / seed',
  spice: 'Spice',
  sweetener: 'Sweetener',
  beverage: 'Drink',
  other: 'Other',
}

export interface ResultListProps {
  hits: SearchHit[]
  /** Heading for the list, rendered as an h2. */
  title: string
  titleId: string
}

export default function ResultList({ hits, title, titleId }: ResultListProps) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={titleId}>
      <h2 id={titleId} className="eyebrow">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {hits.map((hit) => {
          const perServing =
            hit.serving == null ? null : (hit.kcalPer100g * hit.serving.grams) / 100
          return (
            <li key={`${hit.kind}:${hit.id}`}>
              <Card href={`/food/${hit.id}`} className="flex min-h-11 flex-col gap-1.5 p-4">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--text)]">{hit.name}</span>
                  <Tag variant={hit.kind === 'recipe' ? 'accent' : 'outline'}>
                    {GROUP_LABEL[hit.group] ?? hit.group}
                  </Tag>
                  {hit.confidence === 'low' ? (
                    <Tag variant="outline" className="text-[var(--warning)]">
                      {confidenceLabel(hit.confidence)}
                    </Tag>
                  ) : null}
                </span>
                <span className="text-sm text-[var(--text-muted)] tabular-nums">
                  {perServing != null && hit.serving != null ? (
                    <>
                      <strong className="font-medium text-[var(--text)]">
                        {perServing.toFixed(0)} kcal
                      </strong>{' '}
                      per {hit.serving.label} ({hit.serving.grams} g) ·{' '}
                    </>
                  ) : null}
                  {hit.kcalPer100g.toFixed(0)} kcal / 100 g · {hit.proteinPer100g.toFixed(1)} g
                  protein / 100 g
                </span>
                {hit.aliases.length > 0 ? (
                  <span className="text-xs text-[var(--text-faint)]">
                    also {hit.aliases.slice(0, 4).join(', ')}
                  </span>
                ) : null}
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
