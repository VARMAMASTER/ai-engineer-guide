# Unified app: design

**Status:** approved in outline, 2026-09-14. Supersedes nothing; extends
`2026-09-06-ai-engineer-guide-design.md`, which remains the authority for the
learning half.

**Goal:** turn the AI Engineer Practice Guide from a study tool into one daily
system — study, diet, training, and operations — with an advisory agent that
reads across all of them.

---

## 1. Why one app

`/today` is already the spine of the guide: one screen that answers "what am I
doing today?" Diet, training and todos are all today-shaped. An engineer holding
a 9-5 while preparing for interviews does not want four trackers; they want one
answer to "am I on track?"

That is also the argument for the agent. Four trackers side by side is a
folder. What makes this one product is a thing that reads study adherence
against calorie balance and says the true sentence none of the four would say
alone.

**And that is the ONLY thing that crosses an app boundary.** Decided
2026-09-14: the mini-apps are separate systems that happen to share a shell.
Diet does not import Train. Train does not read Diet's tables. No feature in one
app depends on another being present, and any of them could be deleted without
touching the rest. The AI is the sole integrator — see section 4.2, which is the
load-bearing section of this document.

## 2. What this costs — decided deliberately

The guide today has no backend, no database, no API keys and no accounts. That
is why it deploys anywhere, costs nothing, works offline, and is safe to hand to
a stranger. Every item below breaks at least one of those, and the owner chose
that trade knowingly on 2026-09-14.

| Feature | What it breaks |
|---|---|
| Diet | Needs a food database. Open Food Facts is keyless but is a *packaged goods* catalogue — it does not know home-cooked Indian food. |
| Cross-device data | Needs accounts and a server. |
| Reminders | Web push needs VAPID keys, a subscription store, and a scheduled sender. Local notifications only fire while a tab is open. |
| Agent | Needs an LLM key and server-side access to the user's data. |

**Multi-tenant was chosen over single-user.** Anyone may sign up and gets their
own diet, training and goals. This roughly triples the work and makes the owner
a data controller for other people's health data. Deletion and export are
therefore stage-0 obligations, not later features.

## 3. Data and isolation

**Supabase** — Postgres, auth and row-level security in one integration, chosen
after `vercel integration discover --category storage`. RLS is the reason:
the isolation policy lives *in the database*, so a forgotten `WHERE user_id = …`
in application code physically cannot return another person's weight log. With a
database and a separate auth provider, that safety depends on every query being
written correctly forever, which is not a property, it is a hope.

- Every personal table carries `user_id` with an RLS policy `user_id = auth.uid()`.
- Account deletion and data export ship in stage 0.
- Existing localStorage progress is imported on first sign-in; signed-out
  visitors keep the current localStorage behaviour and lose nothing.

**Offline changes shape.** The app is a PWA and the learning half is fully
offline. Private multi-user data plus offline editing means conflict resolution,
which is a large problem to take on for a marginal gain. Therefore: personal
writes are **online-first with an offline queue** (queued writes replay on
reconnect, last-write-wins per row, and the UI says a write is pending); the
learning half stays fully offline exactly as it is today.

## 4. Navigation

The nav was flat: 16 sections, 5 in the phone tab bar, 11 behind "More". At ~28
destinations that collapses and "More" becomes a junk drawer. Two levels:

**Bottom tab bar = five apps, permanently:** `Today · Learn · Diet · Train · Ops`.

**Sections live inside an app**, as a horizontal segmented control using the
`components/ui/Tabs` primitive — roving tabindex, arrow/Home/End keys, already
tested. All 15 study sections move under **Learn**. Settings lives off the top
bar. The agent gets **no tab**: its brief appears on Today, because an agent
behind a tab is a chatbot you must visit, and an agent on Today is a colleague
who tells you something.

**URLs do not change.** `/dsa` stays `/dsa`. The grouping is presentational —
the Learn tab is active when the pathname matches any learning section. Moving
15 routes under `/learn/*` would break every bookmark, the service worker's
cached pages and a 465-test suite for no user benefit. New mini-apps take
`/diet/*`, `/train/*`, `/ops/*`.

**Desktop** keeps the left rail, grouped by app with the current app expanded.

### 4.1 Command palette

Two-level nav costs a tap on the way to any section. The palette cancels it:
`Ctrl/Cmd+K`, type, land. The reference is Frappe's awesome bar — the reason a
platform with forty doctypes does not feel deep is that nobody navigates it.

It searches destinations *and* content: the ~700 indexed items across the DSA,
system-design, LLD, AI/ML, CS-fundamentals, hardware, reading, company and
behavioural banks. Ranking is explicit, not `includes()` over 700 strings.
Mini-app landing pages follow Frappe's workspace idea — shortcut cards, not an
empty list or a bare form.

### 4.2 Module boundaries — the AI is the only bridge

