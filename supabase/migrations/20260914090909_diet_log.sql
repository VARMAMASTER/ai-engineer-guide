-- The Diet app's tables (spec sections 4.2, 5.1, 5.1.1, 5.1.2).
--
-- Diet owns its schema namespace and reads nobody else's. Every table here
-- follows the isolation convention set by `20260914083039_learn_progress.sql`:
--
--   * `user_id uuid not null references auth.users (id) on delete cascade`
--   * `user_id` LEFTMOST in the primary key, so the ownership predicate and the
--     cascade delete are both index-backed.
--   * RLS enabled with four policies, each `to authenticated` AND carrying an
--     ownership predicate — `to authenticated` alone is authentication without
--     authorization.
--   * the update policy carries BOTH `using` and `with check`, or a user can
--     hand a row to somebody else.
--   * explicit grants to `authenticated` only. Never `anon`.
--
-- The cascade IS account deletion. There is no cleanup code anywhere for these
-- tables, deliberately: deleting the auth user takes the diet history with it.
--
-- ---------------------------------------------------------------------------
-- WALL-CLOCK, NOT UTC — the one decision that shapes every column below.
--
-- `lib/diet/types.ts` argues it at length and the storage has to agree: an
-- 18:30 meal is outside a 12:00–18:00 eating window regardless of which
-- timezone the user was standing in, and a UTC day boundary splits an evening
-- in half. So a meal's time is `text` in `YYYY-MM-DDTHH:MM` form and its day is
-- a `date`, neither of which any client library can "helpfully" shift. The one
-- `timestamptz` on a meal row is `logged_at`, which is audit only and which no
-- analytic reads.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- diet_profile — one row per user: the Mifflin-St Jeor inputs, the targets and
-- the eating window. The scalar half of Diet.
-- ---------------------------------------------------------------------------

