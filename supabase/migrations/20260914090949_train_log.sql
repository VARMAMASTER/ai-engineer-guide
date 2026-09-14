-- Stage 3: the Train app's tables.
--
-- Schema namespace `train_`, per spec section 4.2: Train owns these and nothing
-- else reads them. In particular there is no column here that refers to Diet —
-- the earlier draft derived training volume from calorie balance, which is
-- sound sports science and the wrong architecture. The agent observes that
-- relationship through `lib/summary`; the database does not encode it.
--
-- Shape, and why a set is a row rather than a JSONB array on the session.
-- A set is logged alone, in a gym, between other sets, on a phone that may
-- drop its connection mid-workout. One row per set makes each of those writes
-- independent: a failed insert loses that set and nothing else, and two devices
-- logging the same session cannot clobber each other's work. A JSONB array on
-- the session row would make every set a read-modify-write of the whole
-- session, which is exactly the case where the loss is silent.
--
-- The plan, by contrast, IS a JSONB document, deliberately. It is generated
-- whole by `generatePlan()`, replaced whole when regenerated, never edited a
-- field at a time, and never queried by its contents. Normalising it would buy
-- nothing and cost a join on every page load.
--
-- Every table follows the stage-0 convention:
--   * `user_id uuid not null references auth.users (id) on delete cascade`
--   * RLS enabled, four policies, each `to authenticated` AND carrying an
--     ownership predicate.
--   * the update policy carries BOTH `using` and `with check`.
--   * explicit grants to `authenticated` only. Never `anon`.
--   * `user_id` leftmost in the primary key, so the ownership predicate and the
--     cascade delete are both index-backed.
--
-- The cascade IS account deletion. There is no cleanup code anywhere for these
-- tables, and there must not be: deleting the auth user removes every row here.

-- ---------------------------------------------------------------------------
-- train_profile — one row per user: the training profile and its current plan.
-- ---------------------------------------------------------------------------

create table if not exists public.train_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goal text not null check (goal in ('strength', 'hypertrophy', 'general_fitness')),
  experience text not null check (experience in ('beginner', 'intermediate', 'advanced')),
  -- What the user ASKED for, not what the generator settled on. `generatePlan`
  -- clamps this into [2, 6] and records the clamp in the plan's notes; keeping
  -- the request lets the form show back what was typed instead of quietly
  -- rewriting it.
  available_days smallint not null check (available_days >= 0 and available_days <= 14),
  equipment text[] not null default '{}',
  injuries text[] not null default '{}',
  -- The generated plan, as produced by lib/train/plan.ts. Validated by
  -- `planSchema` on the way back in, so a hand-edited row cannot crash a page.
  plan jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.train_profile is
  'Per-user training profile (goal, experience, days, equipment, injuries) and the current generated plan.';

alter table public.train_profile enable row level security;

create policy "train_profile: owner reads" on public.train_profile
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "train_profile: owner inserts" on public.train_profile
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "train_profile: owner updates" on public.train_profile
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "train_profile: owner deletes" on public.train_profile
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- train_session — "I trained on this day". One row per workout.
-- ---------------------------------------------------------------------------

create table if not exists public.train_session (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Minted in the browser (crypto.randomUUID) so a set can be logged against a
  -- session in the same round trip that creates it.
  session_id text not null,
  -- LOCAL calendar date. A workout at 21:30 IST belongs to that evening, and a
  -- UTC day boundary would move it to the next day for the user and nobody
  -- else. Every analytic in lib/train/analytics.ts is written against this.
  session_date date not null,
  day_label text,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

comment on table public.train_session is
  'One workout. `session_date` is the LOCAL calendar date, which is what every weekly analytic is bucketed by.';

-- The read path is always "this user's sessions, newest first".
create index if not exists train_session_user_date_idx
  on public.train_session (user_id, session_date desc);

alter table public.train_session enable row level security;

create policy "train_session: owner reads" on public.train_session
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "train_session: owner inserts" on public.train_session
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "train_session: owner updates" on public.train_session
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "train_session: owner deletes" on public.train_session
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- train_set — one logged working set. The row the whole app exists to write.
-- ---------------------------------------------------------------------------

create table if not exists public.train_set (
  user_id uuid not null references auth.users (id) on delete cascade,
  set_id text not null,
  session_id text not null,
  exercise_id text not null,
  reps smallint not null check (reps > 0),
  -- Kilograms. 0 is valid and common — a bodyweight set is not a missing load,
  -- so this is `>= 0` rather than `> 0` and is NOT nullable.
  load_kg numeric(6, 2) not null check (load_kg >= 0),
  -- Rate of perceived exertion. Genuinely optional: plenty of logs skip it, and
  -- a defaulted RPE would be a fabricated observation.
  rpe numeric(3, 1) check (rpe is null or (rpe >= 1 and rpe <= 10)),
  performed_at timestamptz not null default now(),
  primary key (user_id, set_id),
  -- Scoped to the owner as well as the session, so the reference cannot be used
  -- to probe whether another user's session id exists.
  foreign key (user_id, session_id)
    references public.train_session (user_id, session_id) on delete cascade
);

comment on table public.train_set is
  'One logged set: exercise, reps, load in kg, optional RPE. Deleting its session deletes it.';

create index if not exists train_set_user_session_idx
  on public.train_set (user_id, session_id);

alter table public.train_set enable row level security;

create policy "train_set: owner reads" on public.train_set
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "train_set: owner inserts" on public.train_set
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "train_set: owner updates" on public.train_set
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "train_set: owner deletes" on public.train_set
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- Data API reachability. RLS decides which ROWS are visible once a table can be
-- reached at all; a table with no grant is invisible to PostgREST entirely.
-- `anon` is deliberately absent — none of this is public.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.train_profile to authenticated;
grant select, insert, update, delete on public.train_session to authenticated;
grant select, insert, update, delete on public.train_set to authenticated;
