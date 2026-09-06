# AI Engineer Practice Guide

A 180-day, interview-first practice program for AI engineers, and a daily tracker that keeps you honest
about it. Six months, 26 weeks, one shipped project per month, and a DSA / system design / AI-ML rotation
that runs underneath all of it.

It is not a course and it does not teach. It is a **schedule with checkboxes**: it decides what you do
today, it counts what you have actually finished, and it tells you when you are behind.

## Who it is for

Someone with working engineering skill who wants an AI/ML engineering role at a company that runs a real
interview loop — coding, system design, ML depth, and a project you have to defend. It assumes you can
already write code and that the missing pieces are structure, breadth, and evidence.

If you are looking for tutorials, this is the wrong repository. Every item here is a thing to *do*, and the
guide only records whether you did it.

## What is in it

| Section | What it holds |
|---|---|
| **Today** | The current day's tasks, the streak, weekly hours by track, and the four month-1 meters |
| **Roadmap** | The six-month timeline; month 1 down to the day, months 2–6 to week-level targets |
| **DSA** | 150 problems in 18 NeetCode patterns, 75 core (Blind 75), filterable by company |
| **System Design** | 20 patterns in two groups, each question expanded into a six-step answer framework |
| **AI / ML** | 10 topics, each a list of questions you must be able to answer cold, without notes |
| **Projects** | 6 projects with milestones, acceptance criteria, and the defense questions for each |
| **Reading** | A curated list scheduled week by week, plus a live arXiv and Hacker News feed |
| **Settings** | Start date, export, import, reset |

## The weekly template

Every one of the 26 weeks runs the same shape. 22.5 hours, five weekday evenings and two weekend days.

| Day | Slot | Track | Content |
|---|---|---|---|
| Mon | 2.5h | DSA 60m + SD 90m | 2 problems; 1 system design pattern or question |
| Tue | 2.5h | DSA 60m + AI/ML 90m | 2 problems; 1 AI/ML sub-topic |
| Wed | 2.5h | DSA 60m + SD 90m | 2 problems; 1 system design pattern or question |
| Thu | 2.5h | DSA 60m + AI/ML 90m | 2 problems; 1 AI/ML sub-topic |
| Fri | 2.5h | DSA 60m + Reading 90m | 2 problems; 2 readings; 10-minute week review |
| Sat | 5h | Build | Milestone work |
| Sun | 5h | Build | Milestone work, milestone acceptance check |

Weekly totals: DSA 5h (10 problems), system design 3h, AI/ML 3h, reading 1.5h, build 10h — 22.5h, or 1350
minutes. Content validation rejects any week that falls outside 1290–1410 minutes, so the plan cannot drift.

Day 1 is always a Monday. The start-date picker only offers Mondays for that reason.

## The six-month sequence

| Month | Weeks | Build project | Study emphasis |
|---|---|---|---|
| 1 | 1–4 (+ days 29–30) | Production RAG with an eval harness | Metrics and classical ML, transformer overview, attention math, inference basics, RAG vs fine-tuning, evaluation |
| 2 | 5–8 | Advanced RAG: hybrid, reranking, query rewriting, semantic cache, guardrails, agentic retrieval | Embeddings and retrieval theory, ranking metrics, graphs (DSA), feature stores and serving (SD) |
| 3 | 9–13 | Graph RAG: entity and relation extraction, knowledge graph, community summaries, graph plus vector retrieval | Attention internals, LLM pretraining, 1-D DP, monitoring and experimentation. Start applying to tier-two companies. |
| 4 | 14–17 | Multi-agent system on a complex use case: tools, memory, human approval, evals, cost controls | Agents and safety, LLM serving, 2-D DP and greedy, agent platforms (SD) |
| 5 | 18–22 | GPT from scratch in PyTorch, then RoPE, RMSNorm, GQA, then KV cache, batching, streaming | Training dynamics, inference math, intervals and bit manipulation, LLM serving (SD) |
| 6 | 23–26 | Fine-tune and DPO a small model on month 4's agent data, then an interview sprint | Evaluation, alignment basics, mixed DSA review, mock loops for big tech |

Applying starts in month 3. Month 6 is the big-tech loop window.

Month 1 is authored day by day. Weeks 5–26 carry week-level targets, and each month is deepened to daily
detail when it arrives — a deliberate decision, not a gap.

## Your progress never leaves your browser

There is no account, no server, and no database. Everything you check off is written to `localStorage` under
the key `aeg.progress.v1`, on the device you checked it on.

```ts
{
  version: 1,
  startDate: string | null,          // ISO date, always a Monday
  completed: Record<string, string>, // content id -> ISO date completed
  hours: Record<string, number>,     // ISO date -> hours logged
  settings: { theme: 'dark' | 'light' | 'system' }
}
```

Consequences worth knowing before you start:

- **Nothing syncs.** A different browser, a different machine, or a private window is a different, empty guide.
- **Clearing site data erases it.** Use **Settings → Export progress** for a dated JSON file, and **Import**
  to restore it or to carry it to another machine. Import validates and migrates the file, and a bad file is
  rejected with a message rather than half-applied.
- **If a browser blocks storage**, the app keeps working in memory for the session and shows a banner saying
  so, so you know to export before closing the tab.

The only network calls the app ever makes are the two feed routes on the Reading page, and those talk to
arXiv and the Hacker News search API — never to us, because there is no us.

## Running it locally

Requires Node 20+ and pnpm (the repo pins its own version via `packageManager`, so Corepack will pick it up).

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

No environment variables are needed. The feed routes work unauthenticated, and every other page is static.

### Running every check

```bash
pnpm validate       # content integrity — ids, references, minute budgets, counts
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm test           # vitest, unit
pnpm test:e2e       # playwright, at 1280x800 and 390x844
pnpm build          # runs `pnpm validate` first, via prebuild
```

