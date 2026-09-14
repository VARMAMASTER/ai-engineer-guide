-- Score the query against each name and alias SEPARATELY, from an indexed
-- token table, rather than against one concatenated search document.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS WRONG, FOUND BY SEARCHING THE SEEDED DATA RATHER THAN BY READING
-- ---------------------------------------------------------------------------
-- The first version scored `word_similarity(query, search_text)`, where
-- `search_text` is a row's name plus every alias run together. Measured
-- against the real rows:
--
--   query "sambar" -> "sugar"  scored 0.429
--   query "paneer" -> "water"  scored 0.571  -- HIGHER THAN PANEER ITSELF
--   query "panner" -> "paneer" scored 0.429, and "water" again 0.571
--
-- Water beat paneer for a misspelling of paneer. The cause is what
-- `word_similarity` is built to do: it hunts for the most similar EXTENT
-- inside the second string and normalises by that extent, so a document made
-- of many short words gives it many chances to find a flattering one. Water's
-- aliases are "pani" and "thanni", which between them carry most of the
-- trigrams of "panner".
--
-- The worst part of that failure is its direction: the more aliases a row
-- gained -- the more useful its data became -- the more false matches it
-- attracted. A ranking that degrades as the content improves is not a
-- threshold to tune, it is the wrong comparison.
--
-- ---------------------------------------------------------------------------
-- THE FIX: COMPARE LIKE WITH LIKE, AND INDEX THE THING BEING COMPARED
-- ---------------------------------------------------------------------------
-- `food_search_token` holds one row per (food, name-or-alias), maintained by
-- trigger, with a trigram GIN index on the token. Each token is scored on its
-- own and the best one wins:
--
--   query "panner" -> "paneer" 0.40, "pani" 0.33, "water" 0.08
--   query "sambar" -> "sugar" 0.18
--
-- The real match is now top and the noise falls under the floor. Two numbers
-- do that and both were measured rather than picked: the similarity band is
-- weighted 0.9 and the floor is 0.34, which is the gap between
-- "panner"/"paneer" (0.36) and "paneer"/"pani" (0.30).
--
-- The token table is also what keeps this indexable. `similarity(a, b) >= x`
-- cannot use a GIN index on its own; the `%` OPERATOR can, and its default
-- threshold is pg_trgm's own 0.3 -- conveniently below the 0.378 that the
-- 0.34 floor implies, so the index prefilter cannot drop a row the scoring
-- would have kept. It is a cheap index probe followed by accurate arithmetic
-- on the survivors, and it does not degrade into a sequential scan as the
-- table grows, which is the whole reason for not writing `ilike '%q%'`.
--
-- The thresholds are NOT overridden with a function-level `SET`. Supabase
-- refuses `set pg_trgm.similarity_threshold` from a non-superuser role once
-- the module is loaded ("permission denied to set parameter"), so a migration
-- that does it applies once and then never replays on a fresh project. Using
-- the operator's default instead is the version that survives a rebuild.
--
-- KNOWN LIMIT, written down rather than glossed: trigrams do not forgive a
-- transposition. "dhai" does not find "dahi" -- the two share one trigram.
-- That is why the alias lists carry the spellings people actually type
-- instead of leaning on the fuzzy match to rescue them.
-- ---------------------------------------------------------------------------

create table if not exists public.food_search_token (
  kind text not null check (kind in ('ingredient', 'recipe')),
  food_id text not null,
  token text not null check (length(token) between 1 and 200),
  primary key (kind, food_id, token)
);

comment on table public.food_search_token is
  'One row per food per name-or-alias, trigram-indexed. Maintained by trigger; never written by hand.';

create index if not exists food_search_token_trgm_idx
  on public.food_search_token using gin (token extensions.gin_trgm_ops);

/**
 * The head of a food's name: everything before the first comma or bracket.
 *
 * "Paneer, cow milk" -> "paneer".  "Toor dal (arhar), dry split" -> "toor dal".
 *
 * This exists because a reference name has to be specific ("Paneer, cow milk"
 * is a different food from buffalo-milk paneer) while a query is not. Without
 * it, the only token for paneer was the whole qualified name, and the
 * misspelling "panner" scored 0.18 against "paneer, cow milk" instead of 0.40
 * against "paneer" -- the qualifier that makes the row honest was what broke
 * the search.
 */
