-- The public food reference layer: ingredients, recipes, and search over both.
--
-- ---------------------------------------------------------------------------
-- WHY INGREDIENTS AND RECIPES, AND NOT A TABLE OF DISHES WITH A CALORIE NUMBER
-- ---------------------------------------------------------------------------
-- Open Food Facts is already wired into this app (`app/diet/api/foods/route.ts`)
-- and it is a BARCODE database. Probed directly: `dal` returns a bag of dry
-- lentils and a namkeen snack, `sambar` returns sambar POWDER, `idli` returns
-- idli RAVA — the flour. A large share of its rows carry null nutrition because
-- nobody filled the panel in. It is excellent for a biscuit packet and useless
-- for a bowl of dal tadka. Nothing free fills that gap either: IFCT 2017
-- (ICMR-NIN) is authoritative but is ~528 RAW INGREDIENTS published as a PDF,
-- and USDA FoodData Central's composed dishes are American.
--
-- So a dish is not stored. A dish is COMPUTED from a recipe, at read time:
--
--   * `food_ingredient`  — per-100 g nutrition, with a source and a confidence.
--   * `food_recipe`      — a named list of ingredient quantities, plus the
--                          cooked yield of the batch.
--   * `food_recipe_item` — one ingredient quantity in one recipe.
--   * `food_recipe_nutrition` — a VIEW that sums the items. This is the "at
--                          read time" part; there is no stored dish total to
--                          drift out of agreement with its own recipe.
--
-- Three reasons, and the third is the strongest:
--
--   1. It is AUDITABLE. A user who sees "dal tadka, 124 kcal per katori" can
--      open the recipe, see 60 g of toor dal and 8 g of ghee, and correct the
--      recipe instead of distrusting the number.
--   2. Regional variation is free. More oil is a different recipe, not a new
--      row in a dish table and not an argument about whose dal is correct.
--   3. It is already this app's model. Diet's pressure-cooker batch is dry
--      ingredients in, one cooked batch out, halves served from it. Same shape.
--
-- ---------------------------------------------------------------------------
-- WHY THESE TABLES DO NOT HAVE THE PER-USER RLS SHAPE USED EVERYWHERE ELSE
-- ---------------------------------------------------------------------------
-- Every other table in this project is personal data keyed by `user_id` with
-- four owner policies (see `20260914090909_diet_log.sql`). These four are
-- REFERENCE DATA: they hold nobody's diary, and `/food` is public with no
-- login, so `anon` must be able to read them.
--
-- That changes the policies, and it does NOT relax anything else:
--
--   * RLS is ENABLED on every one of them. Not "not needed because public" —
--     `.agents/skills/supabase/SKILL.md` is explicit that every table in an
--     exposed schema gets RLS, and a table in `public` with a grant and no RLS
--     is readable AND writable through the Data API.
--   * one `for select to anon, authenticated using (true)` policy each.
--   * `grant select` only. No insert, update or delete grant to `anon` or to
--     `authenticated`, and no insert/update/delete POLICY either — so even if a
--     grant is added by accident later, RLS still has nothing to permit.
--     Writes happen as the service role, from `scripts/seed-food.ts`.
--
-- A public database anybody can write is a public database anybody can poison,
-- and a poisoned nutrition number is not a defaced wiki page — somebody eats
-- against it.
--
-- User-contributed foods are therefore a SEPARATE table, `food_contribution`,
-- with the normal per-user shape and private to its author. The two are not
-- mixed: a contribution never appears in public search.
-- ---------------------------------------------------------------------------