`pnpm test:e2e` builds the app and starts it on port 3000 by itself. The first run needs a browser:
`pnpm exec playwright install --with-deps chromium`.

The e2e suite never contacts a real feed — both feed routes are stubbed with `page.route` for success and for
failure — so it passes offline and in CI.

## Content model

All curriculum content is plain TypeScript in `content/`, exported as typed arrays and validated by zod
schemas in `lib/content/schema.ts`. Adding content means adding an object; see [CONTRIBUTING.md](CONTRIBUTING.md).

| File | Exports |
|---|---|
| `content/dsa.ts` | `dsaPatterns`, `dsaProblems` |
| `content/system-design.ts` | `sdPatterns`, `sdQuestions` |
| `content/ai-ml.ts` | `topics`, `topicQuestions` |
| `content/projects.ts` | `projects`, `milestones` |
| `content/readings.ts` | `readings` |
| `content/plan.ts` | `weeks`, `days` |

Shapes, in brief:

```ts
DsaPattern    { id, name, order, signals[], template, templateCpp?, pitfalls[] }
DsaProblem    { id, patternId, name, leetcodeNumber, url, difficulty, core, companies[], minutes }
SdPattern     { id, group: 'general'|'ml', name, order, solves, tradeoffs[] }
SdQuestion    { id, patternId, title, tier, companies[], steps{define,data,architecture,evaluate,deploy,wrapup}, minutes }
Topic         { id, name, order, summary }
TopicQuestion { id, topicId, text, minutes }
Project       { id, month, name, goal, architecture, constraints[], defense[] }
Milestone     { id, projectId, order, title, scope[], acceptance[], hours }
Reading       { id, weekId, kind: 'paper'|'post'|'api', title, source, year, url, why, minutes }
Week          { id, number, month, theme, targets[] }
Day           { id, number, weekId, kind, tasks: DayTask[] }
DayTask       { refId, taskId?, track, minutes, note? }
```

`Doc` items — the seven defense documents per project — are generated by the loader, not authored.

### Id conventions

Ids are stable, kebab-case, and carry a type prefix. Route params are the id with the prefix stripped:
`dsap-arrays-hashing` is served at `/dsa/arrays-hashing`.

```
dsap-<slug>                   dsap-arrays-hashing        DSA pattern
dsa-<leetcode#>-<slug>        dsa-217-contains-duplicate DSA problem
sdp-<slug>                    sdp-caching                system design pattern
sdq-<slug>                    sdq-url-shortener          system design question
mlp-<slug>                    mlp-retrieval-ranking      ML system design pattern
mlq-<slug>                    mlq-design-youtube-recs    ML system design question
topic-<slug>                  topic-transformers
q-<topic>-<slug>              q-transformers-why-scale-by-sqrt-d
proj-<slug>                   proj-rag
ms-<proj>-<n>                 ms-rag-1
doc-<proj>-<name>             doc-rag-architecture       generated
read-<slug>                   read-rag-2020
day-<nn>                      day-01 … day-30
week-<nn>                     week-01 … week-26
```

**The id is the completion key.** Checking an item anywhere — Today, a DSA pattern page, the Reading tab —
writes the same id into the same map, which is why one click moves every meter that counts it. A day task
may override its key with `taskId` when the same content id has to be checkable more than once (a build
session spanning two weekend days, a weekly review that repeats). Keys must be unique across the whole plan,
and validation enforces it.

## Validation

`scripts/validate-content.ts` runs in `prebuild` and in CI, and fails the build on any of:

- a duplicated id anywhere across the collections;
- a `DayTask.refId`, `Milestone.projectId`, or `Reading.weekId` that does not resolve;
- a day with no tasks;
- a week (days 1–28) whose planned minutes fall outside 1290–1410;
- a weekday without exactly 2 DSA tasks, or a weekend day not summing to exactly 300 minutes;
- a completion key used by more than one day task;
- a DSA problem without a `https://leetcode.com/problems/<slug>/` URL;
- a project without exactly 4 milestones;
- a DSA bank that is not exactly 150 problems with exactly 75 core.

## Tests

- **Unit (Vitest, `tests/unit/`)** — validation rules with both passing and failing fixtures, content-bank
  counts and invariants, plan integrity, the progress store including DST-adjacent streaks and version
  migration, both feed parsers, every page component from an empty and a populated store, and a palette
  contrast sweep.
- **End-to-end (Playwright, `tests/e2e/`)** — one file per area, run at 1280x800 and 390x844: onboarding,
  persistence, export/import, cross-page identity, all 13 routes, navigation, DSA filters, the system design
  framework, the reading feeds, theming, responsive integrity, unknown routes, and an axe accessibility pass.

Two of those deserve a note. `cross-page.spec.ts` is the one that matters most: it proves a problem checked on
a DSA pattern page is the same item Today marks done and the same item the month-1 meter counts, which is the
behaviour most likely to break without anything looking broken. And `theme.spec.ts` measures contrast from
**screenshot pixels**, not from CSS variables — an earlier palette-only test passed while the page rendered
white.

## Stack

Next.js (App Router) and React Server Components, TypeScript, Tailwind CSS v4, zustand with `persist`, zod,
Vitest, Playwright, pnpm. Deployed on Vercel; the only server code is the two feed route handlers.

## Design spec

The full specification — architecture, every page, the whole curriculum, the progress model, the testing
plan, and the visual direction — is at
[`docs/superpowers/specs/2026-09-06-ai-engineer-guide-design.md`](docs/superpowers/specs/2026-09-06-ai-engineer-guide-design.md).
It is the binding document; when this README and the spec disagree, the spec wins.

## Licence

MIT. See [LICENSE](LICENSE).
