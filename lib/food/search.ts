import { DB_CONFIGURED } from '@/lib/db/env'
import { createClient } from '@/lib/db/server'
import { popularFoods, searchReference } from './reference'
import type { FoodGroup, SearchHit, SearchResult } from './types'

/**
 * Food search, server side.
 *
 * ---------------------------------------------------------------------------
 * WHY POSTGRES AND NOT `ilike '%q%'`, AND WHY NOT JUST THE BUILT-IN SET
 *
 * The built-in reference set is 147 ingredients and 39 recipes, so an in-memory
 * scan would answer it instantly today. It is the wrong place to stop for two
 * reasons: the table is meant to grow (and `ilike '%q%'` over a growing table
 * is a sequential scan that cannot rank and cannot survive a typo), and a
 * misspelling has to work on the first try. "panner" and "sambhar" are not
 * edge cases — they are how people type.
 *
 * So the real search is the `food_search` SQL function: trigram word
 * similarity at a lowered threshold for misspellings, an unstemmed `simple`
 * tsquery with `:*` for half-typed words, exact and prefix matching on the
 * name, and every synonym folded into the same document so `dahi` finds curd.
 * See the migration for the full argument.
 *
 * ---------------------------------------------------------------------------
 * AND WHY THE FALLBACK IS NOT SILENT
 *
 * This app is a PWA whose service worker serves pages offline. Search needs
 * the database; offline it cannot have one. The failure mode to avoid is not
 * an error — it is an EMPTY LIST, because "no results for dal" and "we could
 * not ask" look identical on screen and only one of them is true. So a failed
 * RPC falls back to the built-in set AND sets `degraded`, which the page turns
 * into a visible note. Degrading quietly would be lying quietly.
 * ---------------------------------------------------------------------------
 */

/** Shorter than this is not a query, it is a keystroke. */
export const MIN_QUERY_LENGTH = 2
const DEFAULT_LIMIT = 24

interface SearchRow {
  kind: string
  id: string
  name: string
  aliases: string[] | null
  food_group: string
  score: number
  kcal_per_100g: number | string | null
  protein_per_100g: number | string | null
  serving_label: string | null
  serving_grams: number | string | null
  source: string
  confidence: string
}

/** Postgres `numeric` arrives over PostgREST as a string, so never trust the type. */
function num(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function toHit(row: SearchRow): SearchHit {
  const grams = row.serving_grams == null ? null : num(row.serving_grams)
  return {
    kind: row.kind === 'recipe' ? 'recipe' : 'ingredient',
    id: row.id,
    name: row.name,
    aliases: row.aliases ?? [],
    group: row.food_group as FoodGroup | 'dish',
    score: num(row.score),
    kcalPer100g: num(row.kcal_per_100g),
    proteinPer100g: num(row.protein_per_100g),
    serving: row.serving_label != null && grams != null ? { label: row.serving_label, grams } : null,
    source: row.source as SearchHit['source'],
    confidence: row.confidence as SearchHit['confidence'],
  }
}

export async function searchFoods(query: string, limit = DEFAULT_LIMIT): Promise<SearchResult> {
  const q = query.trim()
  if (q.length < MIN_QUERY_LENGTH) return { query: q, hits: [], degraded: null }

  // No backend configured at all — a fork, or a preview with no env. The
  // learning half of this app has always had to work in that state (spec
  // section 3) and so does this page.
  if (!DB_CONFIGURED) {
    return { query: q, hits: searchReference(q, limit), degraded: 'no-database' }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('food_search', { q, lim: limit })
    if (error) {
      return { query: q, hits: searchReference(q, limit), degraded: 'unreachable' }
    }
    return { query: q, hits: ((data ?? []) as SearchRow[]).map(toHit), degraded: null }
  } catch {
    // A network failure or an aborted request. Not "no such food".
    return { query: q, hits: searchReference(q, limit), degraded: 'unreachable' }
  }
}

/** What `/food` shows before anybody types. Built-in, so it prerenders. */
export function browseFoods(count = 8): SearchHit[] {
  return popularFoods(count)
}
