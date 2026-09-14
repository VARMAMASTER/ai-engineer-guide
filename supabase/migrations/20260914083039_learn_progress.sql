-- Stage 0: the Learn app's tables, and the isolation policy that guards them.
--
-- Shape, and why it is not one JSONB blob per user. The localStorage record is
-- a blob, but a blob on the server makes every write a read-modify-write of the
-- whole six-month history: two tabs ticking two different problems means one of
-- them silently loses. One row per fact makes each write independent, makes the
-- first-sign-in import a set of `on conflict do nothing` upserts (so it is
-- idempotent by construction rather than by a flag alone), and makes "keep what
-- the account already knows" the natural conflict rule instead of a merge
-- function nobody can audit.
--
-- Every table here follows the convention the mini-app agents must follow:
--   * `user_id uuid not null references auth.users (id) on delete cascade`
--   * RLS enabled, with four policies, each `to authenticated` AND carrying an
--     ownership predicate — `to authenticated` alone is authentication without
--     authorization.
--   * the update policy carries BOTH `using` and `with check`, or a user can
--     reassign a row to somebody else.
--   * explicit grants to `authenticated` only. Never `anon`.
--   * `user_id` is the leftmost column of the primary key, so the ownership
--     predicate and the cascade delete are both index-backed.

-- ---------------------------------------------------------------------------
-- learn_profile — one row per user. The scalar half of the progress blob.
-- ---------------------------------------------------------------------------

create table if not exists public.learn_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Day 1 of the 180-day plan. Null until the user sets it.
  start_date date,
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  -- Set once, by the first-sign-in import, and never cleared. This is the
  -- idempotence gate: a second sign-in sees it non-null and skips the import
  -- rather than re-importing a local copy that is by then out of date.
  progress_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learn_profile is
  'Per-user scalars for the Learn app: plan start date, theme, and the first-sign-in import marker.';

alter table public.learn_profile enable row level security;

create policy "learn_profile: owner reads" on public.learn_profile
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "learn_profile: owner inserts own" on public.learn_profile
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "learn_profile: owner updates own" on public.learn_profile
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "learn_profile: owner deletes own" on public.learn_profile
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- learn_completion — "I practised this item, on this day".
-- ---------------------------------------------------------------------------

create table if not exists public.learn_completion (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  completed_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

comment on table public.learn_completion is
  'One row per completed content item. Mirrors the localStorage `completed` map.';

alter table public.learn_completion enable row level security;

create policy "learn_completion: owner reads" on public.learn_completion
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "learn_completion: owner inserts own" on public.learn_completion
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "learn_completion: owner updates own" on public.learn_completion
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "learn_completion: owner deletes own" on public.learn_completion
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- learn_revision — "I could say this out loud". A different claim from
-- completion, so a different table, exactly as lib/progress/types.ts argues.
-- ---------------------------------------------------------------------------

create table if not exists public.learn_revision (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  rating text not null check (rating in ('again', 'good')),
  rated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

comment on table public.learn_revision is
  'Revision confidence per card. Mirrors the localStorage `revision` map.';

alter table public.learn_revision enable row level security;

create policy "learn_revision: owner reads" on public.learn_revision
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "learn_revision: owner inserts own" on public.learn_revision
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "learn_revision: owner updates own" on public.learn_revision
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "learn_revision: owner deletes own" on public.learn_revision
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- learn_hours — hours studied per calendar day.
-- ---------------------------------------------------------------------------

create table if not exists public.learn_hours (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  hours numeric(4, 2) not null check (hours >= 0 and hours <= 24),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

comment on table public.learn_hours is
  'Hours studied per local calendar day. Mirrors the localStorage `hours` map.';

alter table public.learn_hours enable row level security;

create policy "learn_hours: owner reads" on public.learn_hours
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "learn_hours: owner inserts own" on public.learn_hours
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "learn_hours: owner updates own" on public.learn_hours
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "learn_hours: owner deletes own" on public.learn_hours
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- Data API reachability.
--
-- Separate from RLS: RLS decides which ROWS are visible once a table can be
-- reached at all, and a table with no grant is simply invisible to PostgREST.
-- `anon` is deliberately absent from every grant — nothing here is public.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.learn_profile to authenticated;
grant select, insert, update, delete on public.learn_completion to authenticated;
grant select, insert, update, delete on public.learn_revision to authenticated;
grant select, insert, update, delete on public.learn_hours to authenticated;