Each mini-app is a bounded context. It owns its routes, its components, its
logic and its own schema namespace, and it may not reach into another. This is
the architecture the owner asked for on 2026-09-14, and it is worth writing down
why it is also the right one: four independent apps can be built in parallel,
tested alone, broken alone, and deleted alone. Four entangled ones cannot, and
the entanglement never announces itself — it arrives as one convenient import.

**The rules.**

- `app/diet/**`, `app/train/**`, `app/ops/**` and the learning routes never
  import from one another. Neither do `lib/diet/**`, `lib/train/**`,
  `lib/ops/**`, `lib/learn/**`.
- No app queries another app's tables. Schema namespaces are per app.
- Everything shared goes to a common layer that knows about no app in
  particular: `components/ui/**`, `lib/db`, `lib/auth`, `app/globals.css`.
- Deleting any one app must leave the others building and passing.

**Enforced, not documented.** A boundary that lives only in a spec is a
boundary that lasts until the first deadline. ESLint `no-restricted-imports`
zones fail the build on a cross-app import, and `pnpm lint` already gates every
commit at 0 problems. The rule lands in stage 0, before there is anything to
violate it — adding it afterwards means first unpicking the violations.

**The two legitimate consumers of more than one app**, and only these:

1. **Today.** It shows a card per app. It does not reach into them; each app
   exports one narrow read-only summary — a title, a number, a status, a link —
   and Today renders whatever is present. An app that is not installed simply
   contributes no card. This is a plugin seam, not a dependency: the apps do not
   know Today exists, and Today does not know what any app contains.

2. **The agent.** It reads every app through those same read APIs — never by
   joining tables — and is the only place a cross-app sentence may be formed.

That second point is the whole product. The apps stay dumb and separate; the
intelligence is the connective tissue. It also means the agent's value is
testable in isolation: feed it fixture summaries from four apps and assert the
brief it writes.

## 5. The mini-apps

### 5.1 Diet

**Food logging is where diet trackers die** — at friction, not features. The
saving observation is that people eat 20–30 things on repeat. So: a personal
meal library and "log yesterday again" are the primary path; search is
secondary. Open Food Facts (keyless) covers packaged goods; the user's own
entries cover home cooking, because no API knows dal properly.

**Forecasting needs no ML.** Mifflin-St Jeor for BMR, an activity multiplier for
TDEE, ~7,700 kcal per kilogram, over a 14-day rolling average — the average is
what stops water weight reading as failure and making people quit. Muscle
projections use honest rates (0.25–0.5 kg/month for a trained lifter), because a
flattering curve is worse than no curve.

Tracked: weight, BMI, daily calories and protein against target, trend, forecast.

**Cut for now:** barcode scanning (camera permission plus weak Indian packaged
coverage — poor payoff early) and micronutrients (calories and protein are 90%
of the value).

#### 5.1.1 Eating window

Added 2026-09-14 at the owner's request: nothing before 12:00, nothing after
18:00, and the window configurable.

This is not a display preference — it makes the **timestamp of every entry
load-bearing**, which is why it is specified now rather than retrofitted. A log
row without a reliable local time cannot answer any question below, and
back-dating an entry at 23:00 for "yesterday lunch" must record the meal's time,
not the entry's.

- `eating_window` is per user: `{ start: "12:00", end: "18:00" }`, editable, and
  may be disabled entirely. Defaults to the owner's 12:00–18:00.
- Every entry stores a local timestamp and the resolved local date. Storing UTC
  alone is wrong here: an 18:30 meal is outside the window regardless of where
  the user was standing, and a day boundary in UTC would split an evening.
- An entry outside the window is **marked, never blocked or scolded**. A tracker
  that nags gets deleted. The mark is a fact, not a judgement.
- Derived per day: first entry, last entry, **eating span** (first → last) and
  **fasting span** (previous day's last → today's first). The fast is the number
  people actually care about and it crosses midnight, so it cannot be computed
  from a single day's rows.
- Adherence is the share of days whose entries all fell inside the window, over
  7 and 28 days.

A late meal that stays inside the calorie target is not a failure, and the UI
must not imply otherwise — window adherence and calorie adherence are reported
as two separate facts.

#### 5.1.2 Analytics

Diet analytics stay **inside Diet** (section 4.2). Anything that relates food to
training or to study is the agent's, not this section's.

**Weight trend — an exponentially weighted moving average, not a raw line.**
Daily weight swings by 1–2 kg on water alone, which reads as failure and is the
single most common reason people stop weighing. The EWMA (the Hacker's Diet
approach) responds faster than a simple 14-day mean while still absorbing the
noise. Both the raw points and the trend line are shown; the trend is what any
number elsewhere in the app is computed from.

**Measured TDEE, which beats the formula.** Mifflin-St Jeor is a population
estimate carrying roughly ±15% error for an individual — on 2,400 kcal that is
±360, enough to make a deficit imaginary. With two or more weeks of logged
intake and weights, actual expenditure can be solved for directly:

