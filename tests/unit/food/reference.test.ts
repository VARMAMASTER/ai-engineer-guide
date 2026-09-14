import { describe, expect, it } from 'vitest'
import { INGREDIENTS, RECIPES, getIngredient, nutritionFor, searchReference } from '@/lib/food/reference'
import { NUTRIENTS } from '@/lib/food/nutrients'

/**
 * Invariants over the authored reference data.
 *
 * These are not "does the code run" tests. They are the review pass that a
 * human cannot do reliably across 147 ingredients and 39 recipes: a wrong
 * digit in a macro, an ingredient id that no longer exists, a yield that
 * implies a dish of pure oil. Every one of these has caught something in a
 * hand-authored food table before.
 */

describe('the ingredient set', () => {
  it('is large enough to be useful and has unique ids', () => {
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(120)
    const ids = new Set(INGREDIENTS.map((i) => i.id))
    expect(ids.size).toBe(INGREDIENTS.length)
  })

  it('never claims high confidence for an estimate', () => {
    // The database enforces this with a check constraint; asserting it here
    // means the seed fails in CI rather than at `db push` time.
    const offenders = INGREDIENTS.filter((i) => i.source === 'estimate' && i.confidence === 'high')
    expect(offenders.map((i) => i.id)).toEqual([])
  })

  it('carries a note wherever confidence is low', () => {
    // A low-confidence figure with no explanation is indistinguishable from a
    // careless one. If it is weak, the page has to be able to say why.
    const unexplained = INGREDIENTS.filter((i) => i.confidence === 'low' && !i.sourceNote)
    expect(unexplained.map((i) => i.id)).toEqual([])
  })

  it('has macros that account for its stated energy', () => {
    /**
     * A bracket, not an equality, and the reason is real rather than
     * defensive. Carbohydrate is published "by difference", so it INCLUDES
     * fibre — and how much energy fibre contributes is exactly what the
     * published figures disagree about. USDA applies food-specific factors:
     * cinnamon is 80.6 g of carbohydrate of which 53.1 g is fibre, and its
     * energy is 247 kcal, which is neither 4 kcal/g across the carbohydrate
     * (349) nor fibre-free (137).
     *
     * So the test brackets it: energy must sit between fibre-contributes-
     * nothing and fibre-contributes-4, with slack. That still catches a
     * transposed digit, which is the failure this is here to find.
     */
    const bad: string[] = []
    for (const i of INGREDIENTS) {
      const { kcal, protein_g, carb_g, fat_g } = i.per100g
      const fibre = i.per100g.fibre_g ?? 0
      const fromProteinAndFat = protein_g * 4 + fat_g * 9
      const lower = fromProteinAndFat + Math.max(0, carb_g - fibre) * 4
      const upper = fromProteinAndFat + carb_g * 4
      if (kcal === 0 && upper === 0) continue
      const slack = Math.max(35, kcal * 0.15)
      if (kcal < lower - slack || kcal > upper + slack) {
        bad.push(`${i.id}: ${kcal} outside ${lower.toFixed(0)}-${upper.toFixed(0)}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('keeps every value inside the range the database will accept', () => {
    for (const i of INGREDIENTS) {
      expect(i.per100g.kcal, i.id).toBeLessThanOrEqual(950)
      expect(i.per100g.protein_g, i.id).toBeLessThanOrEqual(100)
      expect(i.per100g.carb_g, i.id).toBeLessThanOrEqual(100)
      expect(i.per100g.fat_g, i.id).toBeLessThanOrEqual(100)
      expect(i.per100g.sodium_mg ?? 0, i.id).toBeLessThanOrEqual(50000)
      expect(i.id, i.id).toMatch(/^[a-z0-9-]{2,64}$/)
      expect(i.servings.length, i.id).toBeGreaterThan(0)
      for (const serving of i.servings) expect(serving.grams, `${i.id} ${serving.label}`).toBeGreaterThan(0)
    }
  })

  it('distinguishes unknown from zero rather than defaulting to zero', () => {
    // The whole point of the model. If every optional nutrient were filled in,
    // this test would fail and it SHOULD — it would mean somebody had guessed.
    const unknowns = INGREDIENTS.flatMap((i) =>
      NUTRIENTS.filter((spec) => i.per100g[spec.key] === null).map((spec) => `${i.id}.${spec.key}`),
    )
    expect(unknowns.length).toBeGreaterThan(0)

    // And at least one row must be a real, measured zero, or "null means
    // unknown" would be an untested claim.
    const ghee = getIngredient('ghee')
    expect(ghee?.per100g.carb_g).toBe(0)
    expect(ghee?.per100g.fibre_g).toBe(0)
  })

  it('carries the alias spellings people actually type', () => {
    const doc = (id: string) => {
      const i = getIngredient(id)
      return [i?.name ?? '', ...(i?.aliases ?? [])].join(' ').toLowerCase()
    }
    expect(doc('curd')).toContain('dahi')
    expect(doc('curd')).toContain('yoghurt')
    expect(doc('kabuli-chana')).toContain('chickpea')
    expect(doc('kabuli-chana')).toContain('chole')
    expect(doc('brinjal')).toContain('baingan')
    expect(doc('brinjal')).toContain('eggplant')
    expect(doc('okra')).toContain('bhindi')
    expect(doc('coriander-leaves')).toContain('dhania')
  })
})

describe('the recipe set', () => {
  it('has enough dishes and unique ids', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(25)
    const ids = new Set(RECIPES.map((r) => r.id))
    expect(ids.size).toBe(RECIPES.length)
  })

  it('references only ingredients that exist', () => {
    const missing: string[] = []
    for (const recipe of RECIPES) {
      for (const item of recipe.items) {
        if (!getIngredient(item.ingredientId)) missing.push(`${recipe.id} -> ${item.ingredientId}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('is never more confident than a derived figure can be', () => {
    expect(RECIPES.filter((r) => r.confidence === 'high').map((r) => r.id)).toEqual([])
  })

  it('has a plausible yield against its input weight', () => {
    // A yield far below the input means a dish of concentrated oil; far above
    // means water that was never listed. Both are authoring mistakes, and both
    // move the dish's energy density by exactly that factor.
    const bad: string[] = []
    for (const recipe of RECIPES) {
      const nutrition = nutritionFor(recipe)
      const ratio = recipe.yieldG / nutrition.inputG
      if (ratio < 0.5 || ratio > 1.15) bad.push(`${recipe.id}: ${ratio.toFixed(2)}`)
    }
    expect(bad).toEqual([])
  })

  it('lands every dish in a believable energy band per 100 g', () => {
    const bad: string[] = []
    for (const recipe of RECIPES) {
      const { kcal } = nutritionFor(recipe).per100g
      // Rasam is thin broth at the bottom; a fried or coconut-heavy dish is at
      // the top. Nothing cooked and eaten by the bowl exceeds 400.
      if (kcal < 10 || kcal > 400) bad.push(`${recipe.id}: ${kcal.toFixed(0)} kcal/100g`)
    }
    expect(bad).toEqual([])
  })

  it('gives every dish at least one household serving', () => {
    for (const recipe of RECIPES) {
      expect(recipe.servings.length, recipe.id).toBeGreaterThan(0)
      for (const serving of recipe.servings) {
        expect(serving.grams, `${recipe.id} ${serving.label}`).toBeGreaterThan(0)
        expect(serving.label, recipe.id).not.toBe('')
      }
    }
  })
})

describe('the offline fallback search', () => {
  it('finds the dish, not the raw ingredient, for "dal"', () => {
    const hits = searchReference('dal')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]!.kind).toBe('recipe')
    expect(hits.some((h) => h.id === 'dal-tadka')).toBe(true)
  })

  it('answers the four searches the product was specified around', () => {
    for (const query of ['dal', 'idli', 'sambar', 'paneer']) {
      const hits = searchReference(query)
      expect(hits.length, query).toBeGreaterThan(0)
      expect(hits[0]!.kcalPer100g, query).toBeGreaterThan(0)
    }
  })

  it('resolves a synonym to the food it names', () => {
    expect(searchReference('dahi').some((h) => h.id === 'curd')).toBe(true)
    expect(searchReference('chickpea').some((h) => h.id === 'kabuli-chana')).toBe(true)
    expect(searchReference('eggplant').some((h) => h.id === 'brinjal')).toBe(true)
  })

  it('answers a half-typed word', () => {
    expect(searchReference('pan').some((h) => h.id === 'paneer')).toBe(true)
    expect(searchReference('idl').some((h) => h.id === 'idli')).toBe(true)
  })

  it('narrows rather than widens as a query gains words', () => {
    const broad = searchReference('dal')
    const narrow = searchReference('dal tadka')
    expect(narrow.length).toBeLessThan(broad.length)
    expect(narrow[0]!.id).toBe('dal-tadka')
  })

  it('says nothing rather than guessing for a single letter', () => {
    expect(searchReference('d')).toEqual([])
    expect(searchReference('')).toEqual([])
  })
})