-- Trigram search. In `extensions`, never `public` — an extension in `public`
-- is an advisor finding and it puts unqualified names in everybody's way.
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- The nutrient columns, and the one rule that governs all of them.
--
-- ZERO AND UNKNOWN ARE DIFFERENT FACTS. Coconut oil contains zero fibre; that
-- is a measurement. Nobody has measured the potassium in kasuri methi; that is
-- an absence. Conflating them is the core failure of nutrition databases,
-- because it silently turns "we do not know" into a confident 0 that then gets
-- summed into a day's total.
--
-- So: the four macros that every source publishes are NOT NULL. Everything
-- else is NULLABLE, null means NOT KNOWN, and `lib/food/nutrients.ts` renders
-- null as "not known" rather than as a number. A recipe total for a nutrient
-- that any one of its ingredients lacks comes out null too (see the view
-- below), rather than a sum of the known half presented as the whole.
-- ---------------------------------------------------------------------------

create table if not exists public.food_ingredient (
  id text primary key check (id ~ '^[a-z0-9-]{2,64}$'),
  name text not null check (length(name) between 2 and 200),
  -- Synonyms, and they are load-bearing rather than a nicety. No stemmer knows
  -- that dahi is curd, that chana is chickpea or that thuvaram paruppu is toor
  -- dal, and Postgres' synonym dictionaries need a file on the server's disk,
  -- which a managed instance does not give you. So the synonyms are DATA, and
  -- they are folded into the search document by the trigger below.
  aliases text[] not null default '{}',
  food_group text not null check (food_group in (
    'pulse', 'grain', 'flour', 'vegetable', 'fruit', 'dairy', 'fat', 'meat',
    'fish', 'egg', 'nut', 'spice', 'sweetener', 'beverage', 'other'
  )),
  -- Dry lentils and cooked dal are not the same food and must not share a row:
  -- 343 kcal/100 g is true of the bag and wildly wrong about the bowl. This is
  -- exactly the mistake that makes Open Food Facts unusable for home cooking.
  state text not null check (state in ('dry', 'raw', 'cooked', 'as-purchased')),

  kcal numeric(7, 2) not null check (kcal between 0 and 950),
  protein_g numeric(6, 2) not null check (protein_g between 0 and 100),
  carb_g numeric(6, 2) not null check (carb_g between 0 and 100),
  fat_g numeric(6, 2) not null check (fat_g between 0 and 100),

  sugar_g numeric(6, 2) check (sugar_g between 0 and 100),
  sat_fat_g numeric(6, 2) check (sat_fat_g between 0 and 100),
  fibre_g numeric(6, 2) check (fibre_g between 0 and 100),
  sodium_mg numeric(9, 2) check (sodium_mg between 0 and 50000),

  -- Micronutrients. The least reliable and most laborious part of any food
  -- table, so most rows leave them null and the panel says so.
  calcium_mg numeric(9, 2) check (calcium_mg >= 0),
  iron_mg numeric(9, 2) check (iron_mg >= 0),
  potassium_mg numeric(9, 2) check (potassium_mg >= 0),
  vitamin_c_mg numeric(9, 2) check (vitamin_c_mg >= 0),

  -- PROVENANCE, ON EVERY NUMBER. A user must be able to tell an ICMR-sourced
  -- figure from somebody's guess, so this is not optional and has no default:
  -- forgetting it is a constraint violation rather than a silent 'unknown'.
  source text not null check (source in (
    'ifct-2017', 'usda-fdc', 'label', 'derived', 'estimate'
  )),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  source_note text,

  -- Ordering nudge for search ties: toor dal outranks poppy seed for "dal"
  -- because people look it up a thousand times more often, and that is a fact
  -- about usage that no similarity score contains.
  prominence smallint not null default 0 check (prominence between 0 and 100),

  -- Maintained by `food_search_document()`. Never written by hand.
  search_text text not null default '',
  search_doc tsvector not null default ''::tsvector,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An estimate may not claim high confidence. The label has to match the
  -- thing, or "provenance on every number" is decoration.
  constraint food_ingredient_estimate_not_high
    check (not (source = 'estimate' and confidence = 'high'))
);

comment on table public.food_ingredient is
  'Public reference: per-100g nutrition for one ingredient in one state, with its source and confidence. Null means not known, never zero.';