create or replace function public.food_name_head(name text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select lower(btrim(split_part(regexp_replace(name, '\(.*$', ''), ',', 1)))
$$;

comment on function public.food_name_head(text) is
  'Everything before the first comma or bracket in a food name, lowercased - the short name a person would type.';

/**
 * Keeps `food_search_token` in step with a food's name and aliases.
 *
 * No foreign key, because a token belongs to one of TWO parents and Postgres
 * has no such constraint. The delete trigger is what stands in for the
 * cascade, and it is why this fires on DELETE as well as on write.
 */
create or replace function public.food_sync_tokens()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  row_kind text := case tg_table_name when 'food_recipe' then 'recipe' else 'ingredient' end;
begin
  if tg_op = 'DELETE' then
    delete from public.food_search_token t
      where t.kind = row_kind and t.food_id = old.id;
    return old;
  end if;

  delete from public.food_search_token t
    where t.kind = row_kind and t.food_id = new.id;

  insert into public.food_search_token (kind, food_id, token)
  select distinct row_kind, new.id, lower(btrim(tok))
  from unnest(
    array_prepend(
      new.name,
      array_prepend(public.food_name_head(new.name), new.aliases)
    )
  ) as tok
  where btrim(tok) <> ''
  on conflict do nothing;

  return new;
end;
$$;

comment on function public.food_sync_tokens() is
  'Rewrites a food''s search tokens from its name and aliases. Stands in for the cascade a two-parent table cannot have.';

create trigger food_ingredient_sync_tokens
  after insert or update or delete on public.food_ingredient
  for each row execute function public.food_sync_tokens();

create trigger food_recipe_sync_tokens
  after insert or update or delete on public.food_recipe
  for each row execute function public.food_sync_tokens();

-- Backfill for rows that already exist. Doing it with an explicit insert
-- rather than a no-op UPDATE, so the migration says what it is doing.
insert into public.food_search_token (kind, food_id, token)
select distinct 'ingredient', i.id, lower(btrim(tok))
from public.food_ingredient i,
     unnest(array_prepend(i.name, array_prepend(public.food_name_head(i.name), i.aliases))) as tok
where btrim(tok) <> ''
on conflict do nothing;

insert into public.food_search_token (kind, food_id, token)
select distinct 'recipe', r.id, lower(btrim(tok))
from public.food_recipe r,
     unnest(array_prepend(r.name, array_prepend(public.food_name_head(r.name), r.aliases))) as tok
where btrim(tok) <> ''
on conflict do nothing;

-- Reference data: RLS on, public read, and no write path for anybody but the
-- service role. Same shape as the tables it indexes.
alter table public.food_search_token enable row level security;

create policy "food_search_token: public reads" on public.food_search_token
  for select to anon, authenticated using (true);

grant select on public.food_search_token to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The search function, rebuilt on the token table.
--
-- Two index-backed ways in, and a row needs only one of them:
--
--   * `search_doc @@ to_tsquery('simple', 'pan:* & mas:*')` -- the exact-word
--     and half-typed-word path, unstemmed so transliterations survive. This
--     also subsumes name-prefix matching: if the name starts with the query
--     then its first word does too.
--   * `token % query` -- the misspelling path, per token.
--
-- Scoring then takes the best of five bands, so a better kind of match can
-- never lose to a weaker one:
--
--   1.00  the NAME is exactly the query (or its head - see food_name_head)
--   0.94  the name starts with the query
--   0.88  an ALIAS is exactly the query
--   0.80  some word in the name or an alias starts with the query
--   x0.9  trigram similarity of the closest single token
--
-- Name-exact and alias-exact are separate bands, and the gap matters: "dal" is
-- an alias of Dal tadka, Dal fry AND Dal makhani, so if an exact alias scored
-- 1.00 then the query "paneer" would rank three paneer DISHES above the
-- ingredient actually called Paneer. The thing named by the query wins.
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
as $$
with norm as (
  select
    lower(btrim(q)) as nq,
    least(greatest(coalesce(lim, 24), 1), 50) as n
),
tsq as (
  select
    s.nq,
    s.n,
    case when s.tsq_text is null then null
         else to_tsquery('pg_catalog.simple', s.tsq_text) end as query
  from (
    select
      nq,
      n,
      (
        select string_agg(w || ':*', ' & ')
        from unnest(regexp_split_to_array(nq, '[^a-z0-9]+')) as w
        where w <> ''
      ) as tsq_text
    from norm
  ) s
),
-- The fuzzy candidate set, straight off the trigram index on `token`.
fuzzy as (
  select
    tk.kind,
    tk.food_id,
    max(extensions.similarity(tk.token, t.nq)) as best,
    bool_or(tk.token = t.nq) as exact
  from public.food_search_token tk
  cross join norm t
  where t.nq <> ''
    and tk.token operator(extensions.%) t.nq
  group by tk.kind, tk.food_id
),
ingredients as (
  select
    'ingredient'::text as kind,
    i.id,
    i.name,
    i.aliases,
    i.food_group,
    greatest(
      case when lower(i.name) = t.nq or public.food_name_head(i.name) = t.nq then 1.00 else 0 end,
      case when lower(i.name) like t.nq || '%' then 0.94 else 0 end,
      case when coalesce(f.exact, false) then 0.88 else 0 end,
      case when t.query is not null and i.search_doc @@ t.query then 0.80 else 0 end,
      coalesce(f.best, 0) * 0.9
    )::real as score,
    i.prominence,
    i.kcal as kcal_per_100g,
    i.protein_g as protein_per_100g,
    i.source,
    i.confidence
  from public.food_ingredient i
  cross join tsq t
  left join fuzzy f on f.kind = 'ingredient' and f.food_id = i.id
  where t.nq <> ''
    and (
      (t.query is not null and i.search_doc @@ t.query)
      or f.food_id is not null
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
      case when lower(r.name) = t.nq or public.food_name_head(r.name) = t.nq then 1.00 else 0 end,
      case when lower(r.name) like t.nq || '%' then 0.94 else 0 end,
      case when coalesce(f.exact, false) then 0.88 else 0 end,
      case when t.query is not null and r.search_doc @@ t.query then 0.80 else 0 end,
      coalesce(f.best, 0) * 0.9
    )::real as score,
    r.prominence,
    round(rn.kcal_total / r.yield_g * 100.0, 2) as kcal_per_100g,
    round(rn.protein_g_total / r.yield_g * 100.0, 2) as protein_per_100g,
    r.source,
    r.confidence
  from public.food_recipe r
  join public.food_recipe_nutrition rn on rn.recipe_id = r.id
  cross join tsq t
  left join fuzzy f on f.kind = 'recipe' and f.food_id = r.id
  where t.nq <> ''
    and (
      (t.query is not null and r.search_doc @@ t.query)
      or f.food_id is not null
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
-- 0.34, and the value is load-bearing rather than round: it sits above
-- "paneer"/"pani" (0.30) and below "panner"/"paneer" (0.36).
where h.score >= 0.34
order by
  h.score desc,
  -- Recipes first on a tie: "dal" means the bowl, not the bag.
  case h.kind when 'recipe' then 0 else 1 end,
  h.prominence desc,
  -- Shorter names are the more canonical food nearly always: "Paneer" before
  -- "Paneer butter masala".
  length(h.name),
  h.name
limit (select n from norm);
$$;

comment on function public.food_search(text, integer) is
  'Ranked search over public ingredients and recipes. Scores each name and alias separately from food_search_token; scoring against the concatenated document let "water" outrank "paneer" for the query "panner".';

grant execute on function public.food_search(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The trigram indexes this migration made dead.
--
-- Fuzzy matching now runs over `food_search_token.token`, so the trigram
-- indexes on the concatenated `search_text` have no remaining caller — and
-- `db advisors` says so under `unused_index`. A GIN trigram index is not free:
-- it is rewritten on every insert and update of the row. `search_text` itself
-- stays, because `search_doc` is built from it and because it is what makes a
-- row's search behaviour inspectable in a query.
-- ---------------------------------------------------------------------------
drop index if exists public.food_ingredient_trgm_idx;
drop index if exists public.food_recipe_trgm_idx;
