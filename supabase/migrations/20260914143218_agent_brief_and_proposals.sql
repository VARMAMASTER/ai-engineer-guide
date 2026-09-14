-- The advisory agent: one brief per day, and the proposals it left in the inbox.
--
-- The agent is the only module that reads across mini-apps (spec 4.2), but it
-- does so through `lib/summary`'s `AppSummary` seam — it never joins another
-- app's tables, and nothing here references one. These two tables hold the
-- agent's OWN state and nothing else: what it said, and what you decided about
-- what it said.
--
-- Conventions are the ones `learn_progress.sql` established and every mini-app
-- has followed since:
--   * `user_id uuid not null references auth.users (id) on delete cascade`
--   * `user_id` LEFTMOST in the primary key, so the ownership predicate and the
--     cascade delete are both index-backed.
--   * RLS on, four policies, each `to authenticated` AND carrying an ownership
--     predicate; the update policy carries BOTH `using` and `with check`.
--   * explicit grants to `authenticated` only. Never `anon`.
-- Account deletion needs no cleanup code: the cascade IS the deletion.

-- ---------------------------------------------------------------------------
-- agent_brief — one row per user per local day.
--
-- The primary key is (user_id, brief_date) and that is load-bearing twice over.
-- It makes a day's brief idempotent — regenerating overwrites rather than
-- accumulating — and it makes the row the natural home for the rate-limit
-- counters, because "briefs generated today" is exactly what one row per day
-- can count. There is no separate usage table for that reason.
--
-- `brief_date` is a LOCAL CALENDAR DATE supplied by the client, not derived
-- from the server clock: every mini-app here reduces instants to `YYYY-MM-DD`
-- in the viewer's timezone and never lets them meet a wall clock again, and a
-- brief filed under the server's idea of "today" would be a day out for half
-- the world. `generated_at` is the audit instant, and is a `timestamptz`
-- precisely because the cooldown is a real duration rather than a calendar
-- fact.
--
-- `payload` is JSONB rather than columns because a `Brief` is a discriminated
-- shape — observations, proposals, a synthesis that is usually absent, and a
-- failure reason that is only meaningful when it is — and flattening it would
-- produce a table of columns each meaningful for one status and NULL noise for
-- the rest. It is never queried by its parts; it is read whole, re-validated by
-- zod on the way out, and handed to a component.
-- ---------------------------------------------------------------------------

create table if not exists public.agent_brief (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The viewer's local calendar date, never an instant.
  brief_date date not null,
  -- A `Brief` (lib/agent/types.ts), validated by zod on read.
  payload jsonb not null,
  -- Rate limiting lives here: see lib/agent/rate-limit.ts.
  generation_count integer not null default 1 check (generation_count >= 0),
  -- The audit instant of the most recent generation. Drives the cooldown.
  generated_at timestamptz not null default now(),
  -- The gateway model that wrote the synthesis, or null when no token was spent.
  model text check (model is null or length(model) <= 200),
  created_at timestamptz not null default now(),
  primary key (user_id, brief_date)
);

comment on table public.agent_brief is
  'One advisory brief per user per local day, plus the per-user rate-limit counters for generating it.';

alter table public.agent_brief enable row level security;

create policy "agent_brief: owner reads" on public.agent_brief
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "agent_brief: owner inserts" on public.agent_brief
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "agent_brief: owner updates" on public.agent_brief
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "agent_brief: owner deletes" on public.agent_brief
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

grant select, insert, update, delete on public.agent_brief to authenticated;

-- ---------------------------------------------------------------------------
-- agent_proposal — the inbox. Accept / Dismiss, and nothing else happens.
--
-- This table is the whole of "advisory only". Accepting a proposal writes
-- `state = 'accepted'` HERE and touches no other table in the database: no
-- calorie target changes, no session moves, no task completes, and the 180-day
-- study plan is not reachable from this row at all. The owner's words were
-- "strictly I will follow", and an agent that could edit a plan when two study
-- days were missed would be an excuse machine with good manners.
--
-- `id` is `<brief_date>:<rule-id>`, so regenerating a day's brief re-proposes
-- the same rows — a proposal dismissed at breakfast stays dismissed — while
-- tomorrow's are genuinely new things to decide about. The `on conflict do
-- nothing` insert that relies on this is therefore idempotent by construction.
--
-- `decided_at` is nullable and stays null while `state = 'pending'`: the
-- decision instant is a fact about a decision, and a default of now() would
-- claim every unread proposal had been ruled on the moment it appeared.
-- ---------------------------------------------------------------------------

create table if not exists public.agent_proposal (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  -- The local date of the brief that raised it. Not a foreign key to
  -- agent_brief: a decision you made is yours to keep even if the brief that
  -- prompted it is later regenerated away.
  brief_date date not null,
  title text not null check (length(title) between 1 and 200),
  body text not null check (length(body) between 1 and 2000),
  -- App ids the proposal draws on, for display only.
  apps text[] not null default '{}',
  severity text not null default 'watch' check (severity in ('info', 'watch', 'act')),
  state text not null default 'pending' check (state in ('pending', 'accepted', 'dismissed')),
  -- Null until the person actually decides. See above.
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  -- A decided proposal has a decision time; a pending one does not. Keeps the
  -- two halves of "decided" from ever disagreeing.
  constraint agent_proposal_decided_at_matches_state
    check ((state = 'pending') = (decided_at is null))
);

comment on table public.agent_proposal is
  'The advisory inbox. Accepting or dismissing a proposal writes only to this table — no mini-app data is ever changed by the agent.';

-- The inbox is read as "this user's pending proposals, newest first", which is
-- a prefix of the primary key plus a filter, so it needs its own index.
create index if not exists agent_proposal_user_state_date_idx
  on public.agent_proposal (user_id, state, brief_date desc);

alter table public.agent_proposal enable row level security;

create policy "agent_proposal: owner reads" on public.agent_proposal
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "agent_proposal: owner inserts" on public.agent_proposal
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "agent_proposal: owner updates" on public.agent_proposal
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "agent_proposal: owner deletes" on public.agent_proposal
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

grant select, insert, update, delete on public.agent_proposal to authenticated;