create table if not exists public.food_recipe (
  id text primary key check (id ~ '^[a-z0-9-]{2,64}$'),
  name text not null check (length(name) between 2 and 200),
  aliases text[] not null default '{}',
  region text,
  summary text,
  method text,

  -- The cooked weight of the whole batch. NOT the sum of the ingredient
  -- weights: dal absorbs water and a sabzi loses it, so the two differ by a
  -- lot, and dividing the batch's nutrients by the wrong denominator is how a
  -- dish ends up three times its real energy density. Nutrients come from the
  -- ingredients; the yield is what turns them into per-100g-as-eaten.
  yield_g numeric(8, 1) not null check (yield_g between 1 and 20000),

  source text not null default 'derived' check (source in (
    'ifct-2017', 'usda-fdc', 'label', 'derived', 'estimate'
  )),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  source_note text,
  prominence smallint not null default 0 check (prominence between 0 and 100),

  search_text text not null default '',
  search_doc tsvector not null default ''::tsvector,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A recipe's nutrition is always derived from its items, so it can never be
  -- 'high': the ingredient figures below it are the ceiling on its accuracy,
  -- and the quantities are one cook's version of the dish.
  constraint food_recipe_derived_not_high check (confidence <> 'high')
);

comment on table public.food_recipe is
  'Public reference: a dish as a named list of ingredient quantities plus a cooked yield. Its nutrition is computed, never stored.';

create table if not exists public.food_recipe_item (
  recipe_id text not null references public.food_recipe (id) on delete cascade,
  ingredient_id text not null references public.food_ingredient (id) on delete restrict,
  -- Raw/dry weight going in, matching the ingredient's own `state`.
  grams numeric(8, 2) not null check (grams > 0 and grams <= 10000),
  note text,
  sort_order smallint not null default 0,
  primary key (recipe_id, ingredient_id)
);

comment on table public.food_recipe_item is
  'One ingredient quantity in one recipe. `on delete restrict` on the ingredient: deleting an ingredient must not silently change a dish''s calories.';

-- The FK to `food_ingredient` is not the leftmost key column, so it needs its
-- own index or every ingredient delete/update does a seq scan here.
create index if not exists food_recipe_item_ingredient_idx
  on public.food_recipe_item (ingredient_id);

-- ---------------------------------------------------------------------------
-- food_serving — "1 bowl", "1 idli", "1 roti", "1 katori", next to the grams.
--
-- A gram-only database gets abandoned. Nobody weighs an idli, and the answer
-- to "how many calories in two idlis" must not require the user to know that
-- an idli is about 45 g. So the household measure is stored, with its grams,
-- as a first-class row.
--
-- Exactly one of `ingredient_id` / `recipe_id` is set. Two nullable foreign
-- keys rather than a (kind, id) pair, so both sides keep real referential
-- integrity — a serving for a deleted recipe cannot survive it.
-- ---------------------------------------------------------------------------
create table if not exists public.food_serving (
  id bigint generated always as identity primary key,
  ingredient_id text references public.food_ingredient (id) on delete cascade,
  recipe_id text references public.food_recipe (id) on delete cascade,
  label text not null check (length(label) between 1 and 60),
  grams numeric(8, 2) not null check (grams > 0 and grams <= 10000),
  sort_order smallint not null default 0,
  constraint food_serving_one_owner check (
    (ingredient_id is not null) <> (recipe_id is not null)
  )
);

comment on table public.food_serving is
  'Household measures — a katori, an idli, a roti — with their grams. Public reference data.';

create index if not exists food_serving_ingredient_idx
  on public.food_serving (ingredient_id, sort_order);
create index if not exists food_serving_recipe_idx
  on public.food_serving (recipe_id, sort_order);