```
TDEE ≈ mean daily intake − (Δ trend weight in kg × 7700 ÷ days)
```

This is arithmetic over data already being collected, and it is honest in a way
the formula cannot be. Rules:

- Use the formula only until there are **14 days** of both intake and weight,
  then switch to measured and say plainly which is in use.
- Recompute over a rolling 14–28 day window so it tracks a changing metabolism.
- Widen to a range, not a point, when logging is patchy — and **say the logging
  is patchy** rather than quietly producing a confident wrong number. Under 70%
  of days logged, report a range and a warning.

**The rest, all deterministic:**

- Calories and protein against target: today, 7-day mean, 28-day mean.
- Adherence: share of days logged at all, and share inside the calorie target.
  The first matters more — an unlogged day is invisible, not zero.
- Weight forecast from the measured TDEE and the current deficit, **shown
  against the previous forecast** so the projection is scored rather than merely
  redrawn. A forecast that is never checked is decoration.
- Muscle projection at honest rates (0.25–0.5 kg/month trained), bounded and
  labelled as a ceiling rather than an expectation.
- Eating-window adherence and fasting span, per 5.1.1.

**What analytics must not do.** No correlation claims from this section. With
one person and a few weeks of data, "your weight drops on days you eat before
14:00" is overwhelmingly noise, and a health app that reports noise as insight
does real harm. Cross-domain pattern-finding is the agent's job, it is phrased
as observation rather than causation, and it stays silent below a stated minimum
of data.

**Charts** follow the project's visualisation conventions and must be legible in
both themes, readable at 390px, and never encode meaning in colour alone.

### 5.2 Train

A plan derived from goal, available days, equipment and injuries. Logs sets,
reps and load; progressive-overload suggestions come from rules over its own
history.

**It does not read Diet.** An earlier draft had training volume derived from
current calorie balance, which is sound sports science and the wrong
architecture — it welds the two apps together so neither can be built, tested or
removed alone. The relationship is real, so the agent observes it: it sees a
hard training week against a 600 kcal deficit and says so. The insight survives;
the dependency does not.

### 5.3 Ops

Todos, goals, scheduling, reminders. Reminders are the only piece needing
infrastructure beyond CRUD: web push, VAPID keys, a subscription store and a
scheduled sender.

### 5.4 Agent — advisory only, and the only integrator

**The plan being fixed is the product.** The owner's words were "strictly I will
follow." An agent that reschedules the week when two study days are missed is an
excuse machine with good manners. So it never edits a plan.

- **Deterministic rules compute the facts.** Weight stalls two weeks → cut 200
  kcal. That is arithmetic: testable, free, and right every time. Never spend a
  token where a formula works.
- **The LLM writes the synthesis** — the cross-domain sentence the rules cannot
  phrase. "You logged 3 of 5 DSA days, you are 400 kcal over, and your weight
  has been flat for 12 days; those three facts are the same fact."
- Proposals land in an inbox with Accept / Dismiss. Nothing auto-applies.
- Per-user rate limiting from day one: with open signup, LLM spend is someone
  else's to spend.

## 6. Staging

0. **Auth, database, migration.** Nothing visibly changes except that you can
   sign in and your existing progress follows you. Includes deletion and export.
   De-risks everything after it.
1. **Diet** — hardest and highest daily pull; proves the architecture.
2. **Ops** — cheapest, mostly local.
3. **Train** — only useful once diet data exists.
4. **Agent** — last, when there is something to coordinate.

Each stage gets its own spec and its own plan.

## 7. Constraints inherited from the guide

These bind every stage and are not renegotiated per mini-app:

- Three surface tiers only, and **at most two stacked blurred layers** — glass
  never contains glass.
- One breakpoint, `md:` (768px). `sm:` and `lg:` are removed from the Tailwind
  theme so a stray variant is a dead class, not a silent third ladder.
- Every text-on-surface pair clears 4.5:1 **measured against the composited
  surface** — the Panel over the busiest point of the Ground, not the flat
  ground. The two differ by enough to fail AA.
- Tap targets ≥44px, verified as real boxes in a browser, not as a class name.
- Every route ships a real `<h1>` in server HTML with JavaScript disabled.
- No colour is ever hardcoded; everything is a token in `app/globals.css`.
- Components come from `components/ui/`, and a new primitive is added there
  rather than open-coded in a feature. `/kit` is the gallery and the e2e fixture.
- **No cross-app import.** Enforced by ESLint zones, not by convention
  (section 4.2). The AI agent and Today's summary seam are the only things that
  see more than one app.

## 8. Open questions

- Which auth provider Supabase is configured with, and whether email/password is
  enough for v1 or OAuth is needed on day one.
- Whether the learning half's localStorage progress and the signed-in database
  copy can diverge, and which wins if they do. Current lean: on first sign-in,
  import local into the account and then treat the account as authoritative.
- Whether "anyone may sign up" means open registration or invite-only at first.
  Open registration with health data and an LLM budget is the riskier default.
