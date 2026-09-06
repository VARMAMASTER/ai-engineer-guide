# AI Engineer Practice Guide — Design Spec

Date: 2026-09-06
Status: approved in brainstorming, awaiting user review of this document
Repo name: `ai-engineer-guide`
Site title: AI Engineer Practice Guide

## 1. Purpose

A public, open-source web app that is simultaneously:

1. A personal daily tracker for one engineer following a six-month plan to move from a startup Lead AI Engineer role (about 2.5 years of experience, LLM-apps-on-APIs background, 9-5 job) into a big tech AI/ML role at the L3/L4 (Google), E3/E4 (Meta), or SDE-2 (Amazon) level.
2. A practice guide anyone can fork or follow: pattern-organized DSA and system design question banks, an AI/ML study track, an LLM-centered build track, a curated reading list, and a live feed of new papers and model releases.

The owner has about 22.5 focused hours per week: 2.5 hours on each weekday and 5 hours on each weekend day. Every schedule in this spec is sized to that budget.

## 2. Scope

### In scope for version 1

- Eight pages: Today, Roadmap, DSA, System Design, AI/ML, Projects, Reading, Settings.
- A six-month roadmap with month-level themes and week-level targets for all 26 weeks.
- A fully specified 30-day plan for month 1 with day-level tasks.
- DSA bank: the NeetCode 150, with Blind 75 items flagged as core and company tags where sources name a problem repeatedly.
- System design bank: 40 general questions (tiers 1 and 2 of the most reported FAANG questions plus 5 AI infrastructure questions) mapped to 10 general patterns, and 25 ML/LLM questions mapped to 10 ML patterns. Every question page carries the six-step ML system design framework.
- AI/ML study bank: 10 topics, about 120 interview questions total.
- Projects bank: 6 build projects, one per month, each with milestones, acceptance criteria, and interview defense questions. Month 1 is fully detailed.
- Reading bank: curated papers and API launches pinned to weeks.
- Live feed: arXiv and Hacker News, via two keyless cached route handlers.
- Progress: per-browser localStorage with JSON export and import.
- Mobile-responsive layout: every page usable on a phone, with Today designed mobile-first.
- Build-time content validation.
- Unit tests, feed-parser tests, and one browser smoke test.
- Public MIT repo on GitHub, deployed on Vercel from `main`, preview deploys on pull requests.

### Out of scope for version 1

Accounts, cross-device sync, in-app content editing, notifications, comments, mobile apps, internationalization, analytics.

## 3. Architecture and stack

- Next.js (App Router) with TypeScript. React Server Components render the static content; small client components handle progress state.
- Tailwind CSS for styling.
- zustand with the `persist` middleware for the progress store.
- zod for schemas: content schemas, the progress blob, and feed payloads.
- Vitest for unit tests. Playwright for the smoke test.
- pnpm as the package manager.
- Hosting on Vercel. The only server code is the two feed route handlers.

### Routes

```
/                       redirects to /today
/today
/roadmap
/dsa
/dsa/[patternId]
/system-design
/system-design/[patternId]
/ai-ml
/ai-ml/[topicId]
/projects
/projects/[projectId]
/reading
/settings
/api/feed/arxiv         GET, cached 6h
/api/feed/hn            GET, cached 6h
```

### Folder layout

```
app/                    routes and layouts
components/             UI components (shell, cards, checkboxes, progress bars, timeline)
content/                the curriculum as typed TS modules (see section 5)
lib/
  content/              loaders, indexes, validation
  progress/             zustand store, derived selectors, export/import, migrations
  feed/                 arXiv and HN fetchers and parsers
scripts/
  validate-content.ts   run in `prebuild`; fails the build on any integrity error
tests/
  unit/                 Vitest
  e2e/                  Playwright
docs/superpowers/specs/ this spec and later specs
docs/superpowers/plans/ implementation plans
```

## 4. Pages and UX

### Shell

Left sidebar with the eight sections. Top bar with: current day number (for example "Day 12 of 180"), streak in days, and hours completed this week versus 22.5. Dark-first palette, high contrast, dense but readable, monospace accents for ids and numbers. The look should read as a serious engineering tool, not a to-do app. Visual direction is finalized during implementation with the frontend-design skill.

Responsive behavior:
- Breakpoint at 768px. Above it, the sidebar is a fixed left column. Below it, the sidebar collapses into a bottom tab bar with the five most-used sections (Today, Roadmap, DSA, System Design, Projects) and a "More" tab that opens AI/ML, Reading, and Settings.
- The top bar shrinks to day number and streak on small screens; the weekly hours meter moves into the Today page.
- Question and problem tables become stacked cards below 768px: name and difficulty on one line, tags and checkbox on the next. No table may cause horizontal page scroll. Any content that must stay tabular scrolls inside its own container.
- Tap targets are at least 44px. Checkboxes are hit-tested on the whole row.
- Today is designed mobile-first: it is the page the owner opens on a phone at the start of a session.

### Today

Landing page. Shows:

- Day number since the start date, and the week number.
- Today's tasks pulled from the 30-day plan (or, after day 30, the current week's targets), each with a checkbox and the estimated minutes.
- Streak counter: consecutive calendar days with at least one completed item.
- Weekly progress bar: completed hours versus planned hours for the current week, split by track (DSA, study, build).
- The four month-1 completion checks as small meters: problems solved out of 40, system design patterns covered out of 8, RAG milestones done out of 4, defense docs written out of 7.
- Before a start date is set, the page shows a setup card that links to Settings.

### Roadmap

Vertical timeline of six months. Each month shows its theme, build project, and study emphasis. Month 1 expands into weeks 1 to 4 plus days 29 and 30, each week expandable to its daily tasks. Months 2 to 6 expand to weekly target lines only. Completed items show as done; the current day is highlighted.

### DSA

Grid of 18 pattern cards (the NeetCode 150 categories). Each card shows pattern name, problem count, core count, and completion. Filters: All, Core (Blind 75), and company chips (Google, Meta, Amazon) that filter to problems tagged with that company.

Pattern page: recognition signals (when to reach for this pattern), the code template in Python, the common pitfalls, then the problem table: name, LeetCode number linked to the LeetCode problem URL, difficulty, core badge, company tags, checkbox.

### System Design

Two groups of pattern cards: General (10) and ML/LLM (10). Pattern page: what the pattern solves, key trade-offs, then its questions. Each question expands to: the six-step framework as headings (Define the problem, Data pipeline, Model or storage architecture, Train and evaluate or capacity and consistency, Deploy and monitor, Wrap up) with two or three prompts under each, plus a checkbox. For general patterns, steps two through four read as "Data model", "Core components", "Scale and consistency" instead of the ML wording.

### AI/ML

Ten topic cards. Topic page: a short "what you must be able to explain" summary, then the question list with checkboxes. A question is checked when the user can answer it cold without notes; the page says this explicitly.

### Projects

Six project cards in month order. Project page: the goal, the architecture sketch as a text diagram, the stack constraints, the milestones with acceptance criteria and checkboxes, and the defense questions the user must be able to answer after finishing. Month 1 is fully detailed; months 2 to 6 have four milestones each at one-line depth.