-- ---------------------------------------------------------------------------
-- The search document, maintained by trigger.
--
-- `search_text` is one lowercased string of the name plus every alias, indexed
-- with trigrams: that is what survives a misspelling. `search_doc` is the same
-- string as a `simple`-config tsvector: no stemming, because an English
-- stemmer mangles transliterated Hindi and Tamil ("idli" -> "idli", fine, but
-- "poha" and "pohe" are unrelated to it and "rasam" stems to "rasam" while
-- "rasams" does not appear at all). Prefix matching on unstemmed words is what
-- actually answers a half-typed query.
--
-- A generated column cannot do this: `array_to_string` is not IMMUTABLE, so
-- Postgres refuses it in `generated always as`.
-- ---------------------------------------------------------------------------
create or replace function public.food_search_document()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.search_text :=
    lower(new.name || ' ' || coalesce(array_to_string(new.aliases, ' '), ''));
  new.search_doc :=
    to_tsvector('pg_catalog.simple', new.search_text);
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.food_search_document() is
  'Keeps search_text/search_doc in step with name+aliases. A generated column cannot: array_to_string is not immutable.';

create trigger food_ingredient_search_document
  before insert or update on public.food_ingredient
  for each row execute function public.food_search_document();

create trigger food_recipe_search_document
  before insert or update on public.food_recipe
  for each row execute function public.food_search_document();

create index if not exists food_ingredient_trgm_idx
  on public.food_ingredient using gin (search_text extensions.gin_trgm_ops);
create index if not exists food_ingredient_doc_idx
  on public.food_ingredient using gin (search_doc);
create index if not exists food_recipe_trgm_idx
  on public.food_recipe using gin (search_text extensions.gin_trgm_ops);
create index if not exists food_recipe_doc_idx
  on public.food_recipe using gin (search_doc);

-- ---------------------------------------------------------------------------
-- food_recipe_nutrition — the "computed at read time" half of the model.
--
-- `security_invoker = true` is not optional: a view without it runs as its
-- OWNER and hands the caller everything the owner can see, RLS on the base
-- tables included. Here the base tables are public anyway, but a view that
-- bypasses RLS by default is a habit that goes wrong the first time it is
-- copied onto something personal.
--
-- Note the shape of every nullable nutrient: if ANY contributing ingredient
-- has no value, the total is NULL. Summing the ingredients that happen to
-- carry a figure and presenting it as the dish's total would report a
-- confident understatement, which is worse than saying nothing.
-- ---------------------------------------------------------------------------
create or replace view public.food_recipe_nutrition
with (security_invoker = true) as
select
  r.id                                      as recipe_id,
  r.yield_g,
  count(*)                                  as item_count,
  sum(it.grams)                             as input_g,
  sum(it.grams * i.kcal / 100.0)            as kcal_total,
  sum(it.grams * i.protein_g / 100.0)       as protein_g_total,
  sum(it.grams * i.carb_g / 100.0)          as carb_g_total,
  sum(it.grams * i.fat_g / 100.0)           as fat_g_total,
  case when count(*) filter (where i.sugar_g is null) > 0 then null
       else sum(it.grams * i.sugar_g / 100.0) end      as sugar_g_total,
  case when count(*) filter (where i.sat_fat_g is null) > 0 then null
       else sum(it.grams * i.sat_fat_g / 100.0) end    as sat_fat_g_total,
  case when count(*) filter (where i.fibre_g is null) > 0 then null
       else sum(it.grams * i.fibre_g / 100.0) end      as fibre_g_total,
  case when count(*) filter (where i.sodium_mg is null) > 0 then null
       else sum(it.grams * i.sodium_mg / 100.0) end    as sodium_mg_total,
  case when count(*) filter (where i.calcium_mg is null) > 0 then null
       else sum(it.grams * i.calcium_mg / 100.0) end   as calcium_mg_total,
  case when count(*) filter (where i.iron_mg is null) > 0 then null
       else sum(it.grams * i.iron_mg / 100.0) end      as iron_mg_total,
  case when count(*) filter (where i.potassium_mg is null) > 0 then null
       else sum(it.grams * i.potassium_mg / 100.0) end as potassium_mg_total,
  case when count(*) filter (where i.vitamin_c_mg is null) > 0 then null
       else sum(it.grams * i.vitamin_c_mg / 100.0) end as vitamin_c_mg_total,
  -- The weakest link is the dish's real confidence: a recipe of six high-
  -- confidence figures and one guess is a guess.
  min(case i.confidence when 'low' then 1 when 'medium' then 2 else 3 end)
                                            as weakest_confidence
