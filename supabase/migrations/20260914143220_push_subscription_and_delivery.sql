-- Web push: where notifications are sent, and what has already been sent.
--
-- Two tables, because they answer two different questions and have two
-- different lifetimes. `push_subscription` is a DEVICE REGISTRY — it grows when
-- someone turns notifications on and shrinks when a push service says an
-- endpoint is gone. `push_delivery` is a LEDGER — append-only, pruned by age,
-- and the only reason the same reminder is never sent twice.
--
-- Both follow the convention `learn_progress.sql` set and `ops_*` repeated:
--   * `user_id uuid not null references auth.users (id) on delete cascade`
--   * `user_id` LEFTMOST in the primary key, so the ownership predicate and the
--     cascade delete are both index-backed.
--   * RLS on, four policies, each `to authenticated` AND carrying an ownership
--     predicate; the update policy carries BOTH `using` and `with check`.
--   * explicit grants to `authenticated` only. Never `anon`.
-- Account deletion needs no cleanup code: the cascade IS the deletion, and it
-- is what stops a deleted account's phone from still being pushed to.
--
-- THE ONE PLACE THAT BYPASSES RLS. The scheduled sender runs as no user — it is
-- woken by Vercel Cron, not by a request with a session — so it reads both
-- tables through `@/lib/db/admin`, whose service-role key ignores every policy
-- below. That is the single legitimate use in this feature and it is confined
-- to `app/api/push/send/`. Every user-facing route (`subscribe`, `unsubscribe`,
-- `test`) goes through the request-scoped client, so the policies here are what
-- actually keeps one account's devices out of another's reach.

-- ---------------------------------------------------------------------------
-- push_subscription — one row per device.
--
-- `endpoint` is the key rather than a surrogate id because it IS the identity:
-- the push service mints one per (browser profile, origin, application server
-- key), and re-subscribing on the same device returns the same string. Keying
-- on it makes "turn notifications on again" an upsert instead of a duplicate,
-- with no client-side bookkeeping to get wrong.
--
-- It is also a CAPABILITY — anyone holding the endpoint can ask the push
-- service to wake that device — which is why nothing grants `anon` and why no
-- surface ever renders it.
--
-- `timezone` IS THE COLUMN THAT MAKES REMINDERS CORRECT. Everything in
-- `lib/ops/**` is a local calendar date and a local `HH:MM`: "due at 18:00"
-- means 18:00 where the person is. The sender runs in a UTC region, so without
-- an IANA zone stored here it would judge every reminder against UTC and fire
-- at the wrong hour for everyone outside it — silently, and only for people who
-- are not in London. It is captured from `Intl` at subscribe time and refreshed
-- on every re-subscribe, so a move or a holiday corrects itself the next time
-- the toggle is touched. See `lib/push/time.ts` for how it is applied.
--
-- `updated_at` is not decoration either: a user with several devices may have
-- several zones on file, and the sender picks the most recently seen one, which
-- is the best available guess at where the person actually is right now.
-- ---------------------------------------------------------------------------

create table if not exists public.push_subscription (
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null check (endpoint like 'https://%' and length(endpoint) between 12 and 1000),
  -- The subscriber's public key: 65 raw bytes as base64url, so exactly 87 chars.
  p256dh text not null check (length(p256dh) = 87),
  -- The subscriber's auth secret: 16 raw bytes as base64url, so exactly 22.
  auth text not null check (length(auth) = 22),
  -- An IANA zone name, e.g. 'Asia/Kolkata'. Validated against the runtime's ICU
  -- data in `lib/push/time.ts`; Postgres has no portable check for this that
  -- does not pin the row to one server's tz database.
  timezone text not null default 'UTC' check (length(timezone) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

comment on table public.push_subscription is
  'Web push endpoints, one row per device. `timezone` is what makes a reminder fire at the local hour the user set.';

alter table public.push_subscription enable row level security;

create policy "push_subscription: owner reads" on public.push_subscription
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "push_subscription: owner inserts" on public.push_subscription
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "push_subscription: owner updates" on public.push_subscription
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "push_subscription: owner deletes" on public.push_subscription
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- push_delivery — the send log, and the thing that makes delivery idempotent.
--
-- THE PROBLEM IT SOLVES. A scheduled sender sends the same reminder twice for
-- at least four unrelated reasons: the cron fires while the previous run is
-- still going; the platform retries a run it believes timed out; the run is
-- late and the grace window therefore covers the same instant twice; or a
-- deploy overlaps a run. Nothing about "compute what is due and send it" is
-- naturally once-only, so once-only has to be written down.
--
-- HOW. `delivery_key` is `<reminder rule id>@<local YYYY-MM-DDTHH:MM it fires
-- at>` — see `deliveryKey` in `lib/push/schedule.ts`. The sender INSERTS that
-- row BEFORE it sends, and only sends if the insert actually created a row. The
-- primary key does the arbitration, inside Postgres, atomically: two runs
-- racing on the same reminder produce one winner and one no-op, with no
-- advisory lock, no queue and no coordination between regions.
--
-- Claim-before-send means a send that fails AFTER the claim is not retried —
-- the notification is lost rather than duplicated. That is the deliberate
-- direction to fail in: a missed reminder is a disappointment, two identical
-- notifications teach the user the app is broken and to stop trusting it.
-- `sent_at` and `outcome` record which of the two happened, so the failure is
-- visible in the table rather than only in a log line.
--
-- The instant is part of the key, not just the rule id, because a rule fires
-- repeatedly: recurring tasks spawn new occurrences, and rescheduling a task
-- legitimately moves its reminder. A new instant is a new notification; the
-- same instant is never sent again however many times it is computed.
-- ---------------------------------------------------------------------------

create table if not exists public.push_delivery (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- '<rule id>@<YYYY-MM-DDTHH:MM>'. Opaque to SQL; built by lib/push/schedule.ts.
  delivery_key text not null check (length(delivery_key) between 1 and 300),
  created_at timestamptz not null default now(),
  -- Set once the push has been attempted. Null means "claimed, never resolved",
  -- which is what a crash between the claim and the send looks like.
  sent_at timestamptz,
  -- 'sent' | 'failed' | 'no-subscription'. Text rather than an enum: the set is
  -- descriptive, nothing branches on it in SQL, and an enum makes adding a
  -- fourth outcome a migration.
  outcome text check (outcome is null or outcome in ('sent', 'failed', 'no-subscription')),
  primary key (user_id, delivery_key)
);

comment on table public.push_delivery is
  'One row per reminder instant that has been claimed for sending. The primary key is what makes delivery exactly-once.';

-- The sender prunes rows older than 30 days on each run, which is a range scan
-- over `created_at` across all users; the primary key cannot serve it.
create index if not exists push_delivery_created_idx on public.push_delivery (created_at);

alter table public.push_delivery enable row level security;

create policy "push_delivery: owner reads" on public.push_delivery
  for select to authenticated
  using ( (select auth.uid()) = user_id );

create policy "push_delivery: owner inserts" on public.push_delivery
  for insert to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "push_delivery: owner updates" on public.push_delivery
  for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "push_delivery: owner deletes" on public.push_delivery
  for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- Data API reachability. Separate from RLS: RLS decides which ROWS are visible
-- once a table can be reached at all, and a table with no grant is simply
-- invisible to PostgREST. `anon` is deliberately absent — an unauthenticated
-- caller has no business reading a table of device wake-up capabilities.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.push_subscription to authenticated;
grant select, insert, update, delete on public.push_delivery to authenticated;
