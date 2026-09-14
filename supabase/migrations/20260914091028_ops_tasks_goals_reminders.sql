-- Ops: tasks, goals, and reminder rules.
--
-- The Ops mini-app is a bounded context (spec 2026-09-14, section 4.2), so it
-- owns its own `ops_` schema namespace and nothing here references another
-- app's tables. Every table follows the convention `learn_progress.sql`
-- established:
--   * `user_id uuid not null references auth.users (id) on delete cascade`
--   * `user_id` LEFTMOST in the primary key, so both the ownership predicate
--     and the cascade delete are index-backed.
--   * RLS on, four policies, each `to authenticated` AND carrying an ownership
--     predicate; the update policy carries BOTH `using` and `with check`.
--   * explicit grants to `authenticated` only. Never `anon`.
-- Account deletion needs no cleanup code: the cascade IS the deletion.
--
-- TWO COLUMNS THAT LOOK REDUNDANT AND ARE NOT.
--
-- `created_at timestamptz` is the row's own audit stamp. `created_on date` is
-- the DOMAIN field `Task.createdAt` — a LOCAL CALENDAR DATE, which is what
-- `lib/ops/priority.ts` breaks ties by. The whole of `lib/ops/**` is built on
-- the rule that once an instant has been reduced to `YYYY-MM-DD` in the
-- viewer's timezone it never meets a wall clock again (see `lib/ops/date.ts`),
-- so storing the domain date as a `timestamptz` and converting on read would
-- reintroduce exactly the drift that design removes. Same reasoning for
-- `completed_on`.
--
-- `due_time` is `text`, not `time`: the domain type is `HH:MM` local
-- wall-clock (`TimeSchema`), with no seconds, no zone and no date. A `time`
-- column would round-trip as `08:45:00` and invite a caller to parse it as an
-- instant. The regex check below is the same one `TimeSchema` enforces, so an
-- invalid value is rejected at both ends rather than trusted at one.

-- ---------------------------------------------------------------------------
-- ops_task — one row per todo. Recurrence rides along as JSONB.
--
-- Why JSONB for the rule and not five nullable columns: `RecurrenceRule` is a
-- DISCRIMINATED UNION (daily | everyNDays | weekly | monthlyByDayOfMonth |
-- monthlyByWeekday), and flattening a union into columns produces a table
-- where `n`, `weekdays`, `day`, `ordinal` and `weekday` are each meaningful for
-- exactly one variant and NULL noise for the other four — a shape no CHECK
-- constraint can keep honest without restating the union in SQL. The rule is
-- never queried by its parts; it is read whole and handed to
-- `nextOccurrence`. `parseRecurrenceRule` (zod) validates it on the way in and
-- on the way out, which is the boundary that actually holds.
-- ---------------------------------------------------------------------------