from public.food_recipe r
join public.food_recipe_item it on it.recipe_id = r.id
join public.food_ingredient i on i.id = it.ingredient_id
group by r.id, r.yield_g;

comment on view public.food_recipe_nutrition is
  'A recipe summed from its items. A nutrient any ingredient lacks comes out NULL, not a partial sum.';

-- ---------------------------------------------------------------------------
-- food_search — one ranked list over ingredients and recipes.
--
-- WHY NOT `ilike '%q%'`: it cannot use a b-tree index, so it is a sequential
-- scan that gets slower every time the table grows; it cannot rank, so "dal"
-- returns "poppy seed (khus khus) dal-free" ahead of "Dal tadka" if that is
-- the physical row order; and it cannot survive a typo at all.
--
-- What is used instead, three index-backed signals combined with `greatest`:
--
--   1. EXACT and PREFIX on the name — a b-tree/trigram-answerable equality and
--      left-anchored LIKE. "paneer" must put paneer first, always.
--   2. FULL-TEXT PREFIX (`search_doc @@ to_tsquery('simple', 'pan:*')`) —
--      this is what answers a partial word, and with `&` between the terms it
--      is what makes "dal tad" find "Dal tadka". GIN-indexed.
--   3. TRIGRAM WORD SIMILARITY (`search_text %> q`) — this is what survives a
--      misspelling: "panner" -> "paneer", "sambhar" -> "sambar". GIN-indexed
--      via `gin_trgm_ops`, with the thresholds lowered on this function only
--      (the 0.6 default is too strict for six-letter transliterations).
--
-- Synonyms — curd/dahi, chana/chickpea, brinjal/eggplant/baingan — are not a
-- fourth signal. They are rows in `aliases`, folded into `search_text` by the
-- trigger, so every signal above sees them for free.
--
-- Recipes break ties ahead of ingredients on purpose. Somebody searching "dal"
-- wants the bowl of dal; the bag of dry lentils is the other thing they might
-- have meant, and putting it first is precisely the Open Food Facts failure
-- this whole layer exists to avoid.
-- ---------------------------------------------------------------------------
create or replace function public.food_search(q text, lim integer default 24)
returns table (
  kind text,
  id text,
  name text,
  aliases text[],
  food_group text,
  score real,
  kcal_per_100g numeric,
  protein_per_100g numeric,
  serving_label text,
  serving_grams numeric,
  source text,
  confidence text
)
language sql
stable
security invoker
set search_path = ''
set "pg_trgm.similarity_threshold" = '0.3'
set "pg_trgm.word_similarity_threshold" = '0.3'
as $$
with norm as (
  select
    lower(btrim(q)) as nq,
    least(greatest(coalesce(lim, 24), 1), 50) as n
),
terms as (
  select
    nq,
    n,
    (
      select string_agg(w || ':*', ' & ')
      from unnest(regexp_split_to_array(nq, '[^a-z0-9]+')) as w
      where w <> ''
    ) as tsq_text
  from norm
),
tsq as (
  select
    nq,
    n,
    case
      when tsq_text is null then null
      else to_tsquery('pg_catalog.simple', tsq_text)
    end as query
  from terms
),
ingredients as (
  select
    'ingredient'::text as kind,
    i.id,
    i.name,
    i.aliases,
    i.food_group,
    greatest(
      case when i.search_text = t.nq then 1.00 else 0 end,
      case when lower(i.name) like t.nq || '%' then 0.94 else 0 end,
      case when t.query is not null and i.search_doc @@ t.query then 0.80 else 0 end,
      extensions.word_similarity(t.nq, i.search_text) * 0.75,
      extensions.similarity(t.nq, i.search_text) * 0.55
    )::real as score,
    i.prominence,
    i.kcal as kcal_per_100g,
    i.protein_g as protein_per_100g,
    i.source,
    i.confidence
  from public.food_ingredient i
  cross join tsq t
  where t.nq <> ''
    and (
      (t.query is not null and i.search_doc @@ t.query)
      or i.search_text operator(extensions.%>) t.nq
      or i.search_text operator(extensions.%) t.nq
    )
),
recipes as (
  select
    'recipe'::text as kind,
    r.id,
    r.name,
    r.aliases,
    'dish'::text as food_group,
    greatest(
      case when r.search_text = t.nq then 1.00 else 0 end,
      case when lower(r.name) like t.nq || '%' then 0.94 else 0 end,
      case when t.query is not null and r.search_doc @@ t.query then 0.80 else 0 end,
      extensions.word_similarity(t.nq, r.search_text) * 0.75,
      extensions.similarity(t.nq, r.search_text) * 0.55
    )::real as score,
    r.prominence,
    round(n.kcal_total / r.yield_g * 100.0, 2) as kcal_per_100g,
    round(n.protein_g_total / r.yield_g * 100.0, 2) as protein_per_100g,
    r.source,
    r.confidence
  from public.food_recipe r
  join public.food_recipe_nutrition n on n.recipe_id = r.id
  cross join tsq t
  where t.nq <> ''
    and (
      (t.query is not null and r.search_doc @@ t.query)
      or r.search_text operator(extensions.%>) t.nq
      or r.search_text operator(extensions.%) t.nq
    )
),
hits as (
  select * from ingredients
  union all
  select * from recipes
)
select
  h.kind,
  h.id,
  h.name,
  h.aliases,
  h.food_group,
  h.score,
  h.kcal_per_100g,
  h.protein_per_100g,
  s.label as serving_label,
  s.grams as serving_grams,
  h.source,
  h.confidence