### Reading

Two tabs. Curated: readings grouped by week, each with title, authors or source, year, link, one-line "why this week", and a checkbox. Live: two columns, arXiv and Hacker News, each item with title, date, link, and source; a "last refreshed" stamp; an empty state if a feed fails.

### Settings

- Start date picker. Day 1 must be a Monday; the picker offers the most recent Monday and the next Monday and explains why.
- Export progress: downloads `ai-engineer-guide-progress-YYYY-MM-DD.json`.
- Import progress: file input; validates with zod, migrates versions, shows a clear error on failure without changing state.
- Reset progress: confirmation dialog, then clears the blob.

## 5. Content model

All curriculum content lives in `content/` as TypeScript modules exporting typed arrays. Ids are stable kebab-case strings with a type prefix. Contributors add content by adding an object and opening a pull request.

### Id conventions

Route params are the id with its type prefix stripped: `dsap-arrays-hashing` is served at `/dsa/arrays-hashing`, `sdp-caching` at `/system-design/caching`, `topic-transformers` at `/ai-ml/transformers`, `proj-rag` at `/projects/rag`.

```
dsap-<slug>                   dsap-arrays-hashing      (dsa pattern)
dsa-<leetcode#>-<slug>        dsa-217-contains-duplicate
sdp-<slug>                    sdp-caching              (system design pattern)
sdq-<slug>                    sdq-url-shortener        (system design question)
mlp-<slug>                    mlp-retrieval-ranking    (ML system design pattern)
mlq-<slug>                    mlq-design-youtube-recs  (ML system design question)
topic-<slug>                  topic-transformers
q-<topic>-<slug>              q-transformers-why-scale-by-sqrt-d
proj-<slug>                   proj-rag
ms-<proj>-<n>                 ms-rag-1
read-<slug>                   read-rag-2020
day-<nn>                      day-01 … day-30
week-<nn>                     week-01 … week-26
```

### Schemas (zod, in `lib/content/schema.ts`)

```ts
DsaPattern { id, name, order, signals: string[], template: string, templateCpp?: string,
             pitfalls: string[] }
DsaProblem { id, patternId, name, leetcodeNumber, url, difficulty: 'easy'|'medium'|'hard',
             core: boolean, companies: ('google'|'meta'|'amazon')[], minutes: number }

SdPattern  { id, group: 'general'|'ml', name, order, solves: string, tradeoffs: string[] }
SdQuestion { id, patternId, title, tier: 1|2|'ml'|'ai', companies: string[],
             steps: { define: string[], data: string[], architecture: string[],
                      evaluate: string[], deploy: string[], wrapup: string[] }, minutes }

Topic      { id, name, order, summary: string }
TopicQuestion { id, topicId, text: string, minutes }

Project    { id, month: 1..6, name, goal, architecture: string, constraints: string[],
             defense: string[] }
Milestone  { id, projectId, order, title, scope: string[], acceptance: string[], hours: number }

Reading    { id, weekId, kind: 'paper'|'post'|'api', title, source, year, url, why: string, minutes }

Week       { id, number: 1..26, month: 1..6, theme, targets: string[] }
Day        { id, number: 1..30, weekId, kind: 'weekday'|'weekend'|'special',
             tasks: DayTask[] }
DayTask    { refId: string, taskId?: string,
             track: 'dsa'|'study-sd'|'study-ml'|'reading'|'build'|'review',
             minutes: number, note?: string }
Doc        { id, projectId, name, order }   // generated, not hand-authored
```

`DayTask.taskId` overrides the completion key. The key for a task is `taskId ?? refId`. It exists because a 10-hour milestone spans two weekend days and a weekly review repeats each week: those tasks reference the same content id but must be checkable independently. Build session tasks always set `taskId` to `<dayId>-build`; repeated review tasks set `taskId` to `<dayId>-<reviewId>`. Completion keys must be unique across the whole day plan.

`Doc` items are generated by the content loader, not authored: every project gets seven defense documents with ids `doc-<projectSlug>-<name>` for problem, architecture, ml, tradeoffs, scaling, failures, interview-questions. They render as a checklist on the project page and drive the month-1 documents meter.

`DayTask.minutes` is required and is the planned slot time for that task on that day. It is the number the weekly-hours validation sums and the number the Today page shows. The `minutes` on referenced items (problems, questions, readings) are display hints for the bank pages only and are never summed into the plan.

`DayTask.refId` must resolve to a `DsaProblem`, `SdQuestion`, `SdPattern`, `TopicQuestion`, `Topic`, `Milestone`, `Doc`, or `Reading`, or be one of the fixed review ids `review-week`, `review-mock`, `review-retro`, `review-publish`.

Monday and Wednesday study tasks reference the system design **pattern** id, with that day's questions named in `note`. This is what the month-1 "patterns covered" meter counts.

Checking an item anywhere (Today, DSA page, Reading tab) writes the same id into the progress map, so completion is shared across pages.

## 6. Curriculum content

### 6.1 Six-month roadmap

| Month | Weeks | Build project | Study emphasis |
|---|---|---|---|
| 1 | 1–4 (+ days 29–30) | Production RAG with an eval harness | Metrics and classical ML, transformer overview, attention math, inference basics, RAG vs fine-tuning, evaluation |
| 2 | 5–8 | Advanced RAG: hybrid, reranking, query rewriting, semantic cache, guardrails, agentic retrieval | Embeddings and retrieval theory, ranking metrics, graphs (DSA), feature stores and serving (SD) |
| 3 | 9–13 | Graph RAG: entity and relation extraction, knowledge graph, community summaries, graph plus vector retrieval | Attention internals, LLM pretraining, 1-D DP, monitoring and experimentation. Start applying to tier-two companies. |
| 4 | 14–17 | Multi-agent system on a complex use case: tools, memory, human approval, evals, cost controls | Agents and safety, LLM serving, 2-D DP and greedy, agent platforms (SD) |
| 5 | 18–22 | GPT from scratch in PyTorch, then RoPE, RMSNorm, GQA, then KV cache, batching, streaming on the same model | Training dynamics, inference math, intervals and bit manipulation, LLM serving (SD) |
| 6 | 23–26 | Fine-tune and DPO a small model on month 4's agent data, then an interview sprint | Evaluation, alignment basics, mixed DSA review, mock loops for big tech |

Applying starts in month 3. Month 6 is the big tech loop window.

### 6.2 Weekly template (all 26 weeks)

| Day | Slot | Track | Content |
|---|---|---|---|
| Mon | 2.5h | DSA 60m + SD 90m | 2 problems; 1 system design pattern or question |
| Tue | 2.5h | DSA 60m + AI/ML 90m | 2 problems; 1 AI/ML sub-topic |
| Wed | 2.5h | DSA 60m + SD 90m | 2 problems; 1 system design pattern or question |
| Thu | 2.5h | DSA 60m + AI/ML 90m | 2 problems; 1 AI/ML sub-topic |
| Fri | 2.5h | DSA 60m + Reading 90m | 2 problems; 2 readings; 10-minute week review |
| Sat | 5h | Build | Milestone work |
| Sun | 5h | Build | Milestone work, milestone acceptance check |