create table if not exists public.ops_task (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (length(title) between 1 and 200),
  notes text check (notes is null or length(notes) <= 2000),
  -- Local calendar date, never an instant.
  due_date date,
  -- Local `HH:MM`, mirroring TimeSchema in lib/ops/types.ts.
  due_time text check (due_time is null or due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  tags text[] not null default '{}',
  completed boolean not null default false,
  -- Local calendar date the task was actually completed.
  completed_on date,
  -- A RecurrenceRule, or null for a one-off task.
  recurrence jsonb,
  -- The DOMAIN `Task.createdAt`: a local calendar date, used only to break
  -- priority ties by age.
  created_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  -- The two refinements on TaskSchema, restated where the data actually lives.
  -- A zod refine protects the app; a CHECK protects the table from anything
  -- that ever reaches it another way.
  constraint ops_task_due_time_needs_date check (due_time is null or due_date is not null),
  constraint ops_task_completed_needs_date check (not completed or completed_on is not null)
);

comment on table public.ops_task is
  'Ops todos. One row per task; recurrence is a RecurrenceRule as JSONB. Dates are local calendar dates.';

-- "What is due" is the only query this table serves at any size, and it is
-- always scoped to one user. Partial on the incomplete rows because a finished
-- task is never due again — the index stays the size of the open list rather
-- than the size of the history.
create index if not exists ops_task_due_idx
  on public.ops_task (user_id, due_date)
  where not completed;

alter table public.ops_task enable row level security;

create policy "ops_task: owner reads" on public.ops_task
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "ops_task: owner inserts" on public.ops_task
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "ops_task: owner updates" on public.ops_task
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "ops_task: owner deletes" on public.ops_task
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- ops_goal — progress toward a target by a date.
--
-- `current_value`, not `current`: `CURRENT` is close enough to the SQL
-- `CURRENT_DATE`/`CURRENT_USER` family that an unquoted `current` is a reliable
-- source of confusion in hand-written SQL later. The mapper renames it, once.
--
-- `GoalSchema` says `current` is CUMULATIVE PROGRESS FROM ZERO at `startDate`,
-- never a raw measurement — a "lose 5kg" goal stores kilos lost, not weight.
-- That invariant is what lets `evaluateGoal` compute one pace for every goal
-- shape, so the `>= 0` check below is a real constraint, not a formality.
-- ---------------------------------------------------------------------------

create table if not exists public.ops_goal (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (length(title) between 1 and 200),
  target numeric not null check (target > 0),
  unit text not null check (length(unit) between 1 and 40),
  current_value numeric not null default 0 check (current_value >= 0),
  start_date date not null,
  deadline date not null,
  linked_task_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint ops_goal_window check (start_date <= deadline)
);

comment on table public.ops_goal is
  'Ops goals. `current_value` is cumulative progress from zero at start_date toward target — never a raw measurement.';

alter table public.ops_goal enable row level security;

create policy "ops_goal: owner reads" on public.ops_goal
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "ops_goal: owner inserts" on public.ops_goal
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "ops_goal: owner updates" on public.ops_goal
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "ops_goal: owner deletes" on public.ops_goal
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- ops_reminder — "tell me N minutes before this task is due".
--
-- RULES ONLY. There is no delivery here and none is implied: no subscription
-- store, no VAPID key, no send log. Web push is later-stage infrastructure
-- (spec section 5.3), and a half-built `sent_at` column would be a promise the
-- app cannot keep. `lib/ops/reminders.ts` decides what WOULD fire; the UI shows
-- that and says plainly that nothing is delivered yet.
--
-- The foreign key is COMPOSITE — (user_id, task_id) -> ops_task (user_id, id) —
-- rather than task_id alone. A single-column reference is not even expressible
-- here (the parent key is composite), and carrying user_id through it is what
-- makes it impossible to attach a reminder to somebody else's task: the FK
-- itself enforces that the row's owner owns the task, independently of RLS.
-- ---------------------------------------------------------------------------

create table if not exists public.ops_reminder (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  task_id text not null,
  -- Minutes BEFORE the task's due instant. 0 means "at the due time".
  offset_minutes integer not null check (offset_minutes >= 0 and offset_minutes <= 43200),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint ops_reminder_task_fk
    foreign key (user_id, task_id) references public.ops_task (user_id, id) on delete cascade
);

comment on table public.ops_reminder is
  'Ops reminder RULES. Decision logic only — there is no delivery mechanism and none is implied.';

-- Backs the composite FK above. An unindexed FK makes every parent delete a
-- sequential scan of this table, and deleting a task is an ordinary action.
create index if not exists ops_reminder_task_idx on public.ops_reminder (user_id, task_id);

alter table public.ops_reminder enable row level security;

create policy "ops_reminder: owner reads" on public.ops_reminder
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "ops_reminder: owner inserts" on public.ops_reminder
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "ops_reminder: owner updates" on public.ops_reminder
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "ops_reminder: owner deletes" on public.ops_reminder
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- Data API reachability. Separate from RLS: RLS decides which ROWS are visible
-- once a table can be reached at all, and a table with no grant is simply
-- invisible to PostgREST. `anon` is deliberately absent — nothing here is
-- public.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.ops_task to authenticated;
grant select, insert, update, delete on public.ops_goal to authenticated;
grant select, insert, update, delete on public.ops_reminder to authenticated;
