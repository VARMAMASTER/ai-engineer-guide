-- The Diet app's weekly meal plan (spec section 5.1).
--
-- A plan is a TEMPLATE, not a second log. It produces ordinary `diet_entry`
-- rows through the existing path, so nothing here duplicates a total that
-- `diet_entry` already holds and no analytic reads this table.
--
-- Follows the isolation convention set by `20260914090909_diet_log.sql`:
--   * `user_id uuid not null references auth.users (id) on delete cascade`
--   * `user_id` LEFTMOST in the primary key
--   * RLS enabled with four policies, each `to authenticated` AND carrying an
--     ownership predicate
--   * the update policy carries BOTH `using` and `with check`
--   * explicit grants to `authenticated` only. Never `anon`.
--
-- The plan is seeded per user and editable, so it lives behind auth like the
-- rest of `/diet/**` even though a meal plan is not private body data the way
-- a weight reading is. There is no shared/global copy: two people who start
-- from the same template diverge the moment either edits it, and a shared row
-- would mean one user's edit changed the other's dinner.

-- ---------------------------------------------------------------------------
-- diet_food — three new columns.
--
-- WHY `weight_basis` IS NOT COSMETIC. 100 g of dry brown rice is ~362 kcal;
-- the same rice cooked weighs ~300 g, so 100 g out of the pot is ~120 kcal. A
-- plan that says "brown rice 100 g" and a user who weighs it cooked disagree by
-- 240 kcal, and NOTHING on screen looks wrong — both figures are plausible,
-- both are in grams, and the error propagates silently into every total, the
-- measured TDEE and the forecast. Same trap under raw vs cooked chicken (~30%
-- water loss) and dry vs boiled chana (~2.2x). So the basis travels with the
-- food rather than living in its name.
--
-- `carb_g_per_serving` and `fat_g_per_serving` are NULLABLE and null means
-- UNKNOWN, not zero. Every row that predates this migration has no macro split
-- and an Open Food Facts product routinely carries energy and nothing else;
-- defaulting them to 0 would render "0 g fat" where the honest answer is "not
-- known", which is the same class of lie as painting an unlogged day as zero.
-- ---------------------------------------------------------------------------

alter table public.diet_food
  add column if not exists carb_g_per_serving numeric(7, 2)
    check (carb_g_per_serving between 0 and 1000),
  add column if not exists fat_g_per_serving numeric(7, 2)
    check (fat_g_per_serving between 0 and 1000),
  add column if not exists weight_basis text
    check (weight_basis in ('dry', 'raw', 'cooked', 'as-served'));

comment on column public.diet_food.weight_basis is
  'What state the serving was weighed in: dry (rice, pulses), raw (chicken, fresh veg), cooked (curry, boiled chana), as-served. Getting this wrong on rice is a ~3x error that is invisible in every total.';

comment on column public.diet_food.carb_g_per_serving is
  'Carbohydrate per serving. NULL means unknown, never zero.';

comment on column public.diet_food.fat_g_per_serving is
  'Fat per serving. NULL means unknown, never zero.';

-- ---------------------------------------------------------------------------
-- diet_plan_day — one row per weekday, seven at most per user.
--
-- `meals` is `jsonb` rather than a second table of plan items. A plan day is
-- read and written as a WHOLE: the screen edits a day, "log today's plan" reads
-- a day, and applying a protein fix rewrites one meal of one day. Item rows
-- would buy per-item addressing nobody needs and cost an ordering column, a
-- cascade and a second set of four policies. The shape inside is validated by
-- `planDaySchema` in `lib/diet/plan.ts` on the way out, which is where a jsonb
-- column's type safety has to live regardless.
--
-- The four meal keys are checked here as well as in zod. A day missing `dinner`
-- would otherwise render as a day of three meals, and the arithmetic would be
-- quietly correct about a plan the user does not have.
-- ---------------------------------------------------------------------------

create table if not exists public.diet_plan_day (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Monday-first, lower case, matching `WEEK_DAYS` in `lib/diet/plan.ts`.
  day text not null check (day in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  meals jsonb not null default '{"breakfast":[],"lunch":[],"snack":[],"dinner":[]}'::jsonb,
  -- The user's own note for the day: "chicken day", "tofu, protein low".
  note text check (note is null or length(note) <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day),
  constraint diet_plan_day_meals_is_object check (jsonb_typeof(meals) = 'object'),
  constraint diet_plan_day_meals_has_slots check (
    jsonb_typeof(meals -> 'breakfast') = 'array'
    and jsonb_typeof(meals -> 'lunch') = 'array'
    and jsonb_typeof(meals -> 'snack') = 'array'
    and jsonb_typeof(meals -> 'dinner') = 'array'
  )
);

comment on table public.diet_plan_day is
  'The weekly meal plan, one row per weekday. A template that produces diet_entry rows; no analytic reads it.';

alter table public.diet_plan_day enable row level security;

create policy "diet_plan_day: owner reads" on public.diet_plan_day
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "diet_plan_day: owner inserts" on public.diet_plan_day
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "diet_plan_day: owner updates" on public.diet_plan_day
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "diet_plan_day: owner deletes" on public.diet_plan_day
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- Data API reachability. `anon` is deliberately absent — none of this is public.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.diet_plan_day to authenticated;
