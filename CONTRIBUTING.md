# Contributing

Almost every useful contribution to this guide is **one object added to one file in `content/`**. That path
is deliberately short: pick the file, add the object, run two commands, open the pull request.

Nothing here needs a database migration or a UI change. The pages are generic renderers over typed arrays —
add a problem and it appears on its pattern page, in the index counts, and in every meter that counts it.

## The one-pull-request path

1. **Pick the file.**

   | You want to add | File | Array |
   |---|---|---|
   | A DSA problem | `content/dsa.ts` | `dsaProblems` |
   | A DSA pattern | `content/dsa.ts` | `dsaPatterns` |
   | A system design question | `content/system-design.ts` | `sdQuestions` |
   | A system design pattern | `content/system-design.ts` | `sdPatterns` |
   | An AI/ML question | `content/ai-ml.ts` | `topicQuestions` |
   | An AI/ML topic | `content/ai-ml.ts` | `topics` |
   | A project or milestone | `content/projects.ts` | `projects`, `milestones` |
   | A reading | `content/readings.ts` | `readings` |
   | A week target or a day's tasks | `content/plan.ts` | `weeks`, `days` |

2. **Add one object**, matching the zod schema in `lib/content/schema.ts`. Copy the neighbour above it; the
   files are ordered and commented, and the shape is enforced at build time anyway.

3. **Give it an id** that follows the conventions in the [README](README.md#id-conventions). The id is the
   completion key — it is what gets written into a user's progress when they tick the item — so it must be
   unique across every collection and it should never change once merged. Renaming an id silently un-ticks
   the item for everyone who had already done it.

4. **Run the checks:**

   ```bash
   pnpm validate
   pnpm test
   ```

   `pnpm validate` is the one that matters for content. It checks referential integrity and the plan's
   arithmetic, and prints a readable list of every problem it found rather than the first one.

5. **Open the pull request.** One object per PR is ideal; a themed batch (say, six problems for one pattern)
   is fine. Say in the description why the item earns a slot — especially for a reading, where the bar is
   "this changes how you would build the thing you are building that week", not "this is interesting".

**A broken content change cannot deploy.** `prebuild` runs `pnpm validate`, so `pnpm build` — and therefore
every Vercel preview and the production deploy — fails before it produces output if validation fails. CI runs
the same command on every pull request, so you see it there first.

## Worked example 1 — adding a DSA problem

Say you want *Top K Frequent Elements* on the Arrays & Hashing pattern. Open `content/dsa.ts`, find the
`dsaProblems` entries whose `patternId` is `'dsap-arrays-hashing'`, and add:

```ts
{
  id: 'dsa-347-top-k-frequent-elements',
  patternId: 'dsap-arrays-hashing',
  name: 'Top K Frequent Elements',
  leetcodeNumber: 347,
  url: 'https://leetcode.com/problems/top-k-frequent-elements/',
  difficulty: 'medium',
  core: true,
  companies: ['amazon', 'meta'],
  minutes: 30,
},
```

What validation will hold you to:

- `id` is `dsa-<leetcode number>-<kebab-case name>`, and is not already used anywhere.
- `patternId` resolves to a real `DsaPattern`.
- `url` is exactly `https://leetcode.com/problems/<slug>/` — trailing slash included, no query string, no
  `/description`.
- `difficulty` is `'easy' | 'medium' | 'hard'`; `companies` is a subset of `'google' | 'meta' | 'amazon'`.
- The bank stays at **exactly 150 problems, exactly 75 core**. This is a fixed-size bank, so adding one means
  removing one — say which one you dropped and why, in the PR description. If you are proposing to grow the
  bank instead, that is a spec change: open an issue first, because the count is asserted in
  `tests/unit/content-dsa.test.ts` and in the validator.

`minutes` here is a display hint for the pattern page only. It is never summed into the plan — the plan's
time comes from `DayTask.minutes` in `content/plan.ts`.

If you also want the problem *scheduled*, that is a second, separate edit in `content/plan.ts`: add a
`DayTask` with `refId: 'dsa-347-top-k-frequent-elements'`. Be careful — each weekday must have exactly two
DSA tasks and each week must land between 1290 and 1410 planned minutes, so scheduling one problem means
unscheduling another. Most PRs should not touch the plan.

## Worked example 2 — adding a reading

Say a paper lands that belongs in week 9. Open `content/readings.ts`, find the `// Week 9` block, and add:

```ts
{
  id: 'read-graphrag-2024',
  weekId: 'week-09',
  kind: 'paper',
  title: 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization',
  source: 'Edge et al., Microsoft Research',
  year: 2024,
  url: 'https://arxiv.org/abs/2404.16130',
  why: 'The construction this month\'s project copies: entity extraction, community detection, then summarisation. Read it before you design the graph build, not after.',
  minutes: 35,
},
```

What validation will hold you to:

- `id` starts with `read-`, and is unique.
- `weekId` resolves to a real week (`week-01` … `week-26`, zero-padded).
- `kind` is `'paper' | 'post' | 'api'`. Default `minutes` by kind are paper 35, post 25, api 10 — use those
  unless you have a reason.
- `year` is a number, and `url` is a real link.

`why` is the field with the lowest tolerance for filler. One sentence, and it must connect the reading to
what the reader is *building or studying that specific week*. "Foundational paper on retrieval" is not a
reason; "the construction this month's project copies" is. If you cannot write that sentence, the reading
probably belongs to a different week — or to no week.

## Beyond content

Changes to `app/`, `components/`, `lib/`, or the design tokens in `app/globals.css` are welcome, but come
with more to run:

```bash
pnpm validate && pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e
```

A few standing rules the tests already enforce, worth knowing before you write the code:

- **One breakpoint.** 768px, and `sm:` / `lg:` variants are deliberately disabled in the Tailwind theme.
- **Nothing may scroll the page horizontally at 390px.** Wide content scrolls inside its own container.
  `tests/e2e/responsive.spec.ts` checks all 13 routes.
- **Tap targets are at least 44px**, except inline links inside prose.
- **Both themes are first class.** Never define a colour only inside a media query or a `[data-theme]` block;
  declare it on bare `:root` and rebind it. Contrast is asserted twice — once over the palette in
  `tests/unit/contrast.test.ts`, and once over real screenshot pixels in `tests/e2e/theme.spec.ts`.
- **Zero critical or serious axe violations** on Today, a DSA pattern page, and Reading, in both themes.
- **The e2e suite must never touch a real network.** Stub feed routes with `page.route`.

## Reporting something instead

If you have found a wrong answer, a broken link, a dead LeetCode URL, or a step in the framework that reads
badly, an issue is enough — you do not have to open a PR to be useful. Include the content id.