Weekly totals: DSA 5h (10 problems), SD 3h, AI/ML 3h, reading 1.5h, build 10h. Sum 22.5h (1350 minutes). Validation allows 1290 to 1410 minutes.

Exact per-day minute budgets, which the validation script enforces:

| Day | Tasks |
|---|---|
| Mon, Wed | 2 DSA at 30 + 1 system design pattern at 90 |
| Tue, Thu | 2 DSA at 30 + 1 AI/ML topic at 90 |
| Fri | 2 DSA at 30 + 2 readings at 40 + 1 `review-week` at 10 |
| Sat | 1 build session at 300, `taskId` = `<dayId>-build` |
| Sun | 1 build session at 290 (`taskId` = `<dayId>-build`) + 1 milestone acceptance at 10 |

Week 1 Friday is the one exception: 2 readings at 25 plus 3 API skims at 10 plus `review-week` at 10, which also sums to 90.

### 6.3 The 30-day plan (month 1)

Day 1 is a Monday. Days 1–28 follow the weekly template. Days 29 and 30 are special.

#### Week 1 (days 1–7): Arrays, two pointers. Gateways and caching. Metrics and classical ML. RAG skeleton.

DSA (10): dsa-217-contains-duplicate, dsa-242-valid-anagram, dsa-1-two-sum, dsa-49-group-anagrams, dsa-347-top-k-frequent-elements, dsa-271-encode-and-decode-strings, dsa-238-product-of-array-except-self, dsa-128-longest-consecutive-sequence, dsa-125-valid-palindrome, dsa-15-3sum.

SD (Mon, Wed): sdp-load-balancing-gateways with sdq-api-gateway and sdq-url-shortener; sdp-caching with sdq-simple-cache and sdq-distributed-cache.

AI/ML (Tue, Thu): topic-statistics-metrics (precision, recall, F1, ROC-AUC, PR-AUC, calibration, confidence intervals, cost of errors); topic-classical-ml (logistic regression, trees, boosting, imbalance, leakage, regularization, cross-validation).

Reading (Fri): read-rag-2020 (Lewis et al., Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks, 2020); read-anthropic-contextual-retrieval (Anthropic, Introducing Contextual Retrieval, 2024). API skim: read-api-claude-fable-5-1, read-api-gpt-6-astra, read-api-gemini-3-8-flash (release notes, 10 minutes each, folded into the 90-minute slot).

Build (Sat, Sun): ms-rag-1.

#### Week 2 (days 8–14): Sliding window, stack. Databases, sharding. Embeddings, transformer overview. Hybrid retrieval and reranking.

DSA (10): dsa-121-best-time-to-buy-and-sell-stock, dsa-3-longest-substring-without-repeating-characters, dsa-424-longest-repeating-character-replacement, dsa-567-permutation-in-string, dsa-76-minimum-window-substring, dsa-20-valid-parentheses, dsa-155-min-stack, dsa-150-evaluate-reverse-polish-notation, dsa-22-generate-parentheses, dsa-739-daily-temperatures.

SD: sdp-database-choice-indexing with sdq-key-value-store; sdp-sharding-replication with sdq-pastebin and sdq-file-storage.

AI/ML: topic-embeddings (dense vectors, cosine similarity, MTEB, chunk-to-vector, bi-encoder vs cross-encoder); topic-transformers at block level (tokens, embeddings, positional encoding, attention, MLP, residual, norm, LM head).

Reading: read-lost-in-the-middle (Liu et al., 2023); read-bert-reranking (Nogueira and Cho, Passage Re-ranking with BERT, 2019).

Build: ms-rag-2.

#### Week 3 (days 15–21): Binary search, linked list. Queues, rate limiting. Attention math, inference basics. Eval harness, query rewriting, cache.

DSA (10): dsa-704-binary-search, dsa-74-search-a-2d-matrix, dsa-875-koko-eating-bananas, dsa-153-find-minimum-in-rotated-sorted-array, dsa-33-search-in-rotated-sorted-array, dsa-206-reverse-linked-list, dsa-21-merge-two-sorted-lists, dsa-143-reorder-list, dsa-19-remove-nth-node-from-end-of-list, dsa-141-linked-list-cycle.

SD: sdp-message-queues with sdq-notification-service and sdq-distributed-message-queue; sdp-rate-limiting with sdq-rate-limiter.

AI/ML: topic-transformers attention math (Q, K, V, scaling by sqrt d, causal mask, multi-head, parameter count); topic-inference basics (prefill vs decode, KV cache size, why decode is memory-bound, batching).

Reading: read-ragas (Es et al., RAGAS: Automated Evaluation of Retrieval Augmented Generation, 2023); read-seven-failure-points (Barnett et al., Seven Failure Points When Engineering a RAG System, 2024).

Build: ms-rag-3.

#### Week 4 (days 22–28): Trees. ML patterns: retrieval and ranking, RAG systems. RAG vs fine-tuning, evaluation. Guardrails, observability, deploy, docs.

DSA (10): dsa-226-invert-binary-tree, dsa-104-maximum-depth-of-binary-tree, dsa-543-diameter-of-binary-tree, dsa-110-balanced-binary-tree, dsa-100-same-tree, dsa-572-subtree-of-another-tree, dsa-235-lowest-common-ancestor-of-a-bst, dsa-102-binary-tree-level-order-traversal, dsa-98-validate-binary-search-tree, dsa-230-kth-smallest-element-in-a-bst.

SD: mlp-retrieval-ranking with mlq-design-recommendation-system and mlq-design-instagram-explore; mlp-rag-systems with mlq-design-enterprise-rag-search and mlq-design-chatgpt.

AI/ML: topic-fine-tuning (RAG vs SFT vs prompting decision framework, LoRA basics); topic-evaluation (retrieval metrics Recall@k, MRR, NDCG; LLM-as-judge; faithfulness; human eval; leakage in eval sets).

