/**
 * Attack the public food tables as an anonymous client.
 *
 *   npx tsx scripts/attack-food-tables.ts
 *
 * A policy you have not attacked is a policy you have not tested. This uses
 * the SAME publishable key the browser gets — nothing privileged — and tries
 * every write a stranger could try against every public reference table, plus
 * a read of the private contributions table.
 *
 * Every write must be REFUSED and every read of somebody else's data must come
 * back empty. The script exits non-zero if any of them succeeds, so a future
 * migration that adds a careless grant fails here instead of in the wild.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and the publishable/anon key.')
  process.exit(1)
}

const anon = createClient(url, key, { auth: { persistSession: false } })

let failures = 0

function report(what: string, refused: boolean, detail: string): void {
  console.log(`${refused ? 'REFUSED ' : 'ALLOWED '} ${what.padEnd(46)} ${detail}`)
  if (!refused) failures += 1
}

async function main(): Promise<void> {
  console.log(`Attacking ${url} as anon.\n`)

  // 1. The headline attack: poison an ingredient's calories.
  {
    const { data, error } = await anon
      .from('food_ingredient')
      .insert({
        id: 'poison-attempt',
        name: 'Poisoned ingredient',
        food_group: 'other',
        state: 'raw',
        kcal: 1,
        protein_g: 99,
        carb_g: 0,
        fat_g: 0,
        source: 'ifct-2017',
        confidence: 'high',
      })
      .select()
    report('insert into food_ingredient', Boolean(error) || (data?.length ?? 0) === 0, error?.message ?? 'no error')
  }

  // 2. Quieter and worse: edit an existing number rather than add a row.
  {
    const { data, error } = await anon
      .from('food_ingredient')
      .update({ kcal: 1 })
      .eq('id', 'ghee')
      .select()
    report('update food_ingredient (ghee -> 1 kcal)', Boolean(error) || (data?.length ?? 0) === 0, error?.message ?? `rows: ${data?.length ?? 0}`)
  }

  {
    const { data, error } = await anon.from('food_ingredient').delete().eq('id', 'ghee').select()
    report('delete from food_ingredient', Boolean(error) || (data?.length ?? 0) === 0, error?.message ?? `rows: ${data?.length ?? 0}`)
  }

  // 3. The same three against every other public table, because one missed
  //    grant is enough.
  {
    const { data, error } = await anon
      .from('food_recipe')
      .insert({ id: 'poison-recipe', name: 'Poisoned recipe', yield_g: 100, confidence: 'medium' })
      .select()
    report('insert into food_recipe', Boolean(error) || (data?.length ?? 0) === 0, error?.message ?? 'no error')
  }

  {
    // Changing a quantity changes the dish's calories without touching a
    // calorie column anywhere — the attack the computed model invites.
    const { data, error } = await anon
      .from('food_recipe_item')
      .update({ grams: 500 })
      .eq('recipe_id', 'dal-tadka')
      .eq('ingredient_id', 'ghee')
      .select()
    report('update food_recipe_item (dal -> 500g ghee)', Boolean(error) || (data?.length ?? 0) === 0, error?.message ?? `rows: ${data?.length ?? 0}`)
  }

  {
    const { data, error } = await anon
      .from('food_serving')
      .insert({ recipe_id: 'idli', label: '1 idli', grams: 500 })
      .select()
    report('insert into food_serving', Boolean(error) || (data?.length ?? 0) === 0, error?.message ?? 'no error')
  }

  {
    const { data, error } = await anon
      .from('food_search_token')
      .insert({ kind: 'recipe', food_id: 'idli', token: 'chocolate' })
      .select()
    report('insert into food_search_token', Boolean(error) || (data?.length ?? 0) === 0, error?.message ?? 'no error')
  }

  // 4. The private table. A signed-out client must not read or write it.
  {
    const { data, error } = await anon.from('food_contribution').select('*')
    report('select from food_contribution', Boolean(error) || (data?.length ?? 0) === 0, error?.message ?? `rows: ${data?.length ?? 0}`)
  }

  {
    const { data, error } = await anon
      .from('food_contribution')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        id: 'x',
        name: 'Anonymous contribution',
        kcal: 1,
        protein_g: 0,
        carb_g: 0,
        fat_g: 0,
      })
      .select()
    report('insert into food_contribution', Boolean(error) || (data?.length ?? 0) === 0, error?.message ?? 'no error')
  }

  // 5. And the control: reading must WORK, or the page is broken instead of
  //    secure. A locked-down table nobody can read is not the goal.
  {
    const { data, error } = await anon.from('food_ingredient').select('id, name, kcal').eq('id', 'ghee')
    const ok = !error && (data?.length ?? 0) === 1
    console.log(`${ok ? 'OK      ' : 'BROKEN  '} ${'select from food_ingredient'.padEnd(46)} ${error?.message ?? JSON.stringify(data?.[0])}`)
    if (!ok) failures += 1
  }

  {
    const { data, error } = await anon.rpc('food_search', { q: 'dal', lim: 3 })
    const rows = (data ?? []) as { id: string; score: number }[]
    const ok = !error && rows.length > 0
    console.log(
      `${ok ? 'OK      ' : 'BROKEN  '} ${'rpc food_search as anon'.padEnd(46)} ${error?.message ?? rows.map((r) => r.id).join(', ')}`,
    )
    if (!ok) failures += 1
  }

  // 6. Confirm nothing actually changed, in case a write was accepted and
  //    silently filtered rather than refused.
  {
    const { data } = await anon.from('food_ingredient').select('kcal').eq('id', 'ghee').single()
    const intact = Number(data?.kcal) === 900
    console.log(`${intact ? 'OK      ' : 'TAMPERED'} ${'ghee is still 900 kcal'.padEnd(46)} ${data?.kcal}`)
    if (!intact) failures += 1
  }

  console.log(`\n${failures === 0 ? 'All writes refused, all reads work.' : `${failures} PROBLEM(S).`}`)
  process.exit(failures === 0 ? 0 : 1)
}

void main()