from hits h
left join lateral (
  select sv.label, sv.grams
  from public.food_serving sv
  where (h.kind = 'ingredient' and sv.ingredient_id = h.id)
     or (h.kind = 'recipe' and sv.recipe_id = h.id)
  order by sv.sort_order, sv.id
  limit 1
) s on true
where h.score >= 0.30
order by
  h.score desc,
  -- Recipes first on a tie: "dal" means the bowl, not the bag.
  case h.kind when 'recipe' then 0 else 1 end,
  h.prominence desc,
  -- Shorter names are the more canonical food, nearly always: "Paneer" before
  -- "Paneer butter masala" before "Paneer butter masala, restaurant style".
  length(h.name),
  h.name
limit (select n from norm);
$$;

comment on function public.food_search(text, integer) is
  'Ranked search over public ingredients and recipes: exact, name prefix, full-text word prefix, and trigram similarity for misspellings. Recipes win ties.';

-- ---------------------------------------------------------------------------
-- food_contribution — a user's OWN food. Not reference data, not public.
--
-- The normal per-user shape, deliberately unchanged from `diet_food`'s: the
-- moment contributed rows and reference rows share a table, one bad policy
-- makes a stranger's guess indistinguishable from an ICMR figure. `status` is
-- the promotion path — a `submitted` row is something a human can review and
-- then re-author as reference data. It does not become reference data by
-- itself, and nothing here is readable by anybody but its author.
-- ---------------------------------------------------------------------------
create table if not exists public.food_contribution (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (length(name) between 2 and 200),
  aliases text[] not null default '{}',
  food_group text not null default 'other' check (food_group in (
    'pulse', 'grain', 'flour', 'vegetable', 'fruit', 'dairy', 'fat', 'meat',
    'fish', 'egg', 'nut', 'spice', 'sweetener', 'beverage', 'other'
  )),
  state text not null default 'cooked' check (state in ('dry', 'raw', 'cooked', 'as-purchased')),

  kcal numeric(7, 2) not null check (kcal between 0 and 950),
  protein_g numeric(6, 2) not null check (protein_g between 0 and 100),
  carb_g numeric(6, 2) not null check (carb_g between 0 and 100),
  fat_g numeric(6, 2) not null check (fat_g between 0 and 100),
  sugar_g numeric(6, 2) check (sugar_g between 0 and 100),
  sat_fat_g numeric(6, 2) check (sat_fat_g between 0 and 100),
  fibre_g numeric(6, 2) check (fibre_g between 0 and 100),
  sodium_mg numeric(9, 2) check (sodium_mg between 0 and 50000),

  serving_label text check (length(serving_label) between 1 and 60),
  serving_grams numeric(8, 2) check (serving_grams > 0 and serving_grams <= 10000),

  -- A contribution is somebody's own figure until a human says otherwise, so
  -- the source vocabulary here is narrower than the reference table's: nobody
  -- gets to stamp their own row 'ifct-2017'.
  source text not null default 'estimate' check (source in ('label', 'estimate')),
  confidence text not null default 'low' check (confidence in ('medium', 'low')),
  note text,
  status text not null default 'private' check (status in ('private', 'submitted')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

comment on table public.food_contribution is
  'A user''s own food entries. Private to their author; never merged into the public reference tables by code.';

alter table public.food_contribution enable row level security;

create policy "food_contribution: owner reads" on public.food_contribution
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "food_contribution: owner inserts" on public.food_contribution
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "food_contribution: owner updates" on public.food_contribution
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "food_contribution: owner deletes" on public.food_contribution
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- RLS on the reference tables: enabled, with exactly one read policy each.
--
-- `using (true)` is the whole point — every row is public — but RLS being ON
-- is what makes the ABSENCE of an insert/update/delete policy bite. With RLS
-- off, a table in `public` with a grant is wide open regardless of policies;
-- with RLS on and no write policy, a write is refused even if somebody later
-- adds a grant by mistake. Two independent locks, which is the shape you want
-- on the one table in this project that a stranger can reach.
-- ---------------------------------------------------------------------------
alter table public.food_ingredient enable row level security;
alter table public.food_recipe enable row level security;
alter table public.food_recipe_item enable row level security;
alter table public.food_serving enable row level security;

create policy "food_ingredient: public reads" on public.food_ingredient
  for select to anon, authenticated using (true);

create policy "food_recipe: public reads" on public.food_recipe
  for select to anon, authenticated using (true);

create policy "food_recipe_item: public reads" on public.food_recipe_item
  for select to anon, authenticated using (true);

create policy "food_serving: public reads" on public.food_serving
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Data API reachability. Separate from RLS: RLS decides which ROWS are visible
-- once a table can be reached, and a table with no grant is invisible to
-- PostgREST entirely.
--
-- SELECT ONLY, and that is the security boundary. There is deliberately no
-- `grant insert` anywhere below — not to `anon`, not to `authenticated`. The
-- seed runs as the service role, which bypasses both grants and RLS.
-- ---------------------------------------------------------------------------
grant select on public.food_ingredient to anon, authenticated;
grant select on public.food_recipe to anon, authenticated;
grant select on public.food_recipe_item to anon, authenticated;
grant select on public.food_serving to anon, authenticated;
grant select on public.food_recipe_nutrition to anon, authenticated;

-- `authenticated` only, and all four verbs: this one is the user's own data.
grant select, insert, update, delete on public.food_contribution to authenticated;

-- The search function. `security invoker`, so the reference tables' own
-- policies still apply to whoever calls it.
grant execute on function public.food_search(text, integer) to anon, authenticated;