create table if not exists public.diet_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- Mifflin-St Jeor is defined with a sex term and has no validated form
  -- without one. These are nullable because a user may log food for weeks
  -- before ever filling the profile in, and a half-filled profile must not
  -- block logging — `lib/diet/energy.ts` simply reports `unavailable` instead.
  sex text check (sex in ('male', 'female')),
  age_years integer check (age_years between 13 and 120),
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  activity text check (
    activity in ('sedentary', 'light', 'moderate', 'active', 'very-active')
  ),
  goal text check (goal in ('lose', 'maintain', 'gain')),

  -- Targets. Either all three are set or none are: `dietTargetsSchema` takes
  -- them as one object, so a partial row would fail validation on read.
  target_kcal integer check (target_kcal between 500 and 10000),
  target_protein_g integer check (target_protein_g between 0 and 500),
  kcal_band integer not null default 150 check (kcal_band between 0 and 2000),

  -- The eating window, `HH:MM` local. `start` may be LATER than `end`: a
  -- 20:00–04:00 window is legal and crosses midnight, so there is deliberately
  -- no `check (window_start < window_end)` here.
  window_start text not null default '12:00' check (window_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  window_end text not null default '18:00' check (window_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- A disabled window marks nothing. It is not a window of zero length.
  window_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.diet_profile is
  'Per-user Diet scalars: the BMR inputs, the calorie/protein targets and the eating window.';

alter table public.diet_profile enable row level security;

create policy "diet_profile: owner reads" on public.diet_profile
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "diet_profile: owner inserts" on public.diet_profile
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "diet_profile: owner updates" on public.diet_profile
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "diet_profile: owner deletes" on public.diet_profile
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- diet_food — the personal food library.
--
-- This table is the product. Food logging dies at friction, and people eat
-- 20–30 things on repeat: the library is what turns the second dal of the week
-- into one tap. `last_used_at` and `use_count` exist so the list can be ordered
-- by what the user actually eats rather than alphabetically, which is the
-- difference between a library and a phone book.
--
-- Energy and protein are stored PER SERVING, already resolved. The library is
-- the place that knows whether a serving is 100 g or one roti.
-- ---------------------------------------------------------------------------

create table if not exists public.diet_food (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (length(name) between 1 and 200),
  serving_label text not null check (length(serving_label) between 1 and 60),
  serving_grams numeric(7, 1) check (serving_grams > 0 and serving_grams <= 5000),
  kcal_per_serving numeric(8, 2) not null check (kcal_per_serving between 0 and 10000),
  protein_g_per_serving numeric(7, 2) not null check (protein_g_per_serving between 0 and 1000),
  -- Where the row came from. `openfoodfacts` rows are the user's OWN copy of a
  -- keyless lookup, not a cache of somebody else's database: once saved it is
  -- theirs to edit, because no API knows dal properly.
  source text not null default 'custom' check (source in ('library', 'openfoodfacts', 'custom')),
  use_count integer not null default 0 check (use_count >= 0),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

comment on table public.diet_food is
  'The user''s own food library — the primary logging path. Energy and protein are per serving.';

create index if not exists diet_food_recent_idx
  on public.diet_food (user_id, last_used_at desc nulls last);

alter table public.diet_food enable row level security;

create policy "diet_food: owner reads" on public.diet_food
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "diet_food: owner inserts" on public.diet_food
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "diet_food: owner updates" on public.diet_food
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "diet_food: owner deletes" on public.diet_food
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- diet_entry — one logged meal or snack.
--
-- `kcal` and `protein_g` are resolved at log time and stored on the row rather
-- than recomputed from `food_id`. Correcting a library item must not silently
-- rewrite three weeks of history that a measured TDEE was solved from — which
-- is also why `food_id` carries NO foreign key to `diet_food`: deleting a food
-- must leave the meals you ate intact, and `name` is denormalised for the same
-- reason.
-- ---------------------------------------------------------------------------

create table if not exists public.diet_entry (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  food_id text,
  name text not null check (length(name) between 1 and 200),
  servings numeric(6, 2) not null default 1 check (servings > 0 and servings <= 100),
  kcal numeric(9, 2) not null check (kcal between 0 and 20000),
  protein_g numeric(8, 2) not null check (protein_g between 0 and 2000),
  -- The MEAL's local timestamp. Every analysis reads this one.
  at_local text not null check (at_local ~ '^\d{4}-\d{2}-\d{2}T([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- The meal's local date, authoritative for grouping. Back-dating an entry at
  -- 23:00 for yesterday's lunch stores yesterday here and 13:00 above.
  entry_date date not null,
  -- Audit only. Analytics must never read it.
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
  -- The date half of `at_local` must agree with `entry_date`, or a day could be
  -- summed from one and windowed from the other. That is NOT a check constraint
  -- here on purpose: every expression that compares the two has to convert a
  -- `date` to text or text to a `date`, and both conversions are STABLE rather
  -- than IMMUTABLE (they read DateStyle), which Postgres refuses in a check.
  -- It is enforced instead by `entryToRow` in `lib/diet/data.ts`, which derives
  -- `entry_date` from `at_local` rather than accepting both from the caller —
  -- so the two cannot disagree without a second writer.
);

comment on table public.diet_entry is
  'One logged meal or snack, at its own wall-clock time. Energy is resolved at log time, never recomputed.';

create index if not exists diet_entry_by_day_idx on public.diet_entry (user_id, entry_date desc);

alter table public.diet_entry enable row level security;

create policy "diet_entry: owner reads" on public.diet_entry
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "diet_entry: owner inserts" on public.diet_entry
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "diet_entry: owner updates" on public.diet_entry
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "diet_entry: owner deletes" on public.diet_entry
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- diet_weight — a reading off the scale.
--
-- Keyed by a client id rather than by date because several weigh-ins on one day
-- are normal and are AVERAGED (`lib/diet/trend.ts`): keying by date would make
-- the evening reading silently overwrite the morning one, and which of two
-- samples of the same noisy quantity you kept would depend on when you picked
-- up the scale.
-- ---------------------------------------------------------------------------

create table if not exists public.diet_weight (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  reading_date date not null,
  kg numeric(5, 2) not null check (kg between 20 and 500),
  at_local text check (at_local ~ '^\d{4}-\d{2}-\d{2}T([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

comment on table public.diet_weight is
  'Scale readings. Several a day are normal and are averaged before the EWMA trend sees them.';

create index if not exists diet_weight_by_day_idx on public.diet_weight (user_id, reading_date desc);

alter table public.diet_weight enable row level security;

create policy "diet_weight: owner reads" on public.diet_weight
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "diet_weight: owner inserts" on public.diet_weight
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "diet_weight: owner updates" on public.diet_weight
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "diet_weight: owner deletes" on public.diet_weight
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- diet_forecast — a kept forecast, so it can be scored later.
--
-- "A forecast that is never checked is decoration" (spec 5.1.2). A forecast
-- that is only ever rendered cannot be graded, so it is written down the day it
-- is made and compared against the trend that actually arrived.
--
-- `kg` is NULLABLE on purpose and is null for a range forecast built on a
-- low-confidence TDEE. The "no point estimate without confidence" rule that
-- `TdeeProvisional` enforces in the type system survives the round trip through
-- storage rather than being resolved to a flattering midpoint on the way in.
-- ---------------------------------------------------------------------------

create table if not exists public.diet_forecast (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  made_on date not null,
  for_date date not null,
  horizon_days integer not null check (horizon_days between 1 and 365),
  kg numeric(5, 2) check (kg between 20 and 500),
  low_kg numeric(5, 2) not null check (low_kg between 20 and 500),
  high_kg numeric(5, 2) not null check (high_kg between 20 and 500),
  basis text not null check (basis in ('measured', 'mifflin-st-jeor')),
  confidence text not null check (confidence in ('high', 'low', 'population-estimate')),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint diet_forecast_band_ordered check (low_kg <= high_kg),
  -- A range forecast has no point; a point forecast must have one. Enforced
  -- here as well as in the type system, because the honesty rule is worth more
  -- than one layer.
  constraint diet_forecast_point_iff_confident check ((confidence = 'low') = (kg is null))
);

comment on table public.diet_forecast is
  'Forecasts as made, kept so they can be scored against what happened. `kg` is null for a range forecast.';

create index if not exists diet_forecast_due_idx on public.diet_forecast (user_id, for_date);

alter table public.diet_forecast enable row level security;

create policy "diet_forecast: owner reads" on public.diet_forecast
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "diet_forecast: owner inserts" on public.diet_forecast
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "diet_forecast: owner updates" on public.diet_forecast
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "diet_forecast: owner deletes" on public.diet_forecast
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- Data API reachability.
--
-- Separate from RLS: RLS decides which ROWS are visible once a table can be
-- reached at all, and a table with no grant is simply invisible to PostgREST.
-- `anon` is deliberately absent — none of this is public.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.diet_profile to authenticated;
grant select, insert, update, delete on public.diet_food to authenticated;
grant select, insert, update, delete on public.diet_entry to authenticated;
grant select, insert, update, delete on public.diet_weight to authenticated;
grant select, insert, update, delete on public.diet_forecast to authenticated;