Reading: read-prompt-injection (Greshake et al., Not What You've Signed Up For, 2023); read-self-rag (Asai et al., Self-RAG, 2023).

Build: ms-rag-4.

#### Days 29–30 (special)

Day 29: review-mock. A self-run mock loop, 2.5 hours: one timed medium from a pattern already covered, one system design question from the month drawn at random, ten AI/ML questions answered aloud and self-graded.
Day 30: review-retro and review-publish. Retrospective against the four month-1 checks, publish the RAG project write-up and the seven defense documents, set month 2 start.

#### Month 1 completion checks

- 40 DSA problems solved.
- 8 system design patterns covered (6 general, 2 ML).
- 4 RAG milestones accepted and the system live at a public URL with an eval report.
- 7 defense documents written: problem, architecture, ml, tradeoffs, scaling, failures, interview-questions.

The four meters count, respectively: completed ids with the `dsa-` prefix that appear in days 1–28; completed ids with the `sdp-` or `mlp-` prefix that appear in days 1–28; completed ids with the `ms-rag-` prefix; completed ids with the `doc-rag-` prefix.

### 6.4 Weeks 5–26 targets (week-level)

Each week lists 10 DSA problems (by pattern), 2 SD items, 2 AI/ML sub-topics, 2 readings, 1 milestone. Pattern order continues: week 5 trees (remaining 5 hard/medium) and heap; weeks 6–7 graphs; week 8 advanced graphs; weeks 9–10 backtracking and tries; weeks 11–13 1-D DP; weeks 14–16 2-D DP; week 17 greedy; weeks 18–19 intervals and math; week 20 bit manipulation; weeks 21–26 mixed review by company tag. SD patterns continue in the order of section 6.6, two per week, finishing all 20 by week 14, then question drills. AI/ML topics continue in the order of section 6.7. Readings continue from section 6.9. Milestones are the four per project in section 6.8.

The exact per-week item lists for weeks 5–26 are authored in `content/weeks.ts` during implementation following these rules; they are not enumerated here because they are mechanical and the validation script guarantees hour totals and reference integrity.

### 6.4b Code language policy

Amended 2026-09-06 at the user's request. **Python is primary and required.** Every pattern template,
solution, and code example is written in Python first, and Python alone is sufficient.

**C++ is optional and additive**, present only where it teaches something Python hides: bit-level work,
tight inner loops where Python's abstractions obscure the cost, and advanced graph or DP algorithms where
the competitive-programming idiom is the thing being learned. `DsaPattern.templateCpp` is where it lives.
It never replaces the Python template and never appears alone. A pattern with no such need has no C++ at all.

Expected C++ coverage: `dsap-bit-manipulation`, `dsap-advanced-graphs`, `dsap-dp-2d`, `dsap-heap`,
`dsap-tries`. The other thirteen patterns are Python-only unless a specific case argues otherwise.

Rendering: the pattern page shows Python by default with a "C++" toggle appearing only when
`templateCpp` exists. System design and AI/ML code examples are Python, with no C++ variant.

### 6.5 DSA bank

Source of truth: NeetCode 150 (18 categories). `core: true` for the Blind 75 subset. Company tags only where a 2026 source named the problem for that company. Pattern-level company emphasis is shown on the DSA index page as a note: Meta about 40 percent arrays and strings with heavy two pointers and sliding window and little DP; Google about 35 percent graphs with the most hards and frequent DP and topological sort; Amazon about 30 percent trees with BFS shortest path, intervals, and LRU cache, mostly mediums.

Patterns in study order with problems (LeetCode number, difficulty, core):

**Arrays & Hashing**: 217 Contains Duplicate E core; 242 Valid Anagram E core; 1 Two Sum E core [amazon]; 49 Group Anagrams M core; 347 Top K Frequent Elements M core [amazon]; 271 Encode and Decode Strings M core; 238 Product of Array Except Self M core [amazon]; 36 Valid Sudoku M; 128 Longest Consecutive Sequence M core.

**Two Pointers**: 125 Valid Palindrome E core; 167 Two Sum II M; 15 3Sum M core; 11 Container With Most Water M core; 42 Trapping Rain Water H [amazon].

**Sliding Window**: 121 Best Time to Buy and Sell Stock E core; 3 Longest Substring Without Repeating Characters M core [amazon]; 424 Longest Repeating Character Replacement M core; 567 Permutation in String M; 76 Minimum Window Substring H core [amazon]; 239 Sliding Window Maximum H [amazon].

**Stack**: 20 Valid Parentheses E core; 155 Min Stack M; 150 Evaluate Reverse Polish Notation M; 22 Generate Parentheses M; 739 Daily Temperatures M; 853 Car Fleet M; 84 Largest Rectangle in Histogram H.

**Binary Search**: 704 Binary Search E; 74 Search a 2D Matrix M; 875 Koko Eating Bananas M; 153 Find Minimum in Rotated Sorted Array M core; 33 Search in Rotated Sorted Array M core; 981 Time Based Key-Value Store M; 4 Median of Two Sorted Arrays H.

**Linked List**: 206 Reverse Linked List E core; 21 Merge Two Sorted Lists E core; 143 Reorder List M core [amazon]; 19 Remove Nth Node From End of List M core; 138 Copy List With Random Pointer M; 2 Add Two Numbers M; 141 Linked List Cycle E core; 287 Find the Duplicate Number M; 146 LRU Cache M [amazon]; 23 Merge K Sorted Lists H core; 25 Reverse Nodes in K-Group H.

**Trees**: 226 Invert Binary Tree E core; 104 Maximum Depth of Binary Tree E core; 543 Diameter of Binary Tree E; 110 Balanced Binary Tree E; 100 Same Tree E core; 572 Subtree of Another Tree E core; 235 Lowest Common Ancestor of a BST M core; 102 Binary Tree Level Order Traversal M core [amazon]; 199 Binary Tree Right Side View M; 1448 Count Good Nodes in Binary Tree M; 98 Validate Binary Search Tree M core; 230 Kth Smallest Element in a BST M core; 105 Construct Binary Tree from Preorder and Inorder Traversal M core; 124 Binary Tree Maximum Path Sum H core; 297 Serialize and Deserialize Binary Tree H core [google, amazon].

**Heap / Priority Queue**: 703 Kth Largest Element in a Stream E; 1046 Last Stone Weight E; 973 K Closest Points to Origin M; 215 Kth Largest Element in an Array M [amazon]; 621 Task Scheduler M; 355 Design Twitter M; 295 Find Median from Data Stream H core [amazon].

**Backtracking**: 78 Subsets M; 39 Combination Sum M core; 40 Combination Sum II M; 46 Permutations M; 90 Subsets II M; 79 Word Search M core; 131 Palindrome Partitioning M; 17 Letter Combinations of a Phone Number M; 51 N-Queens H.

**Tries**: 208 Implement Trie M core; 211 Design Add and Search Words Data Structure M core; 212 Word Search II H core [amazon].

**Graphs**: 200 Number of Islands M core [google, meta, amazon]; 695 Max Area of Island M; 133 Clone Graph M core [meta, amazon]; 286 Walls and Gates M; 994 Rotting Oranges M [amazon]; 417 Pacific Atlantic Water Flow M core; 130 Surrounded Regions M; 207 Course Schedule M core [google, amazon]; 210 Course Schedule II M; 261 Graph Valid Tree M core; 323 Number of Connected Components in an Undirected Graph M core; 684 Redundant Connection M; 127 Word Ladder H [google, amazon].

**Advanced Graphs**: 332 Reconstruct Itinerary H; 1584 Min Cost to Connect All Points M; 743 Network Delay Time M; 778 Swim in Rising Water H; 269 Alien Dictionary H core [google, amazon]; 787 Cheapest Flights Within K Stops M.

**1-D Dynamic Programming**: 70 Climbing Stairs E core; 746 Min Cost Climbing Stairs E; 198 House Robber M core; 213 House Robber II M core; 5 Longest Palindromic Substring M core; 647 Palindromic Substrings M core; 91 Decode Ways M core [amazon]; 322 Coin Change M core [google]; 152 Maximum Product Subarray M core; 139 Word Break M core; 300 Longest Increasing Subsequence M core [amazon]; 416 Partition Equal Subset Sum M.

**2-D Dynamic Programming**: 62 Unique Paths M core; 1143 Longest Common Subsequence M core; 309 Best Time to Buy and Sell Stock with Cooldown M; 518 Coin Change II M; 494 Target Sum M; 97 Interleaving String M; 329 Longest Increasing Path in a Matrix H; 115 Distinct Subsequences H; 72 Edit Distance M [amazon]; 312 Burst Balloons H [amazon]; 10 Regular Expression Matching H [amazon].

**Greedy**: 53 Maximum Subarray M core; 55 Jump Game M core [amazon]; 45 Jump Game II M; 134 Gas Station M; 1296 Hand of Straights M; 1899 Merge Triplets to Form Target Triplet M; 763 Partition Labels M; 678 Valid Parenthesis String M.

**Intervals**: 57 Insert Interval M core; 56 Merge Intervals M core [amazon]; 435 Non-overlapping Intervals M core; 252 Meeting Rooms E core; 253 Meeting Rooms II M core; 1851 Minimum Interval to Include Each Query H.

**Math & Geometry**: 48 Rotate Image M core; 54 Spiral Matrix M core; 73 Set Matrix Zeroes M core; 202 Happy Number E; 66 Plus One E; 50 Pow(x, n) M; 43 Multiply Strings M; 2013 Detect Squares M.

**Bit Manipulation**: 136 Single Number E; 191 Number of 1 Bits E core; 338 Counting Bits E core; 190 Reverse Bits E core; 268 Missing Number E core; 371 Sum of Two Integers M core; 7 Reverse Integer M.

Blind 75 membership follows the NeetCode roadmap's Blind 75 flag. Problem `minutes` defaults: easy 20, medium 30, hard 45.

### 6.6 System design bank

Ten general patterns, in study order, each with its questions (tier from the 50-question FAANG list; `ai` for the added AI infrastructure questions):

1. **sdp-load-balancing-gateways**: sdq-api-gateway (2, Amazon, Google); sdq-url-shortener (1, Amazon, Google, Meta); sdq-login-authentication (1, Amazon, Google, Apple).
2. **sdp-caching**: sdq-simple-cache (1, Google, Meta); sdq-distributed-cache (2, Amazon, Google); sdq-typeahead-search (2, Google, Meta).
3. **sdp-database-choice-indexing**: sdq-key-value-store (1, Amazon, Google); sdq-leaderboard (1, Amazon, Meta); sdq-hotel-booking (2, Amazon, Apple).
4. **sdp-sharding-replication**: sdq-pastebin (1, Amazon, Meta); sdq-file-storage (1, Meta, Amazon); sdq-content-management-system (1, Meta, Amazon).
5. **sdp-consistency-tradeoffs**: sdq-digital-wallet (2, Apple, Amazon); sdq-flight-booking (2, Amazon, Apple); sdq-collaborative-document-editor (2, Google).
6. **sdp-message-queues**: sdq-notification-service (1, Amazon, Meta); sdq-distributed-message-queue (2, Amazon, Google); sdq-job-scheduler (1, Amazon, Google).
7. **sdp-rate-limiting**: sdq-rate-limiter (1, Amazon, Google); sdq-web-crawler (1, Google, Amazon).
8. **sdp-cdn-object-storage**: sdq-video-streaming (1, Google, Meta, Netflix); sdq-live-video-streaming (2, Amazon, Meta); sdq-text-search-system (1, Google, Amazon).
9. **sdp-observability**: sdq-metrics-monitoring (2, Google, Amazon); sdq-code-deployment-cicd (2, Google, Amazon).
10. **sdp-idempotency-retries**: sdq-e-commerce-platform (2, Amazon); sdq-ride-sharing (2, Amazon, Meta, Uber); sdq-chat-application (2, Meta, Apple); sdq-social-media-feed (2, Meta, Google); sdq-google-maps (2, Google, Apple); sdq-parking-lot (1, Amazon, Apple).

AI infrastructure questions (tier `ai`), attached to the ML patterns below: sdq-chatgpt-style-chat, sdq-enterprise-rag-search, sdq-llm-serving-platform, sdq-ai-coding-assistant, sdq-agent-safeguards.

Ten ML/LLM patterns, in study order, with questions:

1. **mlp-retrieval-ranking**: mlq-design-recommendation-system (Netflix, Amazon, Meta); mlq-design-instagram-explore; mlq-design-netflix-top-picks; mlq-design-product-ranking-amazon.
2. **mlp-feature-stores**: mlq-design-feature-pipeline-latency-budget; mlq-design-personalized-news-ranking.
3. **mlp-model-serving-batching**: mlq-design-llm-query-system; sdq-llm-serving-platform.
4. **mlp-training-pipelines-registries**: mlq-design-fraud-detection-stripe (Amazon, Meta); mlq-design-spam-detection-pinterest.
5. **mlp-monitoring-drift**: mlq-design-ml-monitoring-system; mlq-design-monitoring-tiktok.
6. **mlp-experimentation**: mlq-design-ads-ranking-evaluation-framework (Meta); mlq-design-ab-test-for-ranking-model.
7. **mlp-feedback-loops**: mlq-design-comment-moderation-system; mlq-design-fake-news-detection.
8. **mlp-llm-serving**: sdq-chatgpt-style-chat; sdq-ai-coding-assistant.
9. **mlp-rag-systems**: sdq-enterprise-rag-search; mlq-design-customer-support-chatbot; mlq-design-podcast-search-engine.
10. **mlp-agent-platforms**: sdq-agent-safeguards; mlq-design-customer-support-agent-observability.

Every question carries the six-step framework with prompts. Default `minutes`: 45 for tier 1, 60 for tier 2, ml, and ai.

### 6.7 AI/ML study bank

Ten topics in study order. Each lists the questions that must be answerable cold. Default `minutes` 10 per question.

1. **topic-statistics-metrics**: Why not accuracy under class imbalance? Precision vs recall and when each matters. F1 vs F-beta. ROC-AUC vs PR-AUC and when PR-AUC is the right choice. What is calibration and how do you measure it? How do you pick a decision threshold? How do you put a confidence interval on a metric? What is a p-value and what is it not? How do you size an A/B test? What is a novelty effect? What is interference between arms? Why did offline gains not show up online?
2. **topic-classical-ml**: Logistic regression from the loss up. Why trees split on information gain or Gini. Random forest vs gradient boosting. What XGBoost adds. Bias-variance trade-off. L1 vs L2 regularization. Cross-validation and its leakage traps. Data leakage: definition, examples, prevention. Handling class imbalance: resampling, weighting, thresholding. Feature engineering for tabular data. k-means and PCA in two sentences each. When to use a linear model over a neural network.
3. **topic-deep-learning**: Backpropagation in words. SGD vs Adam vs AdamW. Learning rate warmup and cosine decay. BatchNorm vs LayerNorm. Dropout. Residual connections and why depth needs them. Vanishing and exploding gradients. Gradient clipping. Mixed precision: FP16, BF16, loss scaling. CNN vs RNN vs attention in one line each. Overfitting signals in a training curve. How to debug a model that will not train.
4. **topic-embeddings**: What an embedding is. Cosine vs dot product vs Euclidean. Bi-encoder vs cross-encoder. How contrastive training produces embeddings. MTEB and its limits. Chunking's effect on retrieval quality. ANN indexes: HNSW and IVF in one paragraph. Recall vs latency trade-off in ANN. Sparse (BM25) vs dense retrieval and why hybrid wins. Hard negatives. Dimensionality vs quality vs cost.
5. **topic-transformers**: Tokenization and BPE. Why attention: the problem it solves. Q, K, V and what each is. Why scale by sqrt d. Causal masking. Multi-head attention and what heads learn. Positional encoding, learned vs sinusoidal vs RoPE. Residual plus norm ordering, pre-norm vs post-norm. LayerNorm vs RMSNorm. MLP block and GELU vs SwiGLU. MHA vs MQA vs GQA. Mixture of experts in two paragraphs. Counting parameters of a transformer. Memory needed to hold a model in BF16.
6. **topic-llm-pretraining**: Next-token prediction and cross-entropy. Perplexity. Scaling laws and Chinchilla. Data mixture and deduplication. Why AdamW and what weight decay does. Training instabilities and fixes. Learning rate schedules at scale. Data parallel vs FSDP vs tensor vs pipeline parallelism, one paragraph each. What all-reduce does. Gradient checkpointing. Estimating training FLOPs as 6ND. Why a 70B model does not fit on one GPU.
7. **topic-fine-tuning**: SFT and instruction tuning. LoRA and why it works. QLoRA. Full fine-tune vs LoRA trade-offs. Catastrophic forgetting. RLHF pipeline: reward model then PPO. DPO and why it replaced PPO for many teams. Preference data quality. RAG vs fine-tuning vs prompting: a decision framework. When fine-tuning hurts. Synthetic data for SFT. Evaluating a fine-tune beyond loss.
8. **topic-inference**: Autoregressive decoding. Prefill vs decode. KV cache: what it stores and its size formula. Why decode is memory-bandwidth bound. Static vs continuous batching. PagedAttention. FlashAttention in one paragraph. Quantization: FP16, BF16, INT8, INT4, and what each costs in quality. Speculative decoding. Throughput vs latency vs cost per token. Sizing a serving fleet for N concurrent users. Streaming and time to first token.
9. **topic-rag-evaluation**: Chunking strategies and overlap. Hybrid retrieval and reciprocal rank fusion. Reranking. Query rewriting, HyDE, multi-query. Context window budgeting and Lost in the Middle. Citations and attribution. Retrieval metrics: Recall@k, MRR, NDCG. Generation metrics: faithfulness, relevance, LLM-as-judge and its biases. Building a gold eval set. Why RAG hallucinates and the fix for each cause. Semantic caching. Prompt injection through retrieved content.
10. **topic-agents-safety**: Tool use and function calling. ReAct loop. Planning vs reactive agents. Memory: short-term, long-term, episodic. Multi-agent orchestration patterns: chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer. Human-in-the-loop approvals. Agent evaluation: task success, cost, steps, safety. Guardrails: input, output, action-level. Prompt injection and jailbreak defenses. Cost controls: budgets, caching, model routing. Observability: traces, spans, token accounting. Failure modes: loops, tool misuse, over-permissioning.

### 6.8 Projects bank

**proj-rag (month 1): Production RAG with an eval harness.**
Goal: a question-answering system over a real corpus of at least 500 documents, with hybrid retrieval, reranking, cited answers, a reusable evaluation harness, guardrails, observability, and a public deployment.
Architecture: ingestion → chunking → BM25 index and vector index → hybrid retrieval with reciprocal rank fusion → cross-encoder reranker → context builder → LLM → cited answer; side modules for eval harness, semantic cache, guardrails, tracing.
Constraints: Python; any LLM API; any vector store; must expose an HTTP API and a minimal UI; must be deployable on Vercel or a comparable free tier; no framework may hide retrieval, fusion, or reranking. Those three are implemented by hand.
Milestones:
- ms-rag-1 (10h): corpus selected and ingested; fixed-size and semantic chunking implemented and compared; BM25 and vector indexes built; a gold eval set of 50 questions with reference answers and source spans committed. Acceptance: CLI answers a query with top-k from both indexes; eval set file exists and is versioned.
- ms-rag-2 (10h): hybrid retrieval with reciprocal rank fusion; cross-encoder reranker; generation with inline citations; baseline eval report with Recall@5, MRR, and judge-scored faithfulness. Acceptance: eval report v1 committed with numbers.
- ms-rag-3 (10h): eval harness extracted as a module with retrieval metrics and LLM-as-judge for faithfulness and relevance; query rewriting (multi-query or HyDE); semantic cache; ablation table toggling each component. Acceptance: ablation report committed.
- ms-rag-4 (10h): prompt-injection detection on retrieved content and output filters; per-request traces with latency, tokens, and cost; API and UI deployed to a public URL; seven defense documents written. Acceptance: public URL live; docs in the repo.
Defense questions: Why hybrid over dense alone? How did you choose chunk size and what did the eval say? Why is your RAG hallucinating and how did you find out? What does the reranker cost you in latency and what did it buy? How do you evaluate retrieval separately from generation? How would this scale to 1M documents? How do you defend against injected instructions in a retrieved document? RAG vs fine-tuning for this corpus: defend your choice.

**proj-advanced-rag (month 2)**: agentic and adaptive retrieval on top of month 1. Milestones: adaptive retrieval decisions (retrieve or not, how many hops); parent-document and hierarchical chunking; metadata filtering and structured plus unstructured routing; hardened guardrails and a red-team eval set. Defense: when does retrieval hurt; how do you decide hop count; how do you evaluate agentic retrieval; how do you cap cost.

**proj-graph-rag (month 3)**: knowledge-graph RAG. Milestones: entity and relation extraction pipeline with quality checks; graph construction and community detection with summaries; graph plus vector hybrid retrieval; comparative eval against month 2 on global and local questions. Defense: where graph RAG beats vector RAG and where it loses; extraction error propagation; cost of graph build; freshness.

**proj-agents (month 4)**: multi-agent system on a complex use case chosen by the user in week 13 (default: an operations agent that triages incoming requests, gathers context from tools, drafts actions, and requires human approval for irreversible ones). Milestones: tool layer with typed schemas and permissions; planner plus workers with memory; human approval flow and audit log; eval suite for task success, cost, steps, and safety, plus cost controls and model routing. Defense: how do you stop loops; how do you evaluate an agent; what is the blast radius of a bad tool call; how do you route between models.

**proj-gpt-from-scratch (month 5)**: GPT in PyTorch, then inference. Milestones: tokenizer, embeddings, attention, blocks, LM head, training loop on a small corpus with loss curves; swap in RoPE, RMSNorm, GQA and measure; KV cache and batched generation; streaming server with throughput and latency measurements. Defense: parameter count; memory in BF16; why sqrt d; KV cache size; why decode is memory-bound; what continuous batching changes.

**proj-fine-tune-eval (month 6)**: SFT then DPO on month 4's agent traces. Milestones: dataset curation and quality filters; LoRA SFT with eval before and after; preference data and DPO; eval report comparing prompting, RAG, SFT, and DPO on the same task. Defense: when did fine-tuning hurt; how did you detect forgetting; DPO vs RLHF; how do you know the eval is not leaked.

### 6.9 Reading bank

Month 1 readings are enumerated in section 6.3. The remaining curated set, assigned two per week from week 5 onward in this order:

Papers and posts: Microsoft GraphRAG (Edge et al., 2024); MTEB (Muennighoff et al., 2022); Introduction to Information Retrieval, chapters on BM25 and evaluation (Manning, Raghavan, Schütze); ReAct (Yao et al., 2022); MemGPT (Packer et al., 2023); Building Effective Agents (Anthropic, 2024); The Prompt Report (Schulhoff et al., 2024); Chain-of-Thought Prompting (Wei et al., 2022); LoRA (Hu et al., 2021); QLoRA (Dettmers et al., 2023); DPO (Rafailov et al., 2023); DeepSeek-R1 (2025); Training Compute-Optimal Large Language Models, Chinchilla (Hoffmann et al., 2022); Attention Is All You Need (Vaswani et al., 2017); RoFormer, RoPE (Su et al., 2021); GQA (Ainslie et al., 2023); FlashAttention (Dao et al., 2022); Efficient Memory Management for LLM Serving with PagedAttention, vLLM (Kwon et al., 2023); Fast Inference from Transformers via Speculative Decoding (Leviathan et al., 2023); Judging LLM-as-a-Judge with MT-Bench (Zheng et al., 2023); SWE-bench (Jimenez et al., 2023); IFEval (Zhou et al., 2023); Scaling Laws for Neural Language Models (Kaplan et al., 2020); Lilian Weng, LLM Powered Autonomous Agents (2023); Eugene Yan, Patterns for Building LLM-based Systems (2023).

Default reading `minutes` by kind: paper 35, post 25, api 10. These are display hints; the Friday slot's planned time is set on the `DayTask`.

API and model launches (kind `api`, week 1 and then as released): Claude Fable 5.1 (Anthropic, 2026-09-01); GPT-6 Astra (OpenAI, 2026-09-03); Gemini 3.8 Flash (Google, 2026-09-02); Claude Opus 5 with the effort dial (Anthropic, 2026-07-24); Qwen 3.8 (Alibaba, 2026-08); DeepSeek V4 Flash Vision (2026-08-21); GLM-5.3 (Z.AI, 2026-08-14). Newer launches arrive via the live feed and are added to the curated list by pull request.

## 7. Progress state

### Blob (localStorage key `aeg.progress.v1`)

```ts
{
  version: 1,
  startDate: string | null,          // ISO date, always a Monday
  completed: Record<string, string>, // itemId -> ISO date completed
  hours: Record<string, number>,     // ISO date -> hours; auto-filled from completed DayTask.minutes, user may overwrite
  settings: { theme: 'dark' | 'light' | 'system' }
}
```

### Store (`lib/progress/store.ts`)

zustand with `persist`. Actions: `setStartDate`, `toggle(itemId)`, `setHours(date, hours)`, `reset`, `importBlob(json)`. Selectors compute: `dayNumber` (days since startDate plus one, null if unset), `weekNumber`, `streak` (consecutive calendar days ending today or yesterday with at least one completion), `weekProgress` (planned vs completed minutes per track for the current week), `month1Checks` (the four meters).

### Rules

- Every read and write to storage is wrapped in try-catch. If storage throws, the store runs in memory and the shell shows a dismissible banner: "Progress is not being saved in this browser."
- Server render never reads progress. A `useHydrated` guard renders skeleton placeholders until the client store has loaded.
- Export writes the blob as pretty JSON to a download named `ai-engineer-guide-progress-YYYY-MM-DD.json`.
- Import parses JSON, validates with the zod schema for the blob's `version`, runs migrations up to the current version, then replaces state. Any failure shows the validation message and leaves state untouched.
- Migrations live in `lib/progress/migrations.ts` as a list of `(blob) => blob` steps keyed by from-version.

## 8. Live feed

### `/api/feed/arxiv`

Fetches the arXiv API `query` endpoint with `search_query=cat:cs.CL OR cat:cs.LG OR cat:cs.IR`, `sortBy=submittedDate`, `sortOrder=descending`, `max_results=40`. Parses the Atom XML into `{ id, title, authors, published, url, summary }`, filters to the last 7 days, returns JSON. Uses Next.js fetch caching with `revalidate: 21600`. On upstream failure returns `{ items: [], error: 'unavailable' }` with status 200 so the client renders an empty state.

### `/api/feed/hn`

Fetches the Algolia Hacker News search API `search_by_date` with `query=LLM OR RAG OR "AI agents" OR transformer`, `tags=story`, `numericFilters=points>20,created_at_i>{now - 7d}`, `hitsPerPage=40`. Maps hits to `{ id, title, url, points, author, createdAt, hnUrl }`. Same caching and failure behavior.

Both handlers set `Cache-Control: public, s-maxage=21600, stale-while-revalidate=3600`. Parsers are pure functions in `lib/feed/` and are unit-tested against saved fixture responses.

## 9. Content validation

`scripts/validate-content.ts` runs in the `prebuild` npm script and in CI. It fails with a readable list of errors if any of these hold:

- Any id is duplicated across all content collections.
- Any `DayTask.refId` or `Milestone.projectId` or `Reading.weekId` does not resolve.
- Any day has zero tasks.
- Any week's tasks (days 1–28) sum outside 1290 to 1410 minutes, summing `DayTask.minutes` only.
- Any weekday has more or fewer than 2 DSA tasks.
- Any completion key (`taskId ?? refId`) is used by more than one day task.
- Any weekend day's tasks do not sum to exactly 300 minutes.
- Any DSA problem lacks a valid LeetCode URL of the form `https://leetcode.com/problems/<slug>/`.
- Any project does not have exactly 4 milestones.
- The DSA bank does not have exactly 150 problems and exactly 75 core.

## 10. Error handling

- Storage unavailable: in-memory fallback plus banner (section 7).
- Import failure: message, state untouched (section 7).
- Feed failure: empty state per column with "Feed unavailable, showing curated list only" (section 8).
- Unknown route param (`/dsa/not-a-pattern`): Next.js `notFound()`.
- Start date not set: Today shows the setup card; all other pages work without a start date, but the Roadmap does not highlight a current day.

## 11. Testing

Amended 2026-09-06 at the user's request: the system gets a real test suite, not a smoke test. Written
test-first during implementation. Every page and every user-visible flow is covered end to end.

### 11.1 Unit (Vitest)

- Content validation: every rule has a passing fixture AND a failing fixture, asserting the exact error string.
- Content banks: counts, id conventions, cross-references, and per-collection invariants (150/75 DSA,
  20 system design patterns, 10 topics, 24 milestones, 42 generated docs, reading minutes by kind).
- Plan integrity: weekly minute totals, per-day task composition, unique completion keys, 40 scheduled problems.
- Store: `toggle` idempotence, `streak` across day boundaries and gaps including a DST-adjacent day pair,
  `dayNumber`/`weekNumber` from a Monday start, export-import round trip, version-0 migration,
  malformed-import rejection leaving state untouched, storage-throws fallback to in-memory.
- Feed parsers: fixture to items for both sources, recency filtering in both directions, empty and
  malformed inputs, and the HN permalink fallback when a story has no url.
- Components: every page component renders from an empty store and from a populated store.

### 11.2 End-to-end (Playwright), run at 1280x800 AND 390x844

One spec file per area. Every spec runs at both viewports unless it is explicitly viewport-specific.

1. **Onboarding** — no start date shows the setup card; setting a date snaps to Monday; Today then renders
   day 1's tasks.
2. **Progress persistence** — check a task, reload, still checked; streak reads 1; check a second task on a
   different page and confirm the Today meters move.
3. **Export / import / reset** — export downloads a file named for today; reset clears; importing the file
   restores every checked item; importing a malformed file shows an alert and changes nothing.
4. **Cross-page identity** — checking a problem on a DSA pattern page marks the same item complete on Today
   and moves the month-1 problems meter. This is the single most important behavioural test in the suite.
5. **Every route loads** — walk all 13 routes plus 4 dynamic examples, assert HTTP 200, a visible `h1`,
   and zero console errors.
6. **Navigation** — desktop shows the rail and hides the tab bar; mobile does the reverse; the More sheet
   opens and reaches the three secondary pages; the active item carries `aria-current`.
7. **DSA filters** — All / Core / company chips change the visible count; a pattern page shows signals,
   template, pitfalls, and the right number of problems; the LeetCode link has the expected href.
8. **System design framework** — expanding a question reveals all six steps; an ML question and a general
   question show different step headings.
9. **Reading tabs** — Curated groups by week and toggles; Live renders items with both feeds stubbed to
   succeed, and shows a per-column empty state with both stubbed to fail.
10. **Theme** — toggle cycles dark / light / system; the choice survives reload; no wrong-theme flash on
    first paint; both themes pass an automated contrast assertion on body text over a glass panel.
11. **Responsive integrity** — at 390px no page scrolls horizontally, and every interactive target is at
    least 44px. Runs across all 13 routes, not a single sample page.
12. **Unknown route** — a bad dynamic slug renders the not-found page, not a crash.

### 11.3 Accessibility

An automated axe-core pass on Today, a DSA pattern page, and Reading, in both themes. Zero critical
violations is the bar. Keyboard-only traversal of Today and Settings must reach every control.

## 12. Deploy and release

- Public GitHub repository `ai-engineer-guide`, MIT license.
- README: what the guide is, how to use it, the weekly template, the content schema, how to add a question or reading in one pull request, how to run locally, how to run tests.
- Vercel project linked via the existing MCP connection. Production deploys from `main`. Preview deploys on every pull request. `prebuild` runs content validation so a broken content PR cannot deploy.
- No environment variables are required for version 1.

## 13. Visual direction

Amended 2026-09-06 at the user's request: the interface must read as modern and attractive, not as a plain
utility. Glassmorphism is the chosen idiom. Dark mode and light mode are BOTH first-class — neither is an
afterthought or a filter over the other, and every component is designed twice.

### 13.1 The glass system

Three surface tiers, and only three. More tiers make a page look muddy.

| Tier | Use | Treatment |
|---|---|---|
| Ground | page background | Opaque base colour plus one soft radial gradient wash. Never translucent. |
| Panel | cards, nav rail, tab bar, question rows | Translucent fill, `backdrop-filter: blur(...)`, 1px hairline border, subtle inner top highlight |
| Raised | modals, popovers, the mobile More sheet, hover state | Same as Panel with more blur, stronger border, and a drop shadow |

Rules that keep it from becoming unreadable:
- **Text never sits directly on blur.** Every glass panel carries a solid-enough fill behind its text that
  body copy clears 4.5:1 contrast and large text clears 3:1, measured against the busiest ground beneath it.
- **Blur is capped.** No more than two stacked blurred layers anywhere on screen, because `backdrop-filter`
  is the most expensive thing on the page and stacking it visibly drops scroll framerate on mid-range phones.
- **Every glass surface degrades.** `@supports not (backdrop-filter: blur(1px))` raises the fill opacity to
  a solid tint so the design still reads on browsers without support. Also honour
  `prefers-reduced-transparency`, dropping to solid fills.
- **Borders carry the shape, not the shadow.** In light mode a glass panel is nearly invisible without its
  hairline border, so the border is required, not decorative.

### 13.2 Two themes, designed separately

Dark is the default. Light is a real design, not inverted tokens.

- Dark ground is a deep desaturated blue-grey, never pure black, so translucent panels have something to
  pick up. Panels lift with a low-opacity white fill.
- Light ground is a warm off-white with a soft tint wash, never pure white. Panels lift with a low-opacity
  white fill plus a stronger border, because on light grounds translucency alone reads as nothing.
- Accent must satisfy contrast on BOTH grounds. If one accent cannot, the theme defines its own accent step.
- Every colour is a token on `:root`. Dark overrides live under both `@media (prefers-color-scheme: dark)`
  and `:root[data-theme="dark"]`, so an explicit toggle wins in either direction and the system default works.
- A visible theme toggle sits in the top bar, cycling dark / light / system, persisted in the progress blob's
  `settings.theme`. It must not flash the wrong theme on load: resolve the stored theme in a blocking inline
  script before first paint.

### 13.3 Component treatment

- **Cards** (pattern, topic, project) — glass Panel, rounded, hairline border, hover lifts to Raised with a
  short transform. A completion ring or bar sits in the corner using the accent.
- **Checkbox rows** — the whole 44px row is the target. Completed rows dim, gain a check glyph, and desaturate.
  Never colour alone.
- **Nav rail and mobile tab bar** — glass Raised, pinned, with the active item marked by an accent pill behind
  the label plus `aria-current`.
- **Meters and progress bars** — accent fill on a low-contrast track, with the numeric value always shown in
  monospace beside it. A bar alone is not an answer.
- **Code blocks** — solid surface, NOT glass. Blur behind code is unreadable. Monospace, own scroll container.
- **Type** — one display size for page titles, compact body size to keep question tables dense, monospace for
  ids, LeetCode numbers, day and week counters, and minute counts.
- **Motion** — transitions at 150 to 200ms on hover, expand, and theme change only. All of it disabled under
  `prefers-reduced-motion`. No decorative animation, no illustration.

The reference feeling is a well-made modern developer product: dense and serious, but with real visual craft.
Final choices are made during implementation using the frontend-design skill and recorded in the plan.

## 14. Assumptions

- The user starts month 1 on a Monday and accepts that the app snaps the start date to a Monday.
- 22.5 hours per week is the planning budget; the app tracks against it but never blocks the user from doing more or less.
- The month 4 agent use case defaults to the operations agent described in section 6.8 unless the user picks another in week 13.
- Company tags reflect community-reported frequency from 2026 sources and are guidance, not guarantees.
