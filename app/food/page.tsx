import type { Metadata } from 'next'
import Link from 'next/link'
import Panel from '@/components/ui/Panel'
import EmptyState from '@/components/ui/EmptyState'
import { INGREDIENTS, RECIPES } from '@/lib/food/reference'
import { MIN_QUERY_LENGTH, browseFoods, searchFoods } from '@/lib/food/search'
import ResultList from './_components/ResultList'
import SearchForm from './_components/SearchForm'

export const metadata: Metadata = {
  title: 'Food database | Unyfide',
  description:
    'Search Indian foods and see the full nutrition panel, not just calories — with where every number came from. Dishes are computed from their recipe, so you can see why dal is what it is.',
}

/**
 * The public food database.
 *
 * ---------------------------------------------------------------------------
 * PUBLIC, AND SERVER-RENDERED, ON PURPOSE
 *
 * No login: this page is not in `isProtectedPath` and holds nobody's data. It
 * is also a plain server component with a `<form method="get">`, so the `h1`
 * and the results are in the raw HTML — the route sweep in
 * `tests/e2e/routes.spec.ts` asserts exactly that for every route with
 * JavaScript off, and the service worker can cache `/food` like any other
 * page.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS WHEN THE APP ALREADY HAS A FOOD LOOKUP
 *
 * `app/diet/api/foods/route.ts` proxies Open Food Facts, which is a BARCODE
 * database. Probed directly: `dal` returns a bag of dry lentils and a namkeen
 * snack; `sambar` returns sambar POWDER; `idli` returns idli RAVA, the flour.
 * A large share of its rows carry null nutrition. It is right for a biscuit
 * packet and useless for a bowl of dal.
 *
 * So this is the other half: ingredients with per-100 g nutrition and a
 * source, recipes as lists of quantities, and dishes COMPUTED from their
 * recipe at read time. That makes a number auditable — you can see why dal is
 * 130 kcal a katori and correct the recipe instead of distrusting the app.
 * ---------------------------------------------------------------------------
 */

const EXAMPLES = ['dal', 'idli', 'sambar', 'paneer', 'poha', 'rajma', 'curd rice', 'biryani']

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const raw = (await searchParams).q
  const query = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 80).trim() ?? ''
  const result = query.length >= MIN_QUERY_LENGTH ? await searchFoods(query) : null
  const popular = browseFoods(8)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">Food</p>
        <h1>Food database</h1>
        <p className="max-w-2xl text-sm text-[var(--text-muted)]">
          {INGREDIENTS.length} ingredients and {RECIPES.length} dishes, with the whole nutrition
          panel rather than a calorie count, and a source and a confidence on every number. No
          account needed.
        </p>
        <SearchForm query={query} />
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)]">
          <span className="text-[var(--text-faint)]">Try</span>
          {EXAMPLES.map((example) => (
            <Link
              key={example}
              href={`/food?q=${encodeURIComponent(example)}`}
              className="underline decoration-[var(--panel-border)] underline-offset-2 hover:decoration-[var(--accent-line)]"
            >
              {example}
            </Link>
          ))}
        </p>
      </header>

      {/*
        The degraded notice, and the reason it is not optional.

        Search needs the database. This app is a PWA whose service worker
        serves pages offline, so "we could not ask" is a normal state — and it
        looks EXACTLY like "no such food" if the page just renders an empty
        list. Saying so is the difference between a limitation and a lie.
      */}
      {result?.degraded ? (
        <Panel tier="panel" className="flex flex-col gap-1 p-4">
          <p className="text-sm font-medium text-[var(--warning)]">
            {result.degraded === 'no-database'
              ? 'No database is configured here.'
              : 'The food database is not reachable right now.'}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            These results come from the set built into the app, so spelling has to be close and
            newer foods are missing. This is not “no results” — it is a shorter list than usual.
          </p>
        </Panel>
      ) : null}

      {result ? (
        result.hits.length > 0 ? (
          <ResultList
            hits={result.hits}
            titleId="food-results"
            title={`${result.hits.length} ${result.hits.length === 1 ? 'result' : 'results'} for “${result.query}”`}
          />
        ) : (
          <EmptyState
            title={`Nothing here matches “${result.query}”`}
            description="Dishes are searchable by their common names and regional spellings, and ingredients in either language — curd or dahi, chana or chickpea. If it is a packaged product, the barcode lookup inside Diet is the better tool for it."
            action={
              <Link
                href="/food"
                className="btn btn-quiet min-h-11 items-center justify-center inline-flex"
              >
                Browse what is here
              </Link>
            }
          />
        )
      ) : (
        <ResultList hits={popular} titleId="food-popular" title="Commonly looked up" />
      )}

      <section className="flex flex-col gap-3" aria-labelledby="food-how">
        <h2 id="food-how" className="eyebrow">
          How this works, and what it will not do
        </h2>
        <Panel tier="panel" className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--text)]">
              A dish is a recipe, not a calorie number
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Nothing here stores “dal tadka = 130 kcal”. It stores 60 g of toor dal, 10 g of ghee
              and a 400 g cooked batch, and does the arithmetic when you open the page. That is why
              you can see why a number is what it is — and why more oil is a different recipe rather
              than an argument about whose dal is correct.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--text)]">
              Unknown and zero are different facts
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Ghee contains no fibre; that is a measurement. Nobody has published the potassium in
              kasuri methi; that is an absence. The first shows as 0, the second as “not known”, and
              a dish whose fibre depends on an ingredient with no figure reports not known rather
              than a total that is quietly too low.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--text)]">
              These are not <em>the</em> recipes
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Every dish here is cooked forty ways, and the oil is where most of the variation is. A
              restaurant paneer butter masala is not the same food as a home one. Each dish says how
              confident its figures are and why, and a recipe can never claim high confidence.
            </p>
          </div>
        </Panel>
      </section>
    </div>
  )
}
