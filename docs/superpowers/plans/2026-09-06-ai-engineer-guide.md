# AI Engineer Practice Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publicly deploy a mobile-responsive Next.js app that tracks a six-month AI engineer interview-preparation plan and serves as an open practice guide, with pattern-organized DSA and system design banks, an AI/ML study bank, an LLM build track, curated readings, and a live papers feed.

**Architecture:** A static-content Next.js App Router site. The entire curriculum lives in typed TypeScript modules under `content/`, validated at build time by a script that fails the build on any integrity error. Progress is per-browser state in `localStorage` behind a zustand store, with pure selector functions that are unit-tested without React. The only server code is two cached, keyless route handlers that proxy arXiv and Hacker News.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + zustand (persist middleware) + zod + Vitest + Playwright + pnpm. Deployed on Vercel.

**Spec:** `docs/superpowers/specs/2026-09-06-ai-engineer-guide-design.md`

## Global Constraints

- Package manager is pnpm. Never use npm or yarn.
- TypeScript strict mode on. No `any` in committed code.
- Route params are the content id with its type prefix stripped: `dsap-arrays-hashing` serves `/dsa/arrays-hashing`. Use `slugOf` / `idFromSlug` from `lib/content/ids.ts` for every conversion.
- The completion key for a day task is `taskId ?? refId`. Never key completion on anything else.
- Weekly planned minutes must total 1350, with validation tolerance 1290 to 1410.
- The DSA bank must contain exactly 150 problems, exactly 75 of them `core: true`.
- Every project has exactly 4 milestones and exactly 7 generated defense docs.
- Server components never read progress state. Any component reading the store is a client component guarded by `useHydrated`.
- Every `localStorage` access is wrapped in try/catch and degrades to in-memory state.
- Breakpoint is 768px. Below it, no page may scroll horizontally.
- Tap targets are at least 44px.
- All dates are `YYYY-MM-DD` strings. Use `lib/date.ts` helpers only, never raw `Date` arithmetic.
- Content files are data only. No logic, no imports beyond types.
- Commit after every task. Conventional commit prefixes: `feat:`, `test:`, `chore:`, `docs:`, `fix:`.

---

### Task 1: Project scaffold, tooling, and deployable skeleton

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `LICENSE`, `.github/workflows/ci.yml`
- Test: `tests/unit/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `pnpm validate`. The `prebuild` script hook that Task 2 fills in.

- [ ] **Step 1: Scaffold the Next.js app**

Run from the repo root (the repo already exists at `ai-engineer-guide` with `docs/` committed):

```bash
pnpm dlx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm --no-turbopack --yes
```

If it refuses because the directory is not empty, answer yes to proceed; it preserves `docs/` and `.git/`.

- [ ] **Step 2: Record the Tailwind major version**

Run: `pnpm ls tailwindcss`

If it reports v4, styling config is CSS-first: `app/globals.css` starts with `@import "tailwindcss";` and theme tokens go in an `@theme { ... }` block. If it reports v3, a `tailwind.config.ts` exists and tokens go in `theme.extend`. Note which one in the commit message; every later styling step uses that convention.

- [ ] **Step 3: Add the remaining dependencies**

```bash
pnpm add zustand zod
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @playwright/test tsx
pnpm exec playwright install chromium
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    globals: true,
  },
})
```

- [ ] **Step 5: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
```

- [ ] **Step 6: Set the scripts block in `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "prebuild": "pnpm validate",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "validate": "tsx scripts/validate-content.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 7: Create a placeholder validate script so `prebuild` does not break**

Create `scripts/validate-content.ts`:

```ts
// Replaced with real rules in Task 2.
console.log('content validation: no rules yet')
```

- [ ] **Step 8: Write the smoke test**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 9: Run the test suite and the build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: test passes, typecheck clean, build succeeds and prints the placeholder validation line.

- [ ] **Step 10: Add the MIT license**

Create `LICENSE` with the standard MIT text, copyright line `Copyright (c) 2026 saikiran`.

- [ ] **Step 11: Write the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm validate
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with vitest, playwright, and CI"
```

---

### Task 2: Content schemas, id helpers, date helpers, and the validation script

**Files:**
- Create: `lib/date.ts`, `lib/content/schema.ts`, `lib/content/ids.ts`, `lib/content/index.ts`, `scripts/validate-content.ts` (replace)
- Create stubs: `content/dsa.ts`, `content/system-design.ts`, `content/ai-ml.ts`, `content/projects.ts`, `content/readings.ts`, `content/plan.ts`
- Test: `tests/unit/date.test.ts`, `tests/unit/ids.test.ts`, `tests/unit/validate.test.ts`

**Interfaces:**
- Consumes: Task 1 toolchain.
- Produces:
  - `lib/date.ts`: `todayIso(): string`, `addDays(iso: string, n: number): string`, `diffDays(from: string, to: string): number`, `isMonday(iso: string): boolean`, `mostRecentMonday(iso: string): string`
  - `lib/content/ids.ts`: `slugOf(id: string): string`, `idFromSlug(prefix: string, slug: string): string`
  - `lib/content/schema.ts`: zod schemas and inferred types `DsaPattern`, `DsaProblem`, `SdPattern`, `SdQuestion`, `Topic`, `TopicQuestion`, `Project`, `Milestone`, `Doc`, `Reading`, `Week`, `Day`, `DayTask`
  - `lib/content/index.ts`: `content` object, `byId: Map<string, ContentItem>`, `resolveRef(id): ContentItem | undefined`, `docsForProject(projectId): Doc[]`, `allDocs: Doc[]`, `completionKey(task: DayTask): string`, `REVIEW_IDS: readonly string[]`
  - `scripts/validate-content.ts`: exports `validate(content): string[]` and exits 1 when the array is non-empty

- [ ] **Step 1: Write the failing date tests**

Create `tests/unit/date.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { addDays, diffDays, isMonday, mostRecentMonday } from '@/lib/date'

describe('date helpers', () => {
  it('adds days across a month boundary', () => {
    expect(addDays('2026-09-28', 5)).toBe('2026-10-03')
  })

  it('adds days across a year boundary', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('diffs days in both directions', () => {
    expect(diffDays('2026-09-07', '2026-09-14')).toBe(7)
    expect(diffDays('2026-09-14', '2026-09-07')).toBe(-7)
    expect(diffDays('2026-09-07', '2026-09-07')).toBe(0)
  })

  it('is immune to daylight saving shifts', () => {
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31)
    expect(diffDays('2026-10-01', '2026-11-01')).toBe(31)
  })

  it('identifies Mondays', () => {
    expect(isMonday('2026-09-07')).toBe(true)
    expect(isMonday('2026-09-08')).toBe(false)
  })

  it('finds the most recent Monday, returning the date itself when it is a Monday', () => {
    expect(mostRecentMonday('2026-09-07')).toBe('2026-09-07')
    expect(mostRecentMonday('2026-09-11')).toBe('2026-09-07')
    expect(mostRecentMonday('2026-09-13')).toBe('2026-09-07')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/date.test.ts`
Expected: FAIL, cannot resolve `@/lib/date`.

- [ ] **Step 3: Implement `lib/date.ts`**

```ts
const MS_PER_DAY = 86_400_000

function toUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtc(ms: number): string {
  const dt = new Date(ms)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local calendar date, so "today" matches the user's own calendar. */
export function todayIso(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, n: number): string {
  return fromUtc(toUtc(iso) + n * MS_PER_DAY)
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY)
}

export function isMonday(iso: string): boolean {
  return new Date(toUtc(iso)).getUTCDay() === 1
}

export function mostRecentMonday(iso: string): string {
  const dow = new Date(toUtc(iso)).getUTCDay()
  const back = (dow + 6) % 7
  return addDays(iso, -back)
}
```

- [ ] **Step 4: Run the date tests**

Run: `pnpm test tests/unit/date.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the failing id tests**

Create `tests/unit/ids.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { slugOf, idFromSlug } from '@/lib/content/ids'

describe('id helpers', () => {
  it('strips a known prefix', () => {
    expect(slugOf('dsap-arrays-hashing')).toBe('arrays-hashing')
    expect(slugOf('sdp-caching')).toBe('caching')
    expect(slugOf('topic-transformers')).toBe('transformers')
    expect(slugOf('proj-rag')).toBe('rag')
    expect(slugOf('mlp-rag-systems')).toBe('rag-systems')
  })

  it('round-trips', () => {
    expect(idFromSlug('dsap', slugOf('dsap-arrays-hashing'))).toBe('dsap-arrays-hashing')
  })

  it('leaves an unknown prefix alone', () => {
    expect(slugOf('review-week')).toBe('review-week')
  })
})
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `pnpm test tests/unit/ids.test.ts`
Expected: FAIL, cannot resolve `@/lib/content/ids`.

- [ ] **Step 7: Implement `lib/content/ids.ts`**

```ts
export const ID_PREFIXES = ['dsap', 'dsa', 'sdp', 'sdq', 'mlp', 'mlq', 'topic', 'q', 'proj', 'ms', 'doc', 'read', 'day', 'week'] as const

export type IdPrefix = (typeof ID_PREFIXES)[number]

export function slugOf(id: string): string {
  for (const p of ID_PREFIXES) {
    if (id.startsWith(`${p}-`)) return id.slice(p.length + 1)
  }
  return id
}

export function idFromSlug(prefix: IdPrefix, slug: string): string {
  return `${prefix}-${slug}`
}
```

Note: `review-week` has no prefix in `ID_PREFIXES`, so `slugOf` returns it unchanged, which is what the third test asserts.

- [ ] **Step 8: Run the id tests**

Run: `pnpm test tests/unit/ids.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 9: Write `lib/content/schema.ts`**

```ts
import { z } from 'zod'

export const difficultySchema = z.enum(['easy', 'medium', 'hard'])
export const companySchema = z.enum(['google', 'meta', 'amazon'])
export const trackSchema = z.enum(['dsa', 'study-sd', 'study-ml', 'reading', 'build', 'review'])

export const dsaPatternSchema = z.object({
  id: z.string().regex(/^dsap-[a-z0-9-]+$/),
  name: z.string().min(1),
  order: z.number().int().positive(),
  signals: z.array(z.string().min(1)).min(1),
  template: z.string().min(1),
  pitfalls: z.array(z.string().min(1)).min(1),
})

export const dsaProblemSchema = z.object({
  id: z.string().regex(/^dsa-\d+-[a-z0-9-]+$/),
  patternId: z.string().regex(/^dsap-[a-z0-9-]+$/),
  name: z.string().min(1),
  leetcodeNumber: z.number().int().positive(),
  url: z.string().regex(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/),
  difficulty: difficultySchema,
  core: z.boolean(),
  companies: z.array(companySchema),
  minutes: z.number().int().positive(),
})

export const sdPatternSchema = z.object({
  id: z.string().regex(/^(sdp|mlp)-[a-z0-9-]+$/),
  group: z.enum(['general', 'ml']),
  name: z.string().min(1),
  order: z.number().int().positive(),
  solves: z.string().min(1),
  tradeoffs: z.array(z.string().min(1)).min(1),
})

export const sdQuestionSchema = z.object({
  id: z.string().regex(/^(sdq|mlq)-[a-z0-9-]+$/),
  patternId: z.string().regex(/^(sdp|mlp)-[a-z0-9-]+$/),
  title: z.string().min(1),
  tier: z.union([z.literal(1), z.literal(2), z.literal('ml'), z.literal('ai')]),
  companies: z.array(z.string().min(1)),
  steps: z.object({
    define: z.array(z.string().min(1)).min(1),
    data: z.array(z.string().min(1)).min(1),
    architecture: z.array(z.string().min(1)).min(1),
    evaluate: z.array(z.string().min(1)).min(1),
    deploy: z.array(z.string().min(1)).min(1),
    wrapup: z.array(z.string().min(1)).min(1),
  }),
  minutes: z.number().int().positive(),
})

export const topicSchema = z.object({
  id: z.string().regex(/^topic-[a-z0-9-]+$/),
  name: z.string().min(1),
  order: z.number().int().positive(),
  summary: z.string().min(1),
})

export const topicQuestionSchema = z.object({
  id: z.string().regex(/^q-[a-z0-9-]+$/),
  topicId: z.string().regex(/^topic-[a-z0-9-]+$/),
  text: z.string().min(1),
  minutes: z.number().int().positive(),
})

export const projectSchema = z.object({
  id: z.string().regex(/^proj-[a-z0-9-]+$/),
  month: z.number().int().min(1).max(6),
  name: z.string().min(1),
  goal: z.string().min(1),
  architecture: z.string().min(1),
  constraints: z.array(z.string().min(1)).min(1),
  defense: z.array(z.string().min(1)).min(1),
})

export const milestoneSchema = z.object({
  id: z.string().regex(/^ms-[a-z0-9-]+-\d+$/),
  projectId: z.string().regex(/^proj-[a-z0-9-]+$/),
  order: z.number().int().min(1).max(4),
  title: z.string().min(1),
  scope: z.array(z.string().min(1)).min(1),
  acceptance: z.array(z.string().min(1)).min(1),
  hours: z.number().int().positive(),
})

export const docSchema = z.object({
  id: z.string().regex(/^doc-[a-z0-9-]+$/),
  projectId: z.string().regex(/^proj-[a-z0-9-]+$/),
  name: z.string().min(1),
  order: z.number().int().min(1).max(7),
})

export const readingSchema = z.object({
  id: z.string().regex(/^read-[a-z0-9-]+$/),
  weekId: z.string().regex(/^week-\d{2}$/),
  kind: z.enum(['paper', 'post', 'api']),
  title: z.string().min(1),
  source: z.string().min(1),
  year: z.number().int().min(1990).max(2030),
  url: z.string().url(),
  why: z.string().min(1),
  minutes: z.number().int().positive(),
})

export const weekSchema = z.object({
  id: z.string().regex(/^week-\d{2}$/),
  number: z.number().int().min(1).max(26),
  month: z.number().int().min(1).max(6),
  theme: z.string().min(1),
  targets: z.array(z.string().min(1)).min(1),
})

export const dayTaskSchema = z.object({
  refId: z.string().min(1),
  taskId: z.string().min(1).optional(),
  track: trackSchema,
  minutes: z.number().int().positive(),
  note: z.string().min(1).optional(),
})

export const daySchema = z.object({
  id: z.string().regex(/^day-\d{2}$/),
  number: z.number().int().min(1).max(30),
  weekId: z.string().regex(/^week-\d{2}$/),
  kind: z.enum(['weekday', 'weekend', 'special']),
  tasks: z.array(dayTaskSchema).min(1),
})

export type DsaPattern = z.infer<typeof dsaPatternSchema>
export type DsaProblem = z.infer<typeof dsaProblemSchema>
export type SdPattern = z.infer<typeof sdPatternSchema>
export type SdQuestion = z.infer<typeof sdQuestionSchema>
export type Topic = z.infer<typeof topicSchema>
export type TopicQuestion = z.infer<typeof topicQuestionSchema>
export type Project = z.infer<typeof projectSchema>
export type Milestone = z.infer<typeof milestoneSchema>
export type Doc = z.infer<typeof docSchema>
export type Reading = z.infer<typeof readingSchema>
export type Week = z.infer<typeof weekSchema>
export type Day = z.infer<typeof daySchema>
export type DayTask = z.infer<typeof dayTaskSchema>

export type ContentItem =
  | DsaPattern | DsaProblem | SdPattern | SdQuestion | Topic | TopicQuestion
  | Project | Milestone | Doc | Reading | Week | Day
```

- [ ] **Step 10: Create empty content stubs**

Create six files so the loader compiles before the content tasks fill them:

`content/dsa.ts`
```ts
import type { DsaPattern, DsaProblem } from '@/lib/content/schema'
export const dsaPatterns: DsaPattern[] = []
export const dsaProblems: DsaProblem[] = []
```

`content/system-design.ts`
```ts
import type { SdPattern, SdQuestion } from '@/lib/content/schema'
export const sdPatterns: SdPattern[] = []
export const sdQuestions: SdQuestion[] = []
```

`content/ai-ml.ts`
```ts
import type { Topic, TopicQuestion } from '@/lib/content/schema'
export const topics: Topic[] = []
export const topicQuestions: TopicQuestion[] = []
```

`content/projects.ts`
```ts
import type { Project, Milestone } from '@/lib/content/schema'
export const projects: Project[] = []
export const milestones: Milestone[] = []
```

`content/readings.ts`
```ts
import type { Reading } from '@/lib/content/schema'
export const readings: Reading[] = []
```

`content/plan.ts`
```ts
import type { Week, Day } from '@/lib/content/schema'
export const weeks: Week[] = []
export const days: Day[] = []
```

- [ ] **Step 11: Write `lib/content/index.ts`**

```ts
import { dsaPatterns, dsaProblems } from '@/content/dsa'
import { sdPatterns, sdQuestions } from '@/content/system-design'
import { topics, topicQuestions } from '@/content/ai-ml'
import { projects, milestones } from '@/content/projects'
import { readings } from '@/content/readings'
import { weeks, days } from '@/content/plan'
import { slugOf } from './ids'
import type { ContentItem, DayTask, Doc } from './schema'

export const REVIEW_IDS = ['review-week', 'review-mock', 'review-retro', 'review-publish'] as const

const DOC_NAMES = [
  'problem', 'architecture', 'ml', 'tradeoffs', 'scaling', 'failures', 'interview-questions',
] as const

export const allDocs: Doc[] = projects.flatMap((p) =>
  DOC_NAMES.map((name, i) => ({
    id: `doc-${slugOf(p.id)}-${name}`,
    projectId: p.id,
    name,
    order: i + 1,
  })),
)

export function docsForProject(projectId: string): Doc[] {
  return allDocs.filter((d) => d.projectId === projectId)
}

export const content = {
  dsaPatterns, dsaProblems,
  sdPatterns, sdQuestions,
  topics, topicQuestions,
  projects, milestones, docs: allDocs,
  readings, weeks, days,
}

export const byId: Map<string, ContentItem> = new Map(
  [
    ...dsaPatterns, ...dsaProblems,
    ...sdPatterns, ...sdQuestions,
    ...topics, ...topicQuestions,
    ...projects, ...milestones, ...allDocs,
    ...readings, ...weeks, ...days,
  ].map((item) => [item.id, item as ContentItem]),
)

export function resolveRef(id: string): ContentItem | undefined {
  return byId.get(id)
}

export function completionKey(task: DayTask): string {
  return task.taskId ?? task.refId
}
```

- [ ] **Step 12: Write the failing validation tests**

Create `tests/unit/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

function base(): ValidatableContent {
  return {
    dsaPatterns: [], dsaProblems: [],
    sdPatterns: [], sdQuestions: [],
    topics: [], topicQuestions: [],
    projects: [], milestones: [], docs: [],
    readings: [], weeks: [], days: [],
  }
}

describe('validate', () => {
  it('reports duplicate ids', () => {
    const c = base()
    c.topics = [
      { id: 'topic-a', name: 'A', order: 1, summary: 's' },
      { id: 'topic-a', name: 'B', order: 2, summary: 's' },
    ]
    expect(validate(c).some((e) => e.includes('duplicate id: topic-a'))).toBe(true)
  })

  it('reports an unresolvable refId', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday',
      tasks: [{ refId: 'dsa-999-nope', track: 'dsa', minutes: 30 }],
    }]
    expect(validate(c).some((e) => e.includes('unresolved refId: dsa-999-nope'))).toBe(true)
  })

  it('accepts a fixed review id as a refId', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-05', number: 5, weekId: 'week-01', kind: 'weekday',
      tasks: [{ refId: 'review-week', taskId: 'day-05-review-week', track: 'review', minutes: 10 }],
    }]
    expect(validate(c).some((e) => e.includes('unresolved refId'))).toBe(false)
  })

  it('reports a duplicate completion key', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [
      { id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday',
        tasks: [{ refId: 'review-week', track: 'review', minutes: 10 }] },
      { id: 'day-02', number: 2, weekId: 'week-01', kind: 'weekday',
        tasks: [{ refId: 'review-week', track: 'review', minutes: 10 }] },
    ]
    expect(validate(c).some((e) => e.includes('duplicate completion key: review-week'))).toBe(true)
  })

  it('reports a weekday without exactly two DSA tasks', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday',
      tasks: [{ refId: 'review-week', track: 'review', minutes: 10 }],
    }]
    expect(validate(c).some((e) => e.includes('day-01: expected 2 dsa tasks, found 0'))).toBe(true)
  })

  it('reports a weekend day that does not total 300 minutes', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-06', number: 6, weekId: 'week-01', kind: 'weekend',
      tasks: [{ refId: 'review-week', taskId: 'day-06-build', track: 'build', minutes: 250 }],
    }]
    expect(validate(c).some((e) => e.includes('day-06: weekend day totals 250 minutes, expected 300'))).toBe(true)
  })

  it('reports a week outside the minute tolerance', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{
      id: 'day-01', number: 1, weekId: 'week-01', kind: 'special',
      tasks: [{ refId: 'review-mock', track: 'review', minutes: 60 }],
    }]
    expect(validate(c).some((e) => e.includes('week-01: 60 minutes planned, expected 1290 to 1410'))).toBe(true)
  })

  it('reports a day with no tasks', () => {
    const c = base()
    c.weeks = [{ id: 'week-01', number: 1, month: 1, theme: 't', targets: ['x'] }]
    c.days = [{ id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday', tasks: [] }]
    expect(validate(c).some((e) => e.includes('day-01: has no tasks'))).toBe(true)
  })

  it('reports a bad LeetCode url', () => {
    const c = base()
    c.dsaPatterns = [{ id: 'dsap-x', name: 'X', order: 1, signals: ['s'], template: 't', pitfalls: ['p'] }]
    c.dsaProblems = [{
      id: 'dsa-1-two-sum', patternId: 'dsap-x', name: 'Two Sum', leetcodeNumber: 1,
      url: 'http://leetcode.com/problems/two-sum', difficulty: 'easy', core: true,
      companies: [], minutes: 20,
    }]
    expect(validate(c).some((e) => e.includes('dsa-1-two-sum: invalid LeetCode url'))).toBe(true)
  })

  it('reports the wrong DSA bank size once the bank is populated', () => {
    const c = base()
    c.dsaPatterns = [{ id: 'dsap-x', name: 'X', order: 1, signals: ['s'], template: 't', pitfalls: ['p'] }]
    c.dsaProblems = [{
      id: 'dsa-1-two-sum', patternId: 'dsap-x', name: 'Two Sum', leetcodeNumber: 1,
      url: 'https://leetcode.com/problems/two-sum/', difficulty: 'easy', core: true,
      companies: [], minutes: 20,
    }]
    const errs = validate(c)
    expect(errs.some((e) => e.includes('dsa bank has 1 problems, expected 150'))).toBe(true)
    expect(errs.some((e) => e.includes('dsa bank has 1 core problems, expected 75'))).toBe(true)
  })

  it('reports a project without exactly four milestones', () => {
    const c = base()
    c.projects = [{
      id: 'proj-rag', month: 1, name: 'RAG', goal: 'g', architecture: 'a',
      constraints: ['c'], defense: ['d'],
    }]
    expect(validate(c).some((e) => e.includes('proj-rag: has 0 milestones, expected 4'))).toBe(true)
  })

  it('passes clean content', () => {
    expect(validate(base())).toEqual([])
  })
})
```

- [ ] **Step 13: Run it to confirm it fails**

Run: `pnpm test tests/unit/validate.test.ts`
Expected: FAIL, `validate` is not exported.

- [ ] **Step 14: Implement `scripts/validate-content.ts`**

```ts
import { content, REVIEW_IDS, completionKey } from '@/lib/content/index'
import {
  dsaPatternSchema, dsaProblemSchema, sdPatternSchema, sdQuestionSchema,
  topicSchema, topicQuestionSchema, projectSchema, milestoneSchema,
  docSchema, readingSchema, weekSchema, daySchema,
} from '@/lib/content/schema'
import type {
  DsaPattern, DsaProblem, SdPattern, SdQuestion, Topic, TopicQuestion,
  Project, Milestone, Doc, Reading, Week, Day,
} from '@/lib/content/schema'

export interface ValidatableContent {
  dsaPatterns: DsaPattern[]; dsaProblems: DsaProblem[]
  sdPatterns: SdPattern[]; sdQuestions: SdQuestion[]
  topics: Topic[]; topicQuestions: TopicQuestion[]
  projects: Project[]; milestones: Milestone[]; docs: Doc[]
  readings: Reading[]; weeks: Week[]; days: Day[]
}

const WEEK_MIN = 1290
const WEEK_MAX = 1410
const LEETCODE_URL = /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/

export function validate(c: ValidatableContent): string[] {
  const errors: string[] = []

  // 1. Shape: every item must satisfy its schema.
  const shapes = [
    [c.dsaPatterns, dsaPatternSchema], [c.dsaProblems, dsaProblemSchema],
    [c.sdPatterns, sdPatternSchema], [c.sdQuestions, sdQuestionSchema],
    [c.topics, topicSchema], [c.topicQuestions, topicQuestionSchema],
    [c.projects, projectSchema], [c.milestones, milestoneSchema],
    [c.docs, docSchema], [c.readings, readingSchema],
    [c.weeks, weekSchema], [c.days, daySchema],
  ] as const
  for (const [items, schema] of shapes) {
    for (const item of items) {
      const r = schema.safeParse(item)
      if (!r.success) {
        const id = (item as { id?: string }).id ?? '<no id>'
        errors.push(`${id}: schema error: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
      }
    }
  }

  // 2. Global id uniqueness.
  const all = [
    ...c.dsaPatterns, ...c.dsaProblems, ...c.sdPatterns, ...c.sdQuestions,
    ...c.topics, ...c.topicQuestions, ...c.projects, ...c.milestones,
    ...c.docs, ...c.readings, ...c.weeks, ...c.days,
  ]
  const seen = new Set<string>()
  for (const item of all) {
    if (seen.has(item.id)) errors.push(`duplicate id: ${item.id}`)
    seen.add(item.id)
  }

  // 3. Reference integrity.
  const weekIds = new Set(c.weeks.map((w) => w.id))
  const projectIds = new Set(c.projects.map((p) => p.id))
  for (const p of c.dsaProblems) {
    if (!c.dsaPatterns.some((x) => x.id === p.patternId)) errors.push(`${p.id}: unknown patternId ${p.patternId}`)
  }
  for (const q of c.sdQuestions) {
    if (!c.sdPatterns.some((x) => x.id === q.patternId)) errors.push(`${q.id}: unknown patternId ${q.patternId}`)
  }
  for (const q of c.topicQuestions) {
    if (!c.topics.some((x) => x.id === q.topicId)) errors.push(`${q.id}: unknown topicId ${q.topicId}`)
  }
  for (const m of c.milestones) {
    if (!projectIds.has(m.projectId)) errors.push(`${m.id}: unknown projectId ${m.projectId}`)
  }
  for (const d of c.docs) {
    if (!projectIds.has(d.projectId)) errors.push(`${d.id}: unknown projectId ${d.projectId}`)
  }
  for (const r of c.readings) {
    if (!weekIds.has(r.weekId)) errors.push(`${r.id}: unknown weekId ${r.weekId}`)
  }
  for (const d of c.days) {
    if (!weekIds.has(d.weekId)) errors.push(`${d.id}: unknown weekId ${d.weekId}`)
  }

  // 4. LeetCode urls.
  for (const p of c.dsaProblems) {
    if (!LEETCODE_URL.test(p.url)) errors.push(`${p.id}: invalid LeetCode url ${p.url}`)
  }

  // 5. Bank sizes. Only enforced once the bank is being populated.
  if (c.dsaProblems.length > 0) {
    if (c.dsaProblems.length !== 150) errors.push(`dsa bank has ${c.dsaProblems.length} problems, expected 150`)
    const core = c.dsaProblems.filter((p) => p.core).length
    if (core !== 75) errors.push(`dsa bank has ${core} core problems, expected 75`)
  }

  // 6. Every project has exactly four milestones and seven docs.
  for (const p of c.projects) {
    const ms = c.milestones.filter((m) => m.projectId === p.id).length
    if (ms !== 4) errors.push(`${p.id}: has ${ms} milestones, expected 4`)
    const docs = c.docs.filter((d) => d.projectId === p.id).length
    if (docs !== 7) errors.push(`${p.id}: has ${docs} docs, expected 7`)
  }

  // 7. Day-level rules.
  const ids = new Set(all.map((i) => i.id))
  const keys = new Set<string>()
  for (const d of c.days) {
    if (d.tasks.length === 0) errors.push(`${d.id}: has no tasks`)
    for (const t of d.tasks) {
      if (!ids.has(t.refId) && !REVIEW_IDS.includes(t.refId as (typeof REVIEW_IDS)[number])) {
        errors.push(`${d.id}: unresolved refId: ${t.refId}`)
      }
      const key = completionKey(t)
      if (keys.has(key)) errors.push(`duplicate completion key: ${key}`)
      keys.add(key)
    }
    if (d.kind === 'weekday') {
      const dsa = d.tasks.filter((t) => t.track === 'dsa').length
      if (dsa !== 2) errors.push(`${d.id}: expected 2 dsa tasks, found ${dsa}`)
    }
    if (d.kind === 'weekend') {
      const total = d.tasks.reduce((s, t) => s + t.minutes, 0)
      if (total !== 300) errors.push(`${d.id}: weekend day totals ${total} minutes, expected 300`)
    }
  }

  // 8. Weekly minute budgets, days 1 to 28 only.
  for (const w of c.weeks) {
    const wdays = c.days.filter((d) => d.weekId === w.id && d.number <= 28)
    if (wdays.length === 0) continue
    const total = wdays.flatMap((d) => d.tasks).reduce((s, t) => s + t.minutes, 0)
    if (total < WEEK_MIN || total > WEEK_MAX) {
      errors.push(`${w.id}: ${total} minutes planned, expected ${WEEK_MIN} to ${WEEK_MAX}`)
    }
  }

  return errors
}

function main(): void {
  const errors = validate(content as ValidatableContent)
  if (errors.length > 0) {
    console.error(`content validation failed with ${errors.length} error(s):`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`content validation passed: ${content.dsaProblems.length} problems, ${content.days.length} days`)
}

if (process.argv[1]?.includes('validate-content')) main()
```

- [ ] **Step 15: Run the validation tests**

Run: `pnpm test tests/unit/validate.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 16: Run the whole suite, typecheck, and build**

Run: `pnpm test && pnpm typecheck && pnpm validate && pnpm build`
Expected: all pass. Validation prints `content validation passed: 0 problems, 0 days`.

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "feat: content schemas, id and date helpers, build-time validation"
```

---

### Task 3: DSA content bank

**Files:**
- Modify: `content/dsa.ts`
- Test: `tests/unit/content-dsa.test.ts`

**Interfaces:**
- Consumes: `DsaPattern`, `DsaProblem` from `lib/content/schema.ts`.
- Produces: `dsaPatterns: DsaPattern[]` (18 entries) and `dsaProblems: DsaProblem[]` (150 entries, 75 core) from `content/dsa.ts`.

- [ ] **Step 1: Write the failing content tests**

Create `tests/unit/content-dsa.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { dsaPatterns, dsaProblems } from '@/content/dsa'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

describe('dsa bank', () => {
  it('has 18 patterns with unique sequential order', () => {
    expect(dsaPatterns).toHaveLength(18)
    const orders = dsaPatterns.map((p) => p.order).sort((a, b) => a - b)
    expect(orders).toEqual(Array.from({ length: 18 }, (_, i) => i + 1))
  })

  it('has exactly 150 problems, 75 of them core', () => {
    expect(dsaProblems).toHaveLength(150)
    expect(dsaProblems.filter((p) => p.core)).toHaveLength(75)
  })

  it('has the expected count in each pattern', () => {
    const counts: Record<string, number> = {
      'dsap-arrays-hashing': 9, 'dsap-two-pointers': 5, 'dsap-sliding-window': 6,
      'dsap-stack': 7, 'dsap-binary-search': 7, 'dsap-linked-list': 11,
      'dsap-trees': 15, 'dsap-heap': 7, 'dsap-backtracking': 9, 'dsap-tries': 3,
      'dsap-graphs': 13, 'dsap-advanced-graphs': 6, 'dsap-dp-1d': 12,
      'dsap-dp-2d': 11, 'dsap-greedy': 8, 'dsap-intervals': 6,
      'dsap-math-geometry': 8, 'dsap-bit-manipulation': 7,
    }
    for (const [patternId, expected] of Object.entries(counts)) {
      expect(dsaProblems.filter((p) => p.patternId === patternId).length, patternId).toBe(expected)
    }
  })

  it('has unique LeetCode numbers', () => {
    const nums = dsaProblems.map((p) => p.leetcodeNumber)
    expect(new Set(nums).size).toBe(150)
  })

  it('passes schema and url validation', () => {
    const c = {
      dsaPatterns, dsaProblems,
      sdPatterns: [], sdQuestions: [], topics: [], topicQuestions: [],
      projects: [], milestones: [], docs: [], readings: [], weeks: [], days: [],
    } as ValidatableContent
    expect(validate(c)).toEqual([])
  })

  it('gives every pattern signals, a template, and pitfalls', () => {
    for (const p of dsaPatterns) {
      expect(p.signals.length, p.id).toBeGreaterThanOrEqual(2)
      expect(p.template.length, p.id).toBeGreaterThan(40)
      expect(p.pitfalls.length, p.id).toBeGreaterThanOrEqual(2)
    }
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/content-dsa.test.ts`
Expected: FAIL, 18 patterns expected but 0 found.

- [ ] **Step 3: Author the 18 patterns**

In `content/dsa.ts`, replace `dsaPatterns` with 18 entries in this exact id and order sequence, which is the study order from spec section 6.5:

1 `dsap-arrays-hashing`, 2 `dsap-two-pointers`, 3 `dsap-sliding-window`, 4 `dsap-stack`, 5 `dsap-binary-search`, 6 `dsap-linked-list`, 7 `dsap-trees`, 8 `dsap-heap`, 9 `dsap-backtracking`, 10 `dsap-tries`, 11 `dsap-graphs`, 12 `dsap-advanced-graphs`, 13 `dsap-dp-1d`, 14 `dsap-dp-2d`, 15 `dsap-greedy`, 16 `dsap-intervals`, 17 `dsap-math-geometry`, 18 `dsap-bit-manipulation`.

Each entry needs `signals` (at least 2 phrases describing when to reach for the pattern in an interview), `template` (a Python code block over 40 characters showing the canonical shape), and `pitfalls` (at least 2). Use this shape, shown complete for the first two so the rest follow the same standard:

```ts
export const dsaPatterns: DsaPattern[] = [
  {
    id: 'dsap-arrays-hashing',
    name: 'Arrays & Hashing',
    order: 1,
    signals: [
      'You need to count, group, or deduplicate values in one pass.',
      'The brute force is a nested loop over pairs and you want O(n).',
      'The question asks whether something has been seen before.',
    ],
    template: `# Count or index by value in one pass.
seen = {}
for i, x in enumerate(nums):
    if target - x in seen:
        return [seen[target - x], i]
    seen[x] = i
return []`,
    pitfalls: [
      'Writing the current value into the map before checking for its complement, which lets an element pair with itself.',
      'Using a list instead of a set for membership tests, turning O(n) into O(n^2).',
      'Forgetting that dict ordering is insertion order, not sorted order.',
    ],
  },
  {
    id: 'dsap-two-pointers',
    name: 'Two Pointers',
    order: 2,
    signals: [
      'The input is sorted, or sorting it does not lose information you need.',
      'You are looking for a pair or triple that satisfies a condition.',
      'You need to compare the ends of an array or string moving inward.',
    ],
    template: `# Converge from both ends on a sorted array.
lo, hi = 0, len(nums) - 1
while lo < hi:
    total = nums[lo] + nums[hi]
    if total == target:
        return [lo, hi]
    if total < target:
        lo += 1
    else:
        hi -= 1
return []`,
    pitfalls: [
      'Forgetting to skip duplicates after a match, which produces repeated answers in 3Sum.',
      'Using <= instead of < in the loop guard, which lets both pointers land on the same index.',
    ],
  },
  // ... 16 more, same standard
]
```

- [ ] **Step 4: Author the 150 problems**

Transcribe spec section 6.5 verbatim into `dsaProblems`. Rules for the transcription:

- `id` is `dsa-<leetcodeNumber>-<kebab-case name>`, matching the LeetCode url slug. Example: LeetCode 235 "Lowest Common Ancestor of a BST" is `dsa-235-lowest-common-ancestor-of-a-binary-search-tree` with url `https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/`. The id slug and the url slug must be identical.
- `difficulty` maps `E` to `'easy'`, `M` to `'medium'`, `H` to `'hard'`.
- `core: true` exactly for the entries the spec marks `core`. The test asserts the total is 75.
- `companies` is the bracketed list in the spec, empty array when absent.
- `minutes` is 20 for easy, 30 for medium, 45 for hard.
- Keep problems grouped by pattern in the spec's order so the file reads as the study sequence.

Shape:

```ts
export const dsaProblems: DsaProblem[] = [
  // --- Arrays & Hashing (9) ---
  {
    id: 'dsa-217-contains-duplicate',
    patternId: 'dsap-arrays-hashing',
    name: 'Contains Duplicate',
    leetcodeNumber: 217,
    url: 'https://leetcode.com/problems/contains-duplicate/',
    difficulty: 'easy',
    core: true,
    companies: [],
    minutes: 20,
  },
  {
    id: 'dsa-1-two-sum',
    patternId: 'dsap-arrays-hashing',
    name: 'Two Sum',
    leetcodeNumber: 1,
    url: 'https://leetcode.com/problems/two-sum/',
    difficulty: 'easy',
    core: true,
    companies: ['amazon'],
    minutes: 20,
  },
  // ... 148 more
]
```

- [ ] **Step 5: Run the content tests**

Run: `pnpm test tests/unit/content-dsa.test.ts`
Expected: PASS, 6 tests. If the core count is off, re-check the spec's `core` markers rather than adjusting the assertion.

- [ ] **Step 6: Run validation and typecheck**

Run: `pnpm validate && pnpm typecheck`
Expected: validation passes and prints `150 problems`.

- [ ] **Step 7: Commit**

```bash
git add content/dsa.ts tests/unit/content-dsa.test.ts
git commit -m "feat: DSA bank with 18 patterns and 150 problems"
```

---

### Task 4: System design content bank

**Files:**
- Modify: `content/system-design.ts`
- Test: `tests/unit/content-system-design.test.ts`

**Interfaces:**
- Consumes: `SdPattern`, `SdQuestion` from `lib/content/schema.ts`.
- Produces: `sdPatterns: SdPattern[]` (20 entries: 10 general, 10 ml) and `sdQuestions: SdQuestion[]` (at least 60) from `content/system-design.ts`.

- [ ] **Step 1: Write the failing content tests**

Create `tests/unit/content-system-design.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sdPatterns, sdQuestions } from '@/content/system-design'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

describe('system design bank', () => {
  it('has 10 general and 10 ml patterns', () => {
    expect(sdPatterns.filter((p) => p.group === 'general')).toHaveLength(10)
    expect(sdPatterns.filter((p) => p.group === 'ml')).toHaveLength(10)
  })

  it('prefixes general patterns with sdp- and ml patterns with mlp-', () => {
    for (const p of sdPatterns) {
      expect(p.id.startsWith(p.group === 'general' ? 'sdp-' : 'mlp-'), p.id).toBe(true)
    }
  })

  it('has at least 60 questions, every one attached to a real pattern', () => {
    expect(sdQuestions.length).toBeGreaterThanOrEqual(60)
    const ids = new Set(sdPatterns.map((p) => p.id))
    for (const q of sdQuestions) expect(ids.has(q.patternId), q.id).toBe(true)
  })

  it('gives every pattern at least two questions', () => {
    for (const p of sdPatterns) {
      expect(sdQuestions.filter((q) => q.patternId === p.id).length, p.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('includes the five AI infrastructure questions', () => {
    for (const id of [
      'sdq-chatgpt-style-chat', 'sdq-enterprise-rag-search', 'sdq-llm-serving-platform',
      'sdq-ai-coding-assistant', 'sdq-agent-safeguards',
    ]) {
      expect(sdQuestions.some((q) => q.id === id), id).toBe(true)
    }
  })

  it('gives every question at least two prompts in each of the six steps', () => {
    for (const q of sdQuestions) {
      for (const step of ['define', 'data', 'architecture', 'evaluate', 'deploy', 'wrapup'] as const) {
        expect(q.steps[step].length, `${q.id}.${step}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('passes schema validation', () => {
    const c = {
      dsaPatterns: [], dsaProblems: [], sdPatterns, sdQuestions,
      topics: [], topicQuestions: [], projects: [], milestones: [],
      docs: [], readings: [], weeks: [], days: [],
    } as ValidatableContent
    expect(validate(c)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/content-system-design.test.ts`
Expected: FAIL, 10 general patterns expected but 0 found.

- [ ] **Step 3: Author the 20 patterns**

Transcribe spec section 6.6. General patterns in order 1 to 10: `sdp-load-balancing-gateways`, `sdp-caching`, `sdp-database-choice-indexing`, `sdp-sharding-replication`, `sdp-consistency-tradeoffs`, `sdp-message-queues`, `sdp-rate-limiting`, `sdp-cdn-object-storage`, `sdp-observability`, `sdp-idempotency-retries`. ML patterns in order 11 to 20: `mlp-retrieval-ranking`, `mlp-feature-stores`, `mlp-model-serving-batching`, `mlp-training-pipelines-registries`, `mlp-monitoring-drift`, `mlp-experimentation`, `mlp-feedback-loops`, `mlp-llm-serving`, `mlp-rag-systems`, `mlp-agent-platforms`.

Each needs `solves` (one sentence) and `tradeoffs` (at least 2). Example:

```ts
{
  id: 'sdp-caching',
  group: 'general',
  name: 'Caching',
  order: 2,
  solves: 'Cuts read latency and backend load by serving repeated reads from memory closer to the caller.',
  tradeoffs: [
    'Cache-aside is simple and resilient but serves a cold miss on every first read; write-through keeps the cache warm at the cost of write latency.',
    'A longer TTL raises hit rate and lowers cost, but widens the window where users see stale data.',
    'Per-node local caches are fast but diverge; a shared cache is consistent but adds a network hop and a failure domain.',
  ],
},
```

- [ ] **Step 4: Author the questions**

Transcribe every question listed in spec section 6.6, keeping the question-to-pattern attachment exactly as the spec assigns it. The five AI questions appear once each, attached to their ML pattern as the spec states: `sdq-llm-serving-platform` under `mlp-model-serving-batching`, `sdq-chatgpt-style-chat` and `sdq-ai-coding-assistant` under `mlp-llm-serving`, `sdq-enterprise-rag-search` under `mlp-rag-systems`, `sdq-agent-safeguards` under `mlp-agent-platforms`.

`tier` is the number the spec gives, `'ml'` for `mlq-` questions, `'ai'` for the five AI questions. `minutes` is 45 for tier 1 and 60 for tier 2, `'ml'`, and `'ai'`.

Each question needs at least two prompts under each of the six steps. For general questions the step labels still key off the same six names but the prompts are worded for distributed systems. Example:

```ts
{
  id: 'sdq-rate-limiter',
  patternId: 'sdp-rate-limiting',
  title: 'Design a rate limiter',
  tier: 1,
  companies: ['amazon', 'google'],
  minutes: 45,
  steps: {
    define: [
      'What is being limited: requests per user, per IP, per API key, or per endpoint?',
      'What is the limit and window, and is a burst allowed above the steady rate?',
      'What happens on rejection: 429 with Retry-After, queue, or silently drop?',
    ],
    data: [
      'What counter state does each algorithm need, and how large is it per key?',
      'Where does that state live so every gateway node agrees?',
    ],
    architecture: [
      'Compare fixed window, sliding window log, sliding window counter, token bucket, and leaky bucket.',
      'Where does the limiter run: client, gateway, service mesh sidecar, or inside the service?',
      'How do you shard counters by key to avoid one hot Redis slot?',
    ],
    evaluate: [
      'How do you measure false rejections and limit accuracy at the window boundary?',
      'What load test would show the fixed-window burst problem?',
    ],
    deploy: [
      'What happens when the counter store is unreachable: fail open or fail closed, and why?',
      'How do you roll out a limit change without a thundering herd?',
    ],
    wrapup: [
      'Restate the algorithm choice and the one property it trades away.',
      'Name the bottleneck at 10x traffic and what you would change first.',
    ],
  },
},
```

- [ ] **Step 5: Run the content tests**

Run: `pnpm test tests/unit/content-system-design.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Run validation and typecheck**

Run: `pnpm validate && pnpm typecheck`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add content/system-design.ts tests/unit/content-system-design.test.ts
git commit -m "feat: system design bank with 20 patterns and 60+ framework questions"
```

---

### Task 5: AI/ML topics bank

**Files:**
- Modify: `content/ai-ml.ts`
- Test: `tests/unit/content-ai-ml.test.ts`

**Interfaces:**
- Consumes: `Topic`, `TopicQuestion` from `lib/content/schema.ts`.
- Produces: `topics: Topic[]` (10 entries) and `topicQuestions: TopicQuestion[]` (at least 110) from `content/ai-ml.ts`.

- [ ] **Step 1: Write the failing content tests**

Create `tests/unit/content-ai-ml.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { topics, topicQuestions } from '@/content/ai-ml'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

const EXPECTED_TOPIC_IDS = [
  'topic-statistics-metrics', 'topic-classical-ml', 'topic-deep-learning',
  'topic-embeddings', 'topic-transformers', 'topic-llm-pretraining',
  'topic-fine-tuning', 'topic-inference', 'topic-rag-evaluation', 'topic-agents-safety',
]

describe('ai/ml bank', () => {
  it('has the 10 expected topics in study order', () => {
    expect(topics.map((t) => t.id)).toEqual(EXPECTED_TOPIC_IDS)
    expect(topics.map((t) => t.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('has at least 110 questions', () => {
    expect(topicQuestions.length).toBeGreaterThanOrEqual(110)
  })

  it('gives every topic at least 10 questions', () => {
    for (const t of topics) {
      expect(topicQuestions.filter((q) => q.topicId === t.id).length, t.id).toBeGreaterThanOrEqual(10)
    }
  })

  it('writes every question as a question', () => {
    for (const q of topicQuestions) {
      expect(q.text.length, q.id).toBeGreaterThan(15)
    }
  })

  it('passes schema validation', () => {
    const c = {
      dsaPatterns: [], dsaProblems: [], sdPatterns: [], sdQuestions: [],
      topics, topicQuestions, projects: [], milestones: [],
      docs: [], readings: [], weeks: [], days: [],
    } as ValidatableContent
    expect(validate(c)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/content-ai-ml.test.ts`
Expected: FAIL, topic ids do not match.

- [ ] **Step 3: Author the 10 topics and their questions**

Transcribe spec section 6.7. Every bullet in each numbered topic becomes one `TopicQuestion` with `minutes: 10`. Question ids are `q-<topic slug>-<kebab summary>`, for example `q-transformers-why-scale-by-sqrt-d`.

Each topic's `summary` is one sentence naming what the reader must be able to explain without notes. Shape:

```ts
export const topics: Topic[] = [
  {
    id: 'topic-statistics-metrics',
    name: 'Statistics & Metrics',
    order: 1,
    summary: 'Explain which metric a problem deserves, why accuracy is usually the wrong one, and how to tell whether an online result is real.',
  },
  // ... 9 more
]

export const topicQuestions: TopicQuestion[] = [
  { id: 'q-statistics-metrics-why-not-accuracy', topicId: 'topic-statistics-metrics',
    text: 'Why is accuracy the wrong metric under class imbalance, and what do you use instead?', minutes: 10 },
  { id: 'q-statistics-metrics-precision-vs-recall', topicId: 'topic-statistics-metrics',
    text: 'When does precision matter more than recall, and when is it the other way round?', minutes: 10 },
  // ... rest
]
```

Where the spec writes a bullet as a fragment ("Perplexity"), expand it into an interview question ("What is perplexity, and what does a perplexity of 20 tell you about a model?").

- [ ] **Step 4: Run the content tests**

Run: `pnpm test tests/unit/content-ai-ml.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run validation and typecheck**

Run: `pnpm validate && pnpm typecheck`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add content/ai-ml.ts tests/unit/content-ai-ml.test.ts
git commit -m "feat: AI/ML study bank with 10 topics and 110+ questions"
```

---

### Task 6: Projects, milestones, and readings

**Files:**
- Modify: `content/projects.ts`, `content/readings.ts`
- Test: `tests/unit/content-projects.test.ts`

**Interfaces:**
- Consumes: `Project`, `Milestone`, `Reading` from `lib/content/schema.ts`; `allDocs` and `docsForProject` from `lib/content/index.ts`.
- Produces: `projects: Project[]` (6), `milestones: Milestone[]` (24), `readings: Reading[]` (at least 40).

- [ ] **Step 1: Write the failing content tests**

Create `tests/unit/content-projects.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { projects, milestones } from '@/content/projects'
import { readings } from '@/content/readings'
import { allDocs, docsForProject } from '@/lib/content/index'

describe('projects bank', () => {
  it('has one project per month, months 1 to 6', () => {
    expect(projects).toHaveLength(6)
    expect(projects.map((p) => p.month).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('gives every project exactly four milestones with orders 1 to 4', () => {
    expect(milestones).toHaveLength(24)
    for (const p of projects) {
      const ms = milestones.filter((m) => m.projectId === p.id)
      expect(ms.map((m) => m.order).sort((a, b) => a - b), p.id).toEqual([1, 2, 3, 4])
    }
  })

  it('makes every milestone a 10-hour weekend pair', () => {
    for (const m of milestones) expect(m.hours, m.id).toBe(10)
  })

  it('generates seven defense docs per project', () => {
    expect(allDocs).toHaveLength(42)
    expect(docsForProject('proj-rag').map((d) => d.name)).toEqual([
      'problem', 'architecture', 'ml', 'tradeoffs', 'scaling', 'failures', 'interview-questions',
    ])
  })

  it('gives the month 1 project full detail', () => {
    const rag = projects.find((p) => p.id === 'proj-rag')!
    expect(rag.defense.length).toBeGreaterThanOrEqual(8)
    expect(rag.constraints.length).toBeGreaterThanOrEqual(4)
    for (const m of milestones.filter((m) => m.projectId === 'proj-rag')) {
      expect(m.scope.length, m.id).toBeGreaterThanOrEqual(3)
      expect(m.acceptance.length, m.id).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('readings bank', () => {
  it('has at least 40 readings', () => {
    expect(readings.length).toBeGreaterThanOrEqual(40)
  })

  it('assigns week 1 the RAG paper and the September 2026 API launches', () => {
    const w1 = readings.filter((r) => r.weekId === 'week-01')
    expect(w1.some((r) => r.id === 'read-rag-2020')).toBe(true)
    expect(w1.filter((r) => r.kind === 'api')).toHaveLength(3)
  })

  it('uses the default minutes for each kind', () => {
    const defaults = { paper: 35, post: 25, api: 10 } as const
    for (const r of readings) expect(r.minutes, r.id).toBe(defaults[r.kind])
  })

  it('gives every reading a working-shaped url and a reason', () => {
    for (const r of readings) {
      expect(r.url.startsWith('https://'), r.id).toBe(true)
      expect(r.why.length, r.id).toBeGreaterThan(20)
    }
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/content-projects.test.ts`
Expected: FAIL, 6 projects expected but 0 found.

- [ ] **Step 3: Author the six projects and 24 milestones**

Transcribe spec section 6.8. Project ids: `proj-rag` (month 1), `proj-advanced-rag` (2), `proj-graph-rag` (3), `proj-agents` (4), `proj-gpt-from-scratch` (5), `proj-fine-tune-eval` (6). Milestone ids are `ms-<project slug>-<order>`, so `ms-rag-1` through `ms-rag-4`, `ms-advanced-rag-1` through `-4`, and so on. Every milestone has `hours: 10`.

`proj-rag` and its four milestones get the full detail the spec gives, including the exact acceptance criteria. Projects 2 to 6 get their four milestone titles from the spec with `scope` of at least one line and `acceptance` of at least one line each; they are deepened when their month arrives.

Shape:

```ts
export const projects: Project[] = [
  {
    id: 'proj-rag',
    month: 1,
    name: 'Production RAG with an eval harness',
    goal: 'A question-answering system over a real corpus of at least 500 documents, with hybrid retrieval, reranking, cited answers, a reusable evaluation harness, guardrails, observability, and a public deployment.',
    architecture: `ingestion -> chunking -> BM25 index + vector index
   -> hybrid retrieval (reciprocal rank fusion)
   -> cross-encoder reranker -> context builder -> LLM -> cited answer
side modules: eval harness | semantic cache | guardrails | tracing`,
    constraints: [
      'Python. Any LLM API. Any vector store.',
      'Must expose an HTTP API and a minimal UI.',
      'Must be deployable on a free tier.',
      'No framework may hide retrieval, fusion, or reranking. Implement those three by hand.',
    ],
    defense: [
      'Why hybrid retrieval over dense alone?',
      'How did you choose chunk size, and what did the eval say?',
      // ... the rest from the spec
    ],
  },
  // ... 5 more
]

export const milestones: Milestone[] = [
  {
    id: 'ms-rag-1',
    projectId: 'proj-rag',
    order: 1,
    title: 'Corpus, chunking, indexes, and a gold eval set',
    hours: 10,
    scope: [
      'Select a corpus of at least 500 real documents.',
      'Implement fixed-size and semantic chunking and compare them.',
      'Build a BM25 index and a vector index over the same chunks.',
      'Write 50 gold questions with reference answers and source spans.',
    ],
    acceptance: [
      'A CLI answers a query with top-k results from both indexes.',
      'The gold eval set is committed and versioned in the repo.',
    ],
  },
  // ... 23 more
]
```

- [ ] **Step 4: Author the readings**

Transcribe spec section 6.3 for week 1 and section 6.9 for the rest. Week assignment: the four month-1 weeks take the readings the spec names for them; the remaining curated papers and posts are assigned two per week from `week-05` onward in the order the spec lists them. `minutes` is 35 for `paper`, 25 for `post`, 10 for `api`. Every `why` is a full sentence explaining what this reading changes about the work that week.

```ts
export const readings: Reading[] = [
  {
    id: 'read-rag-2020',
    weekId: 'week-01',
    kind: 'paper',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    source: 'Lewis et al., Meta AI',
    year: 2020,
    url: 'https://arxiv.org/abs/2005.11401',
    why: 'The paper that named RAG. Read it to see what the original architecture did and did not claim, before you build your own version of it this week.',
    minutes: 35,
  },
  {
    id: 'read-api-claude-fable-5-1',
    weekId: 'week-01',
    kind: 'api',
    title: 'Claude Fable 5.1',
    source: 'Anthropic',
    year: 2026,
    url: 'https://www.anthropic.com/claude/fable',
    why: 'The current frontier model you will most likely generate with this month. Skim the model card for context limits and pricing before you pick a generator.',
    minutes: 10,
  },
  // ... rest
]
```

- [ ] **Step 5: Run the content tests**

Run: `pnpm test tests/unit/content-projects.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Run validation and typecheck**

Run: `pnpm validate && pnpm typecheck`
Expected: both pass. Validation now checks the four-milestone and seven-doc rules against real data.

- [ ] **Step 7: Commit**

```bash
git add content/projects.ts content/readings.ts tests/unit/content-projects.test.ts
git commit -m "feat: six build projects, 24 milestones, and the curated reading list"
```

---

### Task 7: Weeks and the 30-day plan

**Files:**
- Modify: `content/plan.ts`
- Test: `tests/unit/content-plan.test.ts`

**Interfaces:**
- Consumes: every content id from Tasks 3 to 6.
- Produces: `weeks: Week[]` (26 entries) and `days: Day[]` (30 entries) from `content/plan.ts`.

- [ ] **Step 1: Write the failing plan tests**

Create `tests/unit/content-plan.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { weeks, days } from '@/content/plan'
import { content, completionKey } from '@/lib/content/index'
import { validate } from '@/scripts/validate-content'
import type { ValidatableContent } from '@/scripts/validate-content'

describe('plan', () => {
  it('has 26 weeks mapped to six months', () => {
    expect(weeks).toHaveLength(26)
    expect(weeks.map((w) => w.number)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1))
    expect(weeks.filter((w) => w.month === 1).map((w) => w.number)).toEqual([1, 2, 3, 4])
  })

  it('has 30 days numbered 1 to 30', () => {
    expect(days).toHaveLength(30)
    expect(days.map((d) => d.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
  })

  it('marks days 29 and 30 special and the rest by weekday or weekend', () => {
    for (const d of days) {
      const dow = ((d.number - 1) % 7) + 1 // 1 = Monday
      const expected = d.number > 28 ? 'special' : dow >= 6 ? 'weekend' : 'weekday'
      expect(d.kind, d.id).toBe(expected)
    }
  })

  it('plans exactly 1350 minutes in each of weeks 1 to 4', () => {
    for (const w of weeks.filter((x) => x.month === 1)) {
      const total = days
        .filter((d) => d.weekId === w.id && d.number <= 28)
        .flatMap((d) => d.tasks)
        .reduce((s, t) => s + t.minutes, 0)
      expect(total, w.id).toBe(1350)
    }
  })

  it('gives every weekday two DSA tasks of 30 minutes', () => {
    for (const d of days.filter((x) => x.kind === 'weekday')) {
      const dsa = d.tasks.filter((t) => t.track === 'dsa')
      expect(dsa, d.id).toHaveLength(2)
      for (const t of dsa) expect(t.minutes, d.id).toBe(30)
    }
  })

  it('schedules exactly 40 distinct DSA problems across days 1 to 28', () => {
    const ids = days
      .filter((d) => d.number <= 28)
      .flatMap((d) => d.tasks)
      .filter((t) => t.track === 'dsa')
      .map((t) => t.refId)
    expect(ids).toHaveLength(40)
    expect(new Set(ids).size).toBe(40)
  })

  it('schedules 8 system design patterns in month 1, six general and two ml', () => {
    const ids = days
      .filter((d) => d.number <= 28)
      .flatMap((d) => d.tasks)
      .filter((t) => t.track === 'study-sd')
      .map((t) => t.refId)
    expect(ids).toHaveLength(8)
    expect(ids.filter((i) => i.startsWith('sdp-'))).toHaveLength(6)
    expect(ids.filter((i) => i.startsWith('mlp-'))).toHaveLength(2)
  })

  it('gives every weekend day a build session keyed to that day', () => {
    for (const d of days.filter((x) => x.kind === 'weekend')) {
      const build = d.tasks.find((t) => t.track === 'build')
      expect(build, d.id).toBeDefined()
      expect(build!.taskId, d.id).toBe(`${d.id}-build`)
    }
  })

  it('has an acceptance task for each of the four RAG milestones', () => {
    const accepted = days
      .flatMap((d) => d.tasks)
      .filter((t) => t.refId.startsWith('ms-rag-') && t.track === 'review')
      .map((t) => t.refId)
    expect(accepted.sort()).toEqual(['ms-rag-1', 'ms-rag-2', 'ms-rag-3', 'ms-rag-4'])
  })

  it('uses unique completion keys everywhere', () => {
    const keys = days.flatMap((d) => d.tasks).map(completionKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('passes full content validation', () => {
    expect(validate(content as ValidatableContent)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/content-plan.test.ts`
Expected: FAIL, 26 weeks expected but 0 found.

- [ ] **Step 3: Author the 26 weeks**

Ids `week-01` through `week-26`. `month` is `Math.ceil(number / 4)` capped at 6, matching the spec's table: weeks 1 to 4 month 1, 5 to 8 month 2, 9 to 13 month 3, 14 to 17 month 4, 18 to 22 month 5, 23 to 26 month 6. Author `month` explicitly per the spec table rather than computing it, because months 3 and 5 have five weeks.

`theme` is one line. `targets` for month 1 come from spec section 6.3 headings; for weeks 5 to 26 they come from spec section 6.4's rules, one target line per track.

```ts
export const weeks: Week[] = [
  {
    id: 'week-01', number: 1, month: 1,
    theme: 'Arrays and two pointers. Gateways and caching. Metrics and classical ML. RAG skeleton.',
    targets: [
      'DSA: 10 problems across arrays and hashing, and two pointers.',
      'System design: load balancing and gateways, caching.',
      'AI/ML: statistics and metrics, classical ML.',
      'Reading: the 2020 RAG paper, contextual retrieval, and the three September 2026 model launches.',
      'Build: milestone 1, corpus ingested, both indexes built, 50 gold questions written.',
    ],
  },
  // ... 25 more
]
```

- [ ] **Step 4: Author days 1 to 28**

Follow the exact per-day budget table in spec section 6.2, and draw the item ids from spec section 6.3. Day-to-weekday mapping: day 1 is Monday, so `((number - 1) % 7) + 1` gives 1 to 5 for weekdays and 6 or 7 for weekend days.

Per-day composition:

- Monday and Wednesday: two `dsa` tasks at 30, one `study-sd` task at 90 whose `refId` is the **pattern** id and whose `note` names that day's questions.
- Tuesday and Thursday: two `dsa` tasks at 30, one `study-ml` task at 90 whose `refId` is the topic id.
- Friday: two `dsa` tasks at 30, then readings, then `review-week` at 10 with `taskId` `<dayId>-review-week`. Weeks 2, 3, and 4 use two readings at 40. Week 1 uses two readings at 25 plus three `api` readings at 10.
- Saturday: one `build` task at 300, `refId` the week's milestone, `taskId` `<dayId>-build`, `note` naming the first half of the milestone scope.
- Sunday: one `build` task at 290, `taskId` `<dayId>-build`, plus one `review` task at 10 whose `refId` is the milestone id itself. That second task is the acceptance check and is what the milestone meter counts.

```ts
export const days: Day[] = [
  {
    id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday',
    tasks: [
      { refId: 'dsa-217-contains-duplicate', track: 'dsa', minutes: 30 },
      { refId: 'dsa-242-valid-anagram', track: 'dsa', minutes: 30 },
      { refId: 'sdp-load-balancing-gateways', track: 'study-sd', minutes: 90,
        note: 'Work through: design an API gateway, then a URL shortener.' },
    ],
  },
  // day-02 ... day-28
  {
    id: 'day-06', number: 6, weekId: 'week-01', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-1', taskId: 'day-06-build', track: 'build', minutes: 300,
        note: 'Session 1 of 2: select and ingest the corpus, implement both chunking strategies and compare them.' },
    ],
  },
  {
    id: 'day-07', number: 7, weekId: 'week-01', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-1', taskId: 'day-07-build', track: 'build', minutes: 290,
        note: 'Session 2 of 2: build the BM25 and vector indexes, write the 50-question gold eval set.' },
      { refId: 'ms-rag-1', track: 'review', minutes: 10,
        note: 'Acceptance check: does the CLI answer from both indexes, and is the gold set committed?' },
    ],
  },
]
```

The 40 DSA problems are exactly the four ten-problem lists in spec section 6.3, two per weekday in the order listed.

- [ ] **Step 5: Author days 29 and 30**

```ts
{
  id: 'day-29', number: 29, weekId: 'week-04', kind: 'special',
  tasks: [
    { refId: 'review-mock', taskId: 'day-29-review-mock', track: 'review', minutes: 150,
      note: 'Self-run mock loop: one timed medium from a covered pattern, one system design question drawn at random from the month, ten AI/ML questions answered aloud and self-graded.' },
  ],
},
{
  id: 'day-30', number: 30, weekId: 'week-04', kind: 'special',
  tasks: [
    { refId: 'review-retro', taskId: 'day-30-review-retro', track: 'review', minutes: 60,
      note: 'Retrospective against the four month-1 checks. Set the month 2 start date.' },
    { refId: 'doc-rag-problem', track: 'review', minutes: 30 },
    { refId: 'doc-rag-architecture', track: 'review', minutes: 30 },
    { refId: 'doc-rag-ml', track: 'review', minutes: 30 },
    { refId: 'doc-rag-tradeoffs', track: 'review', minutes: 30 },
    { refId: 'doc-rag-scaling', track: 'review', minutes: 30 },
    { refId: 'doc-rag-failures', track: 'review', minutes: 30 },
    { refId: 'doc-rag-interview-questions', track: 'review', minutes: 30 },
    { refId: 'review-publish', taskId: 'day-30-review-publish', track: 'review', minutes: 30,
      note: 'Publish the RAG project write-up and the seven defense documents.' },
  ],
},
```

Days 29 and 30 belong to `week-04` but have `number > 28`, so the weekly minute rule skips them by design.

- [ ] **Step 6: Run the plan tests**

Run: `pnpm test tests/unit/content-plan.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 7: Run the whole suite, validation, typecheck, and build**

Run: `pnpm test && pnpm validate && pnpm typecheck && pnpm build`
Expected: all pass. Validation prints `150 problems, 30 days`.

- [ ] **Step 8: Commit**

```bash
git add content/plan.ts tests/unit/content-plan.test.ts
git commit -m "feat: 26-week roadmap and the fully specified 30-day month 1 plan"
```

---

### Task 8: Progress store, selectors, and migrations

**Files:**
- Create: `lib/progress/types.ts`, `lib/progress/selectors.ts`, `lib/progress/migrations.ts`, `lib/progress/storage.ts`, `lib/progress/store.ts`, `lib/progress/useHydrated.ts`
- Test: `tests/unit/selectors.test.ts`, `tests/unit/migrations.test.ts`, `tests/unit/store.test.ts`

**Interfaces:**
- Consumes: `lib/date.ts`, `lib/content/index.ts`.
- Produces:
  - `lib/progress/types.ts`: `ProgressBlob`, `progressBlobSchema`, `CURRENT_VERSION = 1`, `emptyBlob(): ProgressBlob`
  - `lib/progress/selectors.ts`: `dayNumber`, `weekNumber`, `streak`, `weekProgress`, `month1Checks`, `tasksForDay`
  - `lib/progress/migrations.ts`: `migrate(raw: unknown): ProgressBlob`
  - `lib/progress/storage.ts`: `safeGet(key)`, `safeSet(key, value)`, `storageAvailable(): boolean`
  - `lib/progress/store.ts`: `useProgress` zustand hook with `setStartDate`, `toggle`, `setHours`, `reset`, `importBlob`, `exportBlob`
  - `lib/progress/useHydrated.ts`: `useHydrated(): boolean`

- [ ] **Step 1: Write the failing selector tests**

Create `tests/unit/selectors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { dayNumber, weekNumber, streak, weekProgress, month1Checks } from '@/lib/progress/selectors'

describe('dayNumber', () => {
  it('is 1 on the start date', () => {
    expect(dayNumber('2026-09-07', '2026-09-07')).toBe(1)
  })
  it('counts forward', () => {
    expect(dayNumber('2026-09-07', '2026-09-20')).toBe(14)
  })
  it('is null with no start date', () => {
    expect(dayNumber(null, '2026-09-07')).toBeNull()
  })
  it('clamps to 1 before the start date', () => {
    expect(dayNumber('2026-09-07', '2026-09-01')).toBe(1)
  })
})

describe('weekNumber', () => {
  it('puts days 1 to 7 in week 1 and day 8 in week 2', () => {
    expect(weekNumber('2026-09-07', '2026-09-07')).toBe(1)
    expect(weekNumber('2026-09-07', '2026-09-13')).toBe(1)
    expect(weekNumber('2026-09-07', '2026-09-14')).toBe(2)
  })
})

describe('streak', () => {
  it('is 0 with no completions', () => {
    expect(streak({}, '2026-09-10')).toBe(0)
  })
  it('counts consecutive days ending today', () => {
    const completed = { a: '2026-09-08', b: '2026-09-09', c: '2026-09-10' }
    expect(streak(completed, '2026-09-10')).toBe(3)
  })
  it('survives one day of grace when today has nothing yet', () => {
    const completed = { a: '2026-09-08', b: '2026-09-09' }
    expect(streak(completed, '2026-09-10')).toBe(2)
  })
  it('breaks after a two-day gap', () => {
    const completed = { a: '2026-09-05', b: '2026-09-06' }
    expect(streak(completed, '2026-09-10')).toBe(0)
  })
  it('counts a day once no matter how many items it holds', () => {
    const completed = { a: '2026-09-10', b: '2026-09-10', c: '2026-09-10' }
    expect(streak(completed, '2026-09-10')).toBe(1)
  })
})

describe('weekProgress', () => {
  it('reports planned and completed minutes per track for a week', () => {
    const r = weekProgress(1, {})
    expect(r.planned.dsa).toBe(300)
    expect(r.planned.build).toBe(600)
    expect(r.plannedTotal).toBe(1350)
    expect(r.completedTotal).toBe(0)
  })

  it('adds a completed task into its track', () => {
    const r = weekProgress(1, { 'dsa-217-contains-duplicate': '2026-09-07' })
    expect(r.completed.dsa).toBe(30)
    expect(r.completedTotal).toBe(30)
  })
})

describe('month1Checks', () => {
  it('reports zeros for an empty record', () => {
    const c = month1Checks({})
    expect(c.problems).toEqual({ done: 0, target: 40 })
    expect(c.patterns).toEqual({ done: 0, target: 8 })
    expect(c.milestones).toEqual({ done: 0, target: 4 })
    expect(c.docs).toEqual({ done: 0, target: 7 })
  })

  it('counts a completed problem, pattern, milestone, and doc', () => {
    const c = month1Checks({
      'dsa-217-contains-duplicate': '2026-09-07',
      'sdp-caching': '2026-09-09',
      'ms-rag-1': '2026-09-13',
      'doc-rag-problem': '2026-10-06',
    })
    expect(c.problems.done).toBe(1)
    expect(c.patterns.done).toBe(1)
    expect(c.milestones.done).toBe(1)
    expect(c.docs.done).toBe(1)
  })

  it('ignores a DSA problem that is not in the month 1 plan', () => {
    const c = month1Checks({ 'dsa-51-n-queens': '2026-09-07' })
    expect(c.problems.done).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/selectors.test.ts`
Expected: FAIL, cannot resolve `@/lib/progress/selectors`.

- [ ] **Step 3: Implement `lib/progress/types.ts`**

```ts
import { z } from 'zod'

export const CURRENT_VERSION = 1

export const progressBlobSchema = z.object({
  version: z.literal(CURRENT_VERSION),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  completed: z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  hours: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.number().min(0).max(24)),
  settings: z.object({ theme: z.enum(['dark', 'light', 'system']) }),
})

export type ProgressBlob = z.infer<typeof progressBlobSchema>

export function emptyBlob(): ProgressBlob {
  return { version: CURRENT_VERSION, startDate: null, completed: {}, hours: {}, settings: { theme: 'dark' } }
}
```

- [ ] **Step 4: Implement `lib/progress/selectors.ts`**

```ts
import { diffDays, addDays } from '@/lib/date'
import { content, completionKey } from '@/lib/content/index'
import type { DayTask } from '@/lib/content/schema'

export type Track = DayTask['track']
export type Completed = Record<string, string>

const TRACKS: Track[] = ['dsa', 'study-sd', 'study-ml', 'reading', 'build', 'review']

export function dayNumber(startDate: string | null, today: string): number | null {
  if (!startDate) return null
  return Math.max(1, diffDays(startDate, today) + 1)
}

export function weekNumber(startDate: string | null, today: string): number | null {
  const d = dayNumber(startDate, today)
  return d === null ? null : Math.ceil(d / 7)
}

export function streak(completed: Completed, today: string): number {
  const dates = new Set(Object.values(completed))
  let cursor = dates.has(today) ? today : dates.has(addDays(today, -1)) ? addDays(today, -1) : null
  if (!cursor) return 0
  let n = 0
  while (dates.has(cursor)) {
    n += 1
    cursor = addDays(cursor, -1)
  }
  return n
}

function emptyTracks(): Record<Track, number> {
  return { dsa: 0, 'study-sd': 0, 'study-ml': 0, reading: 0, build: 0, review: 0 }
}

export function tasksForDay(dayNum: number): DayTask[] {
  return content.days.find((d) => d.number === dayNum)?.tasks ?? []
}

export interface WeekProgress {
  planned: Record<Track, number>
  completed: Record<Track, number>
  plannedTotal: number
  completedTotal: number
}

export function weekProgress(weekNum: number, completed: Completed): WeekProgress {
  const weekId = `week-${String(weekNum).padStart(2, '0')}`
  const tasks = content.days
    .filter((d) => d.weekId === weekId && d.number <= 28)
    .flatMap((d) => d.tasks)

  const planned = emptyTracks()
  const done = emptyTracks()
  for (const t of tasks) {
    planned[t.track] += t.minutes
    if (completed[completionKey(t)]) done[t.track] += t.minutes
  }
  const sum = (r: Record<Track, number>) => TRACKS.reduce((s, k) => s + r[k], 0)
  return { planned, completed: done, plannedTotal: sum(planned), completedTotal: sum(done) }
}

export interface Meter { done: number; target: number }

export interface Month1Checks {
  problems: Meter
  patterns: Meter
  milestones: Meter
  docs: Meter
}

export function month1Checks(completed: Completed): Month1Checks {
  const month1Tasks = content.days.filter((d) => d.number <= 28).flatMap((d) => d.tasks)
  const scheduled = new Set(month1Tasks.map((t) => t.refId))

  const countScheduled = (pred: (id: string) => boolean) =>
    Object.keys(completed).filter((id) => scheduled.has(id) && pred(id)).length

  return {
    problems: { done: countScheduled((id) => id.startsWith('dsa-')), target: 40 },
    patterns: {
      done: countScheduled((id) => id.startsWith('sdp-') || id.startsWith('mlp-')),
      target: 8,
    },
    milestones: {
      done: Object.keys(completed).filter((id) => id.startsWith('ms-rag-')).length,
      target: 4,
    },
    docs: {
      done: Object.keys(completed).filter((id) => id.startsWith('doc-rag-')).length,
      target: 7,
    },
  }
}
```

- [ ] **Step 5: Run the selector tests**

Run: `pnpm test tests/unit/selectors.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 6: Write the failing migration tests**

Create `tests/unit/migrations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { migrate } from '@/lib/progress/migrations'
import { emptyBlob, CURRENT_VERSION } from '@/lib/progress/types'

describe('migrate', () => {
  it('passes a current blob through unchanged', () => {
    const blob = { ...emptyBlob(), startDate: '2026-09-07', completed: { 'dsa-1-two-sum': '2026-09-07' } }
    expect(migrate(blob)).toEqual(blob)
  })

  it('upgrades a version 0 blob that has no settings or hours', () => {
    const v0 = { version: 0, startDate: '2026-09-07', completed: { 'dsa-1-two-sum': '2026-09-07' } }
    const out = migrate(v0)
    expect(out.version).toBe(CURRENT_VERSION)
    expect(out.startDate).toBe('2026-09-07')
    expect(out.completed).toEqual({ 'dsa-1-two-sum': '2026-09-07' })
    expect(out.hours).toEqual({})
    expect(out.settings).toEqual({ theme: 'dark' })
  })

  it('throws on a blob that is not an object', () => {
    expect(() => migrate('nope')).toThrow(/not an object/i)
  })

  it('throws on a future version', () => {
    expect(() => migrate({ ...emptyBlob(), version: 99 })).toThrow(/newer version/i)
  })

  it('throws with a readable message on a malformed completed map', () => {
    expect(() => migrate({ ...emptyBlob(), completed: { 'dsa-1-two-sum': 'not-a-date' } })).toThrow(/completed/i)
  })
})
```

- [ ] **Step 7: Run it to confirm it fails**

Run: `pnpm test tests/unit/migrations.test.ts`
Expected: FAIL, cannot resolve `@/lib/progress/migrations`.

- [ ] **Step 8: Implement `lib/progress/migrations.ts`**

```ts
import { progressBlobSchema, emptyBlob, CURRENT_VERSION } from './types'
import type { ProgressBlob } from './types'

type Step = (blob: Record<string, unknown>) => Record<string, unknown>

/** Keyed by the version being upgraded FROM. */
const STEPS: Record<number, Step> = {
  0: (b) => ({
    ...b,
    version: 1,
    hours: b.hours ?? {},
    settings: b.settings ?? { theme: 'dark' },
    completed: b.completed ?? {},
    startDate: b.startDate ?? null,
  }),
}

export function migrate(raw: unknown): ProgressBlob {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Progress file is not an object.')
  }
  let blob = { ...(raw as Record<string, unknown>) }
  const declared = typeof blob.version === 'number' ? blob.version : 0
  if (declared > CURRENT_VERSION) {
    throw new Error(`Progress file was written by a newer version of the app (v${declared}).`)
  }
  for (let v = declared; v < CURRENT_VERSION; v += 1) {
    const step = STEPS[v]
    if (!step) throw new Error(`No migration from version ${v}.`)
    blob = step(blob)
  }
  const parsed = progressBlobSchema.safeParse({ ...emptyBlob(), ...blob })
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new Error(`Progress file is invalid at "${first.path.join('.')}": ${first.message}`)
  }
  return parsed.data
}
```

- [ ] **Step 9: Run the migration tests**

Run: `pnpm test tests/unit/migrations.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 10: Implement `lib/progress/storage.ts`**

```ts
export function storageAvailable(): boolean {
  try {
    const k = '__aeg_probe__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage is blocked or full. State stays in memory for this session.
  }
}

export function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Same as above.
  }
}
```

- [ ] **Step 11: Implement `lib/progress/store.ts`**

```ts
'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { todayIso } from '@/lib/date'
import { emptyBlob, CURRENT_VERSION } from './types'
import type { ProgressBlob } from './types'
import { migrate } from './migrations'
import { safeGet, safeSet, safeRemove } from './storage'

export const STORAGE_KEY = 'aeg.progress.v1'

interface ProgressActions {
  setStartDate: (iso: string) => void
  toggle: (itemId: string) => void
  setHours: (date: string, hours: number) => void
  reset: () => void
  importBlob: (json: string) => void
  exportBlob: () => string
}

export type ProgressState = ProgressBlob & ProgressActions

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...emptyBlob(),

      setStartDate: (iso) => set({ startDate: iso }),

      toggle: (itemId) =>
        set((s) => {
          const next = { ...s.completed }
          if (next[itemId]) delete next[itemId]
          else next[itemId] = todayIso()
          return { completed: next }
        }),

      setHours: (date, hours) =>
        set((s) => ({ hours: { ...s.hours, [date]: hours } })),

      reset: () => {
        safeRemove(STORAGE_KEY)
        set(emptyBlob())
      },

      importBlob: (json) => {
        const blob = migrate(JSON.parse(json))
        set(blob)
      },

      exportBlob: () => {
        const s = get()
        const blob: ProgressBlob = {
          version: CURRENT_VERSION,
          startDate: s.startDate,
          completed: s.completed,
          hours: s.hours,
          settings: s.settings,
        }
        return JSON.stringify(blob, null, 2)
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: safeGet,
        setItem: safeSet,
        removeItem: safeRemove,
      })),
      partialize: (s) => ({
        version: s.version, startDate: s.startDate,
        completed: s.completed, hours: s.hours, settings: s.settings,
      }),
    },
  ),
)
```

- [ ] **Step 12: Implement `lib/progress/useHydrated.ts`**

```ts
'use client'

import { useEffect, useState } from 'react'
import { useProgress } from './store'

/** True once zustand has rehydrated from storage, so server and client markup agree. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useProgress.persist.hasHydrated())
  useEffect(() => {
    const unsub = useProgress.persist.onFinishHydration(() => setHydrated(true))
    if (useProgress.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])
  return hydrated
}
```

- [ ] **Step 13: Write the store tests**

Create `tests/unit/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress, STORAGE_KEY } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('progress store', () => {
  it('toggles an item on and off', () => {
    const { toggle } = useProgress.getState()
    toggle('dsa-1-two-sum')
    expect(useProgress.getState().completed['dsa-1-two-sum']).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    toggle('dsa-1-two-sum')
    expect(useProgress.getState().completed['dsa-1-two-sum']).toBeUndefined()
  })

  it('persists to localStorage under the versioned key', () => {
    useProgress.getState().setStartDate('2026-09-07')
    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).state.startDate).toBe('2026-09-07')
  })

  it('round-trips through export and import', () => {
    const s = useProgress.getState()
    s.setStartDate('2026-09-07')
    s.toggle('dsa-1-two-sum')
    const json = useProgress.getState().exportBlob()

    useProgress.getState().reset()
    expect(useProgress.getState().startDate).toBeNull()

    useProgress.getState().importBlob(json)
    expect(useProgress.getState().startDate).toBe('2026-09-07')
    expect(useProgress.getState().completed['dsa-1-two-sum']).toBeTruthy()
  })

  it('leaves state untouched when an import fails', () => {
    const s = useProgress.getState()
    s.setStartDate('2026-09-07')
    expect(() => useProgress.getState().importBlob('{"version":1,"completed":"nope"}')).toThrow()
    expect(useProgress.getState().startDate).toBe('2026-09-07')
  })

  it('clears storage on reset', () => {
    useProgress.getState().setStartDate('2026-09-07')
    useProgress.getState().reset()
    expect(useProgress.getState().completed).toEqual({})
  })
})
```

- [ ] **Step 14: Run the store tests**

Run: `pnpm test tests/unit/store.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 15: Run the whole suite and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all pass.

- [ ] **Step 16: Commit**

```bash
git add lib/progress tests/unit/selectors.test.ts tests/unit/migrations.test.ts tests/unit/store.test.ts
git commit -m "feat: progress store with selectors, migrations, and safe storage"
```

---

### Task 9: App shell, theme tokens, and responsive navigation

**Files:**
- Create: `components/Shell.tsx`, `components/SideNav.tsx`, `components/BottomNav.tsx`, `components/TopBar.tsx`, `components/StorageBanner.tsx`, `components/Checkbox.tsx`, `components/Meter.tsx`, `lib/nav.ts`
- Modify: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Test: `tests/unit/nav.test.ts`

**Interfaces:**
- Consumes: `useProgress`, `useHydrated`, selectors, `lib/date.ts`.
- Produces:
  - `lib/nav.ts`: `NAV_ITEMS: { href: string; label: string; short: string; primary: boolean }[]`
  - `components/Shell.tsx`: default export `Shell({ children }: { children: React.ReactNode })`
  - `components/Checkbox.tsx`: default export `Checkbox({ itemId, label, meta }: { itemId: string; label: React.ReactNode; meta?: React.ReactNode })`, a client component that toggles the store and renders a 44px-minimum row
  - `components/Meter.tsx`: default export `Meter({ label, done, target }: { label: string; done: number; target: number })`

- [ ] **Step 1: Write the failing nav test**

Create `tests/unit/nav.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { NAV_ITEMS } from '@/lib/nav'

describe('nav', () => {
  it('has the eight sections', () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual([
      '/today', '/roadmap', '/dsa', '/system-design', '/projects', '/ai-ml', '/reading', '/settings',
    ])
  })

  it('marks exactly five as primary for the mobile tab bar', () => {
    expect(NAV_ITEMS.filter((i) => i.primary)).toHaveLength(5)
  })

  it('keeps every short label under 10 characters', () => {
    for (const i of NAV_ITEMS) expect(i.short.length, i.href).toBeLessThanOrEqual(10)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/nav.test.ts`
Expected: FAIL, cannot resolve `@/lib/nav`.

- [ ] **Step 3: Implement `lib/nav.ts`**

```ts
export interface NavItem {
  href: string
  label: string
  short: string
  primary: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/today', label: 'Today', short: 'Today', primary: true },
  { href: '/roadmap', label: 'Roadmap', short: 'Roadmap', primary: true },
  { href: '/dsa', label: 'DSA', short: 'DSA', primary: true },
  { href: '/system-design', label: 'System Design', short: 'Design', primary: true },
  { href: '/projects', label: 'Projects', short: 'Build', primary: true },
  { href: '/ai-ml', label: 'AI / ML', short: 'AI/ML', primary: false },
  { href: '/reading', label: 'Reading', short: 'Reading', primary: false },
  { href: '/settings', label: 'Settings', short: 'Settings', primary: false },
]
```

- [ ] **Step 4: Run the nav test**

Run: `pnpm test tests/unit/nav.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Load the frontend-design skill and build the glass theme system**

Invoke the `frontend-design` skill BEFORE writing any styling. Then read spec section 13 in full — it was
rewritten and is the binding requirement. Define tokens in `app/globals.css` using the Tailwind v4
CSS-first convention (`@theme`), since Task 1 confirmed v4 with no config file.

Build exactly three surface tiers and no more:

| Tier | Use | Treatment |
|---|---|---|
| Ground | page background | Opaque base plus one soft radial gradient wash. Never translucent. |
| Panel | cards, nav rail, tab bar, question rows | Translucent fill, `backdrop-filter: blur()`, 1px hairline border, subtle inner top highlight |
| Raised | modals, popovers, More sheet, hover | Panel plus more blur, stronger border, drop shadow |

Hard requirements, each of which is separately testable:

- **Contrast survives the blur.** Body text on a Panel clears 4.5:1 and large text 3:1, against the busiest
  ground beneath it. If a fill is too transparent to hold that, raise the fill — do not lower the text.
- **At most two stacked blurred layers** anywhere on screen. `backdrop-filter` is the most expensive thing
  on the page and stacking it drops scroll framerate on mid-range phones.
- **Graceful degradation.** `@supports not (backdrop-filter: blur(1px))` raises fill opacity to a solid tint.
  Honour `prefers-reduced-transparency` the same way, and `prefers-reduced-motion` by disabling transitions.
- **Borders carry the shape.** In light mode a glass panel is nearly invisible without its hairline border,
  so the border is required, not decorative.
- **Two real themes.** Dark ground is a deep desaturated blue-grey, never pure black, so translucent panels
  have something to pick up. Light ground is a warm off-white with a soft tint wash, never pure white, and
  its panels need a stronger border because translucency alone reads as nothing on a light ground. The
  accent must clear contrast on BOTH grounds; if one accent cannot, that theme defines its own accent step.
- **Token structure.** Every colour is a token on bare `:root`. Dark overrides appear under BOTH
  `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]`, so an explicit choice wins in
  either direction and the system default still works. Never define a colour only inside a media block.
- **Code blocks are solid, not glass.** Blur behind code is unreadable.

- [ ] **Step 5b: Build the theme toggle with no flash of wrong theme**

Add a toggle in the top bar cycling dark / light / system, persisted to the progress blob's `settings.theme`.

The hard part is first paint. Emit a small blocking inline script in `app/layout.tsx` `<head>` that reads
the stored theme and stamps `data-theme` on `<html>` BEFORE the page renders. Without it the page paints
dark, then snaps to light, which looks broken. Read the raw `localStorage` key directly in that script —
do not wait for the zustand store to hydrate, which is far too late.

Write a test asserting the resolved theme survives a reload, and one asserting the toggle cycles all three
states in order.

- [ ] **Step 6: Implement `components/StorageBanner.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { storageAvailable } from '@/lib/progress/storage'

export default function StorageBanner() {
  const [blocked, setBlocked] = useState(false)
  useEffect(() => setBlocked(!storageAvailable()), [])
  const [dismissed, setDismissed] = useState(false)
  if (!blocked || dismissed) return null
  return (
    <div role="status" className="flex items-center justify-between gap-3 border-b border-[var(--warning)] bg-[var(--surface)] px-4 py-2 text-sm">
      <span>Progress is not being saved in this browser. Export before you close the tab.</span>
      <button onClick={() => setDismissed(true)} className="min-h-11 px-3 underline">Dismiss</button>
    </div>
  )
}
```

- [ ] **Step 7: Implement `components/Checkbox.tsx`**

```tsx
'use client'

import type { ReactNode } from 'react'
import { useProgress } from '@/lib/progress/store'
import { useHydrated } from '@/lib/progress/useHydrated'

interface Props {
  itemId: string
  label: ReactNode
  meta?: ReactNode
}

export default function Checkbox({ itemId, label, meta }: Props) {
  const hydrated = useHydrated()
  const done = useProgress((s) => Boolean(s.completed[itemId]))
  const toggle = useProgress((s) => s.toggle)

  return (
    <label
      className="flex min-h-11 w-full cursor-pointer items-start gap-3 rounded px-2 py-2 hover:bg-[var(--surface-raised)]"
      data-completed={hydrated && done ? 'true' : 'false'}
    >
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0"
        checked={hydrated ? done : false}
        onChange={() => toggle(itemId)}
        aria-label={typeof label === 'string' ? label : itemId}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className={hydrated && done ? 'text-[var(--text-muted)] line-through' : ''}>
          {hydrated && done ? '✓ ' : ''}{label}
        </span>
        {meta ? <span className="font-mono text-xs text-[var(--text-muted)]">{meta}</span> : null}
      </span>
    </label>
  )
}
```

- [ ] **Step 8: Implement `components/Meter.tsx`**

```tsx
interface Props { label: string; done: number; target: number }

export default function Meter({ label, done, target }: Props) {
  const pct = target === 0 ? 0 : Math.min(100, Math.round((done / target) * 100))
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm">{label}</span>
        <span className="font-mono text-xs text-[var(--text-muted)]">{done}/{target}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded bg-[var(--surface-raised)]"
        role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={target} aria-label={label}
      >
        <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Implement `SideNav`, `BottomNav`, `TopBar`, and `Shell`**

`SideNav` renders all eight `NAV_ITEMS` as links, hidden below 768px (`hidden md:flex`). `BottomNav` is fixed to the bottom, shown only below 768px (`flex md:hidden`), and renders the five primary items plus a "More" button that opens a sheet with the remaining three. Every tab is at least 44px tall. `TopBar` is a client component showing day number and streak, plus the weekly hours meter only at `md` and above.

`Shell` composes them:

```tsx
import type { ReactNode } from 'react'
import SideNav from './SideNav'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import StorageBanner from './StorageBanner'

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <StorageBanner />
      <div className="flex">
        <SideNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8">{children}</main>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
```

Mark the active link with `aria-current="page"` using `usePathname`.

- [ ] **Step 10: Wire the layout and redirect the index route**

`app/layout.tsx` wraps `{children}` in `Shell` and sets `metadata` with title `AI Engineer Practice Guide`. `app/page.tsx` becomes:

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/today')
}
```

- [ ] **Step 11: Verify the shell renders and the build passes**

Run: `pnpm build && pnpm test && pnpm typecheck`
Expected: all pass. Then run `pnpm dev` and confirm at 1280px the sidebar shows and the bottom bar does not, and at 375px the reverse.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: app shell with responsive sidebar and mobile tab bar"
```

---

### Task 10: Today page

**Files:**
- Create: `app/today/page.tsx`, `components/TodayTasks.tsx`, `components/StartDateSetup.tsx`
- Test: `tests/unit/today.test.tsx`

**Interfaces:**
- Consumes: `tasksForDay`, `dayNumber`, `weekNumber`, `streak`, `weekProgress`, `month1Checks`, `resolveRef`, `completionKey`, `Checkbox`, `Meter`.
- Produces: `components/TodayTasks.tsx` default export `TodayTasks()`, a client component that renders the whole Today body.

- [ ] **Step 1: Write the failing Today test**

Create `tests/unit/today.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodayTasks from '@/components/TodayTasks'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'
import { todayIso } from '@/lib/date'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('Today', () => {
  it('asks the user to set a start date when none is set', () => {
    render(<TodayTasks />)
    expect(screen.getByText(/set your start date/i)).toBeDefined()
  })

  it('renders day 1 tasks when the start date is today', async () => {
    useProgress.getState().setStartDate(todayIso())
    render(<TodayTasks />)
    expect(await screen.findByText(/day 1 of 180/i)).toBeDefined()
    expect(screen.getByText(/Contains Duplicate/)).toBeDefined()
  })

  it('checking a task updates the store', async () => {
    useProgress.getState().setStartDate(todayIso())
    render(<TodayTasks />)
    const boxes = await screen.findAllByRole('checkbox')
    await userEvent.click(boxes[0])
    expect(Object.keys(useProgress.getState().completed).length).toBe(1)
  })

  it('shows the four month 1 meters', async () => {
    useProgress.getState().setStartDate(todayIso())
    render(<TodayTasks />)
    expect(await screen.findByText(/problems solved/i)).toBeDefined()
    expect(screen.getByText(/patterns covered/i)).toBeDefined()
    expect(screen.getByText(/milestones accepted/i)).toBeDefined()
    expect(screen.getByText(/defense docs/i)).toBeDefined()
  })

  it('falls back to week targets past day 30', async () => {
    const { addDays } = await import('@/lib/date')
    useProgress.getState().setStartDate(addDays(todayIso(), -40))
    render(<TodayTasks />)
    expect(await screen.findByText(/this week/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/today.test.tsx`
Expected: FAIL, cannot resolve `@/components/TodayTasks`.

- [ ] **Step 3: Implement `components/StartDateSetup.tsx`**

A client component with two buttons: the most recent Monday and the next Monday, each labelled with its date, plus one line explaining that day 1 must be a Monday so the weekly rhythm lines up. Clicking calls `setStartDate`.

- [ ] **Step 4: Implement `components/TodayTasks.tsx`**

Client component. Reads `startDate` and `completed` from the store, computes `todayIso()` once in state on mount to avoid a hydration mismatch at midnight, then:

- If `startDate` is null, render `StartDateSetup`.
- Otherwise compute `dayNumber` and `weekNumber`. Header line reads `Day {n} of 180` with the week number beside it.
- If `dayNumber <= 30`, render `tasksForDay(dayNumber)` grouped by track, each task as a `Checkbox` with `itemId={completionKey(task)}`, label from `resolveRef(task.refId)`, and meta showing the minutes. Show `task.note` under the label when present.
- If `dayNumber > 30`, render the current week's `targets` under a "This week" heading.
- Render the streak, the weekly hours meter, and the four month-1 meters labelled "Problems solved", "Patterns covered", "Milestones accepted", "Defense docs".
- Guard everything with `useHydrated`, rendering skeleton rows until true.

Label resolution helper, in the same file:

```ts
function labelFor(refId: string): string {
  const item = resolveRef(refId)
  if (!item) {
    const fixed: Record<string, string> = {
      'review-week': 'Weekly review',
      'review-mock': 'Self-run mock loop',
      'review-retro': 'Month retrospective',
      'review-publish': 'Publish the project write-up',
    }
    return fixed[refId] ?? refId
  }
  if ('name' in item && typeof item.name === 'string') return item.name
  if ('title' in item && typeof item.title === 'string') return item.title
  if ('text' in item && typeof item.text === 'string') return item.text
  return item.id
}
```

- [ ] **Step 5: Implement `app/today/page.tsx`**

```tsx
import TodayTasks from '@/components/TodayTasks'

export const metadata = { title: 'Today | AI Engineer Practice Guide' }

export default function TodayPage() {
  return <TodayTasks />
}
```

- [ ] **Step 6: Run the Today tests**

Run: `pnpm test tests/unit/today.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 7: Run everything**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: Today page with day tasks, streak, and month 1 meters"
```

---

### Task 11: Roadmap page

**Files:**
- Create: `app/roadmap/page.tsx`, `components/RoadmapTimeline.tsx`
- Test: `tests/unit/roadmap.test.tsx`

**Interfaces:**
- Consumes: `content.weeks`, `content.days`, `content.projects`, `dayNumber`, `Checkbox`.
- Produces: `components/RoadmapTimeline.tsx` default export `RoadmapTimeline()`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/roadmap.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoadmapTimeline from '@/components/RoadmapTimeline'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('Roadmap', () => {
  it('lists six months', () => {
    render(<RoadmapTimeline />)
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(screen.getByText(new RegExp(`month ${n}`, 'i'))).toBeDefined()
    }
  })

  it('names the month 1 build project', () => {
    render(<RoadmapTimeline />)
    expect(screen.getByText(/Production RAG/i)).toBeDefined()
  })

  it('expands month 1 into four weeks with day tasks', async () => {
    render(<RoadmapTimeline />)
    await userEvent.click(screen.getByRole('button', { name: /month 1/i }))
    expect(await screen.findByText(/week 1/i)).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: /week 1/i }))
    expect(await screen.findByText(/Contains Duplicate/)).toBeDefined()
  })

  it('expands a later month to week targets only', async () => {
    render(<RoadmapTimeline />)
    await userEvent.click(screen.getByRole('button', { name: /month 5/i }))
    expect(await screen.findByText(/week 18/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/roadmap.test.tsx`
Expected: FAIL, cannot resolve `@/components/RoadmapTimeline`.

- [ ] **Step 3: Implement `components/RoadmapTimeline.tsx`**

Client component. Renders six month sections as a vertical timeline. Each month is a `<button>` that toggles expansion, labelled `Month {n}` plus the project name and study emphasis. Expanded, it lists its weeks. A month-1 week is itself expandable to its days, each day rendering its tasks as `Checkbox` rows. Weeks in months 2 to 6 render `targets` as a plain list with no checkboxes. The current day, derived from `dayNumber`, gets the accent highlight and `aria-current="step"`. Use `el.hidden` or conditional rendering, never `style.display`.

- [ ] **Step 4: Implement `app/roadmap/page.tsx`**

```tsx
import RoadmapTimeline from '@/components/RoadmapTimeline'

export const metadata = { title: 'Roadmap | AI Engineer Practice Guide' }

export default function RoadmapPage() {
  return <RoadmapTimeline />
}
```

- [ ] **Step 5: Run the roadmap tests**

Run: `pnpm test tests/unit/roadmap.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Run everything and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add -A
git commit -m "feat: roadmap timeline with expandable months and weeks"
```

---

### Task 12: DSA index and pattern pages

**Files:**
- Create: `app/dsa/page.tsx`, `app/dsa/[pattern]/page.tsx`, `components/DsaIndex.tsx`, `components/ProblemList.tsx`
- Test: `tests/unit/dsa-pages.test.tsx`

**Interfaces:**
- Consumes: `content.dsaPatterns`, `content.dsaProblems`, `slugOf`, `idFromSlug`, `Checkbox`.
- Produces: `components/ProblemList.tsx` default export `ProblemList({ problems }: { problems: DsaProblem[] })`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/dsa-pages.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DsaIndex from '@/components/DsaIndex'
import ProblemList from '@/components/ProblemList'
import { dsaProblems } from '@/content/dsa'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('DSA index', () => {
  it('shows all 18 pattern cards', () => {
    render(<DsaIndex />)
    expect(screen.getAllByRole('link', { name: /problems/i })).toHaveLength(18)
  })

  it('filters to core problems', async () => {
    render(<DsaIndex />)
    await userEvent.click(screen.getByRole('button', { name: /^core/i }))
    expect(screen.getByText(/75 problems/i)).toBeDefined()
  })

  it('filters by company', async () => {
    render(<DsaIndex />)
    await userEvent.click(screen.getByRole('button', { name: /meta/i }))
    const metaCount = dsaProblems.filter((p) => p.companies.includes('meta')).length
    expect(screen.getByText(new RegExp(`${metaCount} problems`, 'i'))).toBeDefined()
  })
})

describe('ProblemList', () => {
  it('links each problem to LeetCode and toggles its checkbox', async () => {
    const problems = dsaProblems.filter((p) => p.patternId === 'dsap-two-pointers')
    render(<ProblemList problems={problems} />)
    const link = screen.getByRole('link', { name: /3Sum/ })
    expect(link.getAttribute('href')).toBe('https://leetcode.com/problems/3sum/')

    const boxes = screen.getAllByRole('checkbox')
    await userEvent.click(boxes[0])
    expect(Object.keys(useProgress.getState().completed)).toContain(problems[0].id)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/dsa-pages.test.tsx`
Expected: FAIL, cannot resolve `@/components/DsaIndex`.

- [ ] **Step 3: Implement `components/DsaIndex.tsx`**

Client component with a filter state of `'all' | 'core' | 'google' | 'meta' | 'amazon'`. Renders the company-emphasis note from spec section 6.5 above the grid. Each pattern card links to `/dsa/${slugOf(pattern.id)}` and shows the pattern name, the filtered problem count as `{n} problems`, the core count, and a completion bar. Grid is one column below 768px, two or three above.

- [ ] **Step 4: Implement `components/ProblemList.tsx`**

Client component. Below 768px each problem is a stacked card: name and difficulty on the first line, company tags, core badge, and the checkbox on the second. At 768px and above it is a row. The name is an external link with `target="_blank"` and `rel="noreferrer"`. The checkbox uses `Checkbox` with `itemId={problem.id}`. The container has `overflow-x-auto` so nothing forces page-level horizontal scroll.

- [ ] **Step 5: Implement the two routes**

`app/dsa/page.tsx` renders `DsaIndex`. `app/dsa/[pattern]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import { idFromSlug } from '@/lib/content/ids'
import ProblemList from '@/components/ProblemList'

export function generateStaticParams() {
  return content.dsaPatterns.map((p) => ({ pattern: p.id.slice('dsap-'.length) }))
}

export default async function DsaPatternPage({ params }: { params: Promise<{ pattern: string }> }) {
  const { pattern: slug } = await params
  const pattern = content.dsaPatterns.find((p) => p.id === idFromSlug('dsap', slug))
  if (!pattern) notFound()
  const problems = content.dsaProblems.filter((p) => p.patternId === pattern.id)
  return (
    <article className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{pattern.name}</h1>
      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wide text-[var(--text-muted)]">Reach for this when</h2>
        <ul className="list-disc pl-5">{pattern.signals.map((s) => <li key={s}>{s}</li>)}</ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wide text-[var(--text-muted)]">Template</h2>
        <pre className="overflow-x-auto rounded bg-[var(--surface)] p-4 font-mono text-sm"><code>{pattern.template}</code></pre>
      </section>
      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wide text-[var(--text-muted)]">Pitfalls</h2>
        <ul className="list-disc pl-5">{pattern.pitfalls.map((p) => <li key={p}>{p}</li>)}</ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wide text-[var(--text-muted)]">Problems</h2>
        <ProblemList problems={problems} />
      </section>
    </article>
  )
}
```

If the installed Next.js version types `params` as a plain object rather than a Promise, drop the `await` and the `Promise<>` wrapper. Check the version scaffolded in Task 1.

- [ ] **Step 6: Run the tests**

Run: `pnpm test tests/unit/dsa-pages.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 7: Run everything and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add -A
git commit -m "feat: DSA index with filters and pattern pages with templates"
```

---

### Task 13: System design index and pattern pages

**Files:**
- Create: `app/system-design/page.tsx`, `app/system-design/[pattern]/page.tsx`, `components/SdIndex.tsx`, `components/QuestionFramework.tsx`
- Test: `tests/unit/sd-pages.test.tsx`

**Interfaces:**
- Consumes: `content.sdPatterns`, `content.sdQuestions`, `Checkbox`.
- Produces: `components/QuestionFramework.tsx` default export `QuestionFramework({ question }: { question: SdQuestion })`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/sd-pages.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SdIndex from '@/components/SdIndex'
import QuestionFramework from '@/components/QuestionFramework'
import { sdQuestions } from '@/content/system-design'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('System design index', () => {
  it('shows a General group and an ML group of ten each', () => {
    render(<SdIndex />)
    expect(screen.getByRole('heading', { name: /general/i })).toBeDefined()
    expect(screen.getByRole('heading', { name: /ml (and|&) llm/i })).toBeDefined()
    expect(screen.getAllByRole('link')).toHaveLength(20)
  })
})

describe('QuestionFramework', () => {
  it('renders the six steps with their prompts', async () => {
    const q = sdQuestions.find((x) => x.id === 'sdq-rate-limiter')!
    render(<QuestionFramework question={q} />)
    await userEvent.click(screen.getByRole('button', { name: /rate limiter/i }))
    for (const label of [
      /define the problem/i, /data/i, /architecture|core components/i,
      /evaluate|scale/i, /deploy/i, /wrap up/i,
    ]) {
      expect(await screen.findByText(label)).toBeDefined()
    }
    expect(screen.getByText(q.steps.define[0])).toBeDefined()
  })

  it('toggles its own checkbox', async () => {
    const q = sdQuestions.find((x) => x.id === 'sdq-rate-limiter')!
    render(<QuestionFramework question={q} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(useProgress.getState().completed['sdq-rate-limiter']).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/sd-pages.test.tsx`
Expected: FAIL, cannot resolve `@/components/SdIndex`.

- [ ] **Step 3: Implement `components/SdIndex.tsx`**

Two headed groups, "General" and "ML & LLM", each a grid of ten cards linking to `/system-design/${slugOf(pattern.id)}`. Each card shows the pattern name, its question count, and completion.

- [ ] **Step 4: Implement `components/QuestionFramework.tsx`**

Client component. A collapsed row shows the question title, tier badge, company chips, minutes, and its `Checkbox`. Expanding reveals the six steps as headings with their prompts as lists. Step headings are worded by group: for a question whose pattern is `group: 'ml'` use "Define the problem", "Data pipeline", "Model architecture", "Train and evaluate", "Deploy and monitor", "Wrap up"; for `group: 'general'` use "Define the problem", "Data model", "Core components", "Scale and consistency", "Deploy and operate", "Wrap up".

- [ ] **Step 5: Implement the two routes**

Mirror Task 12's route shape, using `idFromSlug('sdp', slug)` and falling back to `idFromSlug('mlp', slug)` when the first lookup misses, since both groups share the `/system-design/` path. `generateStaticParams` returns a slug for every one of the 20 patterns.

- [ ] **Step 6: Run the tests**

Run: `pnpm test tests/unit/sd-pages.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Run everything and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add -A
git commit -m "feat: system design pages with the six-step question framework"
```

---

### Task 14: AI/ML and Projects pages

**Files:**
- Create: `app/ai-ml/page.tsx`, `app/ai-ml/[topic]/page.tsx`, `app/projects/page.tsx`, `app/projects/[project]/page.tsx`, `components/TopicIndex.tsx`, `components/ProjectDetail.tsx`
- Test: `tests/unit/ai-ml-pages.test.tsx`, `tests/unit/project-pages.test.tsx`

**Interfaces:**
- Consumes: `content.topics`, `content.topicQuestions`, `content.projects`, `content.milestones`, `docsForProject`, `Checkbox`.
- Produces: `components/ProjectDetail.tsx` default export `ProjectDetail({ projectId }: { projectId: string })`.

- [ ] **Step 1: Write the failing AI/ML test**

Create `tests/unit/ai-ml-pages.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TopicIndex from '@/components/TopicIndex'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('AI/ML index', () => {
  it('shows ten topic cards in study order', () => {
    render(<TopicIndex />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(10)
    expect(links[0].textContent).toMatch(/statistics/i)
    expect(links[9].textContent).toMatch(/agents/i)
  })

  it('states that a question is checked only when it can be answered cold', () => {
    render(<TopicIndex />)
    expect(screen.getByText(/answer it cold, without notes/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Write the failing projects test**

Create `tests/unit/project-pages.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectDetail from '@/components/ProjectDetail'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('Project detail', () => {
  it('shows the goal, four milestones, and seven defense docs', () => {
    render(<ProjectDetail projectId="proj-rag" />)
    expect(screen.getByText(/hybrid retrieval/i)).toBeDefined()
    expect(screen.getAllByText(/milestone \d/i)).toHaveLength(4)
    expect(screen.getAllByRole('checkbox', { name: /doc/i })).toHaveLength(7)
  })

  it('shows acceptance criteria for a milestone', () => {
    render(<ProjectDetail projectId="proj-rag" />)
    expect(screen.getByText(/gold eval set is committed/i)).toBeDefined()
  })

  it('lists the defense questions', () => {
    render(<ProjectDetail projectId="proj-rag" />)
    expect(screen.getByText(/why hybrid retrieval over dense alone/i)).toBeDefined()
  })

  it('toggles a milestone', async () => {
    render(<ProjectDetail projectId="proj-rag" />)
    const boxes = screen.getAllByRole('checkbox')
    await userEvent.click(boxes[0])
    expect(Object.keys(useProgress.getState().completed).length).toBe(1)
  })
})
```

- [ ] **Step 3: Run both to confirm they fail**

Run: `pnpm test tests/unit/ai-ml-pages.test.tsx tests/unit/project-pages.test.tsx`
Expected: FAIL, components do not resolve.

- [ ] **Step 4: Implement `components/TopicIndex.tsx` and the topic route**

`TopicIndex` renders ten cards ordered by `order`, each linking to `/ai-ml/${slugOf(topic.id)}` with its summary and completion count. Above the grid, one line: "Check a question only when you can answer it cold, without notes."

`app/ai-ml/[topic]/page.tsx` renders the topic name, its summary, then its questions as `Checkbox` rows with `itemId={question.id}`.

- [ ] **Step 5: Implement `components/ProjectDetail.tsx` and the project routes**

`ProjectDetail` renders, in order: the project name and month, the goal, the architecture in a `<pre>` with `overflow-x-auto`, the constraints as a list, the four milestones each as a card with title, scope list, acceptance list, hours, and a `Checkbox` keyed on the milestone id, then the seven defense docs as `Checkbox` rows labelled `Doc: {name}`, then the defense questions as a plain list.

`app/projects/page.tsx` lists the six projects as month-ordered cards linking to `/projects/${slugOf(project.id)}`.

- [ ] **Step 6: Run the tests**

Run: `pnpm test tests/unit/ai-ml-pages.test.tsx tests/unit/project-pages.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 7: Run everything and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add -A
git commit -m "feat: AI/ML topic pages and project pages with milestones and docs"
```

---

### Task 15: Feed parsers and route handlers

**Files:**
- Create: `lib/feed/types.ts`, `lib/feed/arxiv.ts`, `lib/feed/hn.ts`, `app/api/feed/arxiv/route.ts`, `app/api/feed/hn/route.ts`
- Create fixtures: `tests/fixtures/arxiv.xml`, `tests/fixtures/hn.json`
- Test: `tests/unit/feed.test.ts`

**Interfaces:**
- Consumes: `lib/date.ts`.
- Produces:
  - `lib/feed/types.ts`: `FeedItem { id, title, url, source, date, meta? }`, `FeedResponse { items: FeedItem[]; error?: string }`
  - `lib/feed/arxiv.ts`: `parseArxiv(xml: string, now: string): FeedItem[]`, `ARXIV_URL: string`
  - `lib/feed/hn.ts`: `parseHn(json: unknown): FeedItem[]`, `hnUrl(now: Date): string`

- [ ] **Step 1: Save the fixtures**

Fetch one real response from each API and save it, trimmed to about six entries:

```bash
mkdir -p tests/fixtures
curl -s "http://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=6" -o tests/fixtures/arxiv.xml
curl -s "https://hn.algolia.com/api/v1/search_by_date?query=LLM&tags=story&hitsPerPage=6" -o tests/fixtures/hn.json
```

- [ ] **Step 2: Write the failing feed tests**

Create `tests/unit/feed.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseArxiv } from '@/lib/feed/arxiv'
import { parseHn } from '@/lib/feed/hn'

const xml = readFileSync('tests/fixtures/arxiv.xml', 'utf8')
const hnJson = JSON.parse(readFileSync('tests/fixtures/hn.json', 'utf8'))

describe('parseArxiv', () => {
  it('extracts items with id, title, url, and date', () => {
    const items = parseArxiv(xml, '2099-01-01')
    expect(items.length).toBeGreaterThan(0)
    for (const i of items) {
      expect(i.id).toBeTruthy()
      expect(i.title.length).toBeGreaterThan(5)
      expect(i.url.startsWith('http')).toBe(true)
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(i.source).toBe('arxiv')
    }
  })

  it('collapses whitespace inside titles', () => {
    const items = parseArxiv(xml, '2099-01-01')
    for (const i of items) expect(i.title).not.toMatch(/\s{2,}|\n/)
  })

  it('filters to the last seven days relative to now', () => {
    const items = parseArxiv(xml, '1999-01-01')
    expect(items).toHaveLength(0)
  })

  it('returns an empty array for malformed xml', () => {
    expect(parseArxiv('<not-a-feed/>', '2099-01-01')).toEqual([])
    expect(parseArxiv('', '2099-01-01')).toEqual([])
  })
})

describe('parseHn', () => {
  it('maps hits to feed items', () => {
    const items = parseHn(hnJson)
    expect(items.length).toBeGreaterThan(0)
    for (const i of items) {
      expect(i.source).toBe('hn')
      expect(i.url.startsWith('http')).toBe(true)
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('falls back to the HN permalink when a story has no url', () => {
    const items = parseHn({ hits: [{ objectID: '42', title: 'Ask HN: something', created_at: '2026-09-01T00:00:00Z', points: 30, url: null }] })
    expect(items[0].url).toBe('https://news.ycombinator.com/item?id=42')
  })

  it('returns an empty array for a malformed payload', () => {
    expect(parseHn(null)).toEqual([])
    expect(parseHn({})).toEqual([])
    expect(parseHn({ hits: 'nope' })).toEqual([])
  })

  it('skips hits with no title', () => {
    expect(parseHn({ hits: [{ objectID: '1', created_at: '2026-09-01T00:00:00Z' }] })).toEqual([])
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm test tests/unit/feed.test.ts`
Expected: FAIL, cannot resolve `@/lib/feed/arxiv`.

- [ ] **Step 4: Implement `lib/feed/types.ts`**

```ts
export interface FeedItem {
  id: string
  title: string
  url: string
  source: 'arxiv' | 'hn'
  date: string
  meta?: string
}

export interface FeedResponse {
  items: FeedItem[]
  error?: string
  fetchedAt: string
}
```

- [ ] **Step 5: Implement `lib/feed/arxiv.ts`**

Parse with regular expressions rather than adding an XML dependency, since the Atom shape is fixed.

```ts
import { diffDays } from '@/lib/date'
import type { FeedItem } from './types'

export const ARXIV_URL =
  'http://export.arxiv.org/api/query' +
  '?search_query=' + encodeURIComponent('cat:cs.CL OR cat:cs.LG OR cat:cs.IR') +
  '&sortBy=submittedDate&sortOrder=descending&max_results=40'

const ENTRY = /<entry>([\s\S]*?)<\/entry>/g

function tag(entry: string, name: string): string {
  const m = entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? m[1].trim() : ''
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function parseArxiv(xml: string, now: string): FeedItem[] {
  const items: FeedItem[] = []
  for (const m of xml.matchAll(ENTRY)) {
    const entry = m[1]
    const id = clean(tag(entry, 'id'))
    const title = clean(tag(entry, 'title'))
    const published = tag(entry, 'published').slice(0, 10)
    if (!id || !title || !/^\d{4}-\d{2}-\d{2}$/.test(published)) continue
    if (diffDays(published, now) > 7 || diffDays(published, now) < 0) continue
    items.push({ id, title, url: id, source: 'arxiv', date: published, meta: clean(tag(entry, 'name')) })
  }
  return items
}
```

- [ ] **Step 6: Implement `lib/feed/hn.ts`**

```ts
import type { FeedItem } from './types'

export function hnUrl(now: Date): string {
  const weekAgo = Math.floor(now.getTime() / 1000) - 7 * 86_400
  const query = encodeURIComponent('LLM OR RAG OR "AI agents" OR transformer')
  return `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story` +
    `&numericFilters=points>20,created_at_i>${weekAgo}&hitsPerPage=40`
}

interface Hit {
  objectID?: string
  title?: string | null
  url?: string | null
  points?: number
  created_at?: string
}

export function parseHn(payload: unknown): FeedItem[] {
  if (typeof payload !== 'object' || payload === null) return []
  const hits = (payload as { hits?: unknown }).hits
  if (!Array.isArray(hits)) return []

  const items: FeedItem[] = []
  for (const raw of hits as Hit[]) {
    const id = raw.objectID
    const title = raw.title
    const created = raw.created_at
    if (!id || !title || !created) continue
    const date = created.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    items.push({
      id: `hn-${id}`,
      title,
      url: raw.url ?? `https://news.ycombinator.com/item?id=${id}`,
      source: 'hn',
      date,
      meta: typeof raw.points === 'number' ? `${raw.points} points` : undefined,
    })
  }
  return items
}
```

- [ ] **Step 7: Run the feed tests**

Run: `pnpm test tests/unit/feed.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 8: Implement the two route handlers**

`app/api/feed/arxiv/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { ARXIV_URL, parseArxiv } from '@/lib/feed/arxiv'
import { todayIso } from '@/lib/date'
import type { FeedResponse } from '@/lib/feed/types'

export const revalidate = 21600

export async function GET() {
  const fetchedAt = new Date().toISOString()
  try {
    const res = await fetch(ARXIV_URL, { next: { revalidate } })
    if (!res.ok) throw new Error(`arxiv responded ${res.status}`)
    const body: FeedResponse = { items: parseArxiv(await res.text(), todayIso()), fetchedAt }
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json({ items: [], error: 'unavailable', fetchedAt } satisfies FeedResponse)
  }
}
```

`app/api/feed/hn/route.ts` is the same shape, calling `hnUrl(new Date())` and `parseHn(await res.json())`.

Both return status 200 on failure so the client renders an empty state rather than an error boundary.

- [ ] **Step 9: Verify the routes respond**

Run `pnpm dev`, then:

```bash
curl -s localhost:3000/api/feed/arxiv | head -c 300
curl -s localhost:3000/api/feed/hn | head -c 300
```

Expected: JSON with a non-empty `items` array from both.

- [ ] **Step 10: Run everything and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add -A
git commit -m "feat: arXiv and Hacker News feed parsers with cached route handlers"
```

---

### Task 16: Reading page

**Files:**
- Create: `app/reading/page.tsx`, `components/ReadingTabs.tsx`, `components/LiveFeed.tsx`
- Test: `tests/unit/reading.test.tsx`

**Interfaces:**
- Consumes: `content.readings`, `content.weeks`, `Checkbox`, the two feed routes.
- Produces: `components/ReadingTabs.tsx` default export `ReadingTabs()`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/reading.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReadingTabs from '@/components/ReadingTabs'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})
afterEach(() => vi.unstubAllGlobals())

describe('Reading', () => {
  it('opens on the curated tab grouped by week', () => {
    render(<ReadingTabs />)
    expect(screen.getByRole('tab', { name: /curated/i })).toHaveProperty('ariaSelected', 'true')
    expect(screen.getByText(/week 1/i)).toBeDefined()
    expect(screen.getByText(/Retrieval-Augmented Generation/i)).toBeDefined()
  })

  it('toggles a reading', async () => {
    render(<ReadingTabs />)
    const boxes = screen.getAllByRole('checkbox')
    await userEvent.click(boxes[0])
    expect(Object.keys(useProgress.getState().completed).length).toBe(1)
  })

  it('shows live items when both feeds respond', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      new Response(JSON.stringify({
        items: [{ id: '1', title: url.includes('arxiv') ? 'A paper' : 'A story', url: 'https://x.test', source: url.includes('arxiv') ? 'arxiv' : 'hn', date: '2026-09-05' }],
        fetchedAt: '2026-09-06T00:00:00Z',
      }), { status: 200 })))

    render(<ReadingTabs />)
    await userEvent.click(screen.getByRole('tab', { name: /live/i }))
    expect(await screen.findByText('A paper')).toBeDefined()
    expect(await screen.findByText('A story')).toBeDefined()
  })

  it('shows an empty state when a feed fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ items: [], error: 'unavailable', fetchedAt: '2026-09-06T00:00:00Z' }), { status: 200 })))

    render(<ReadingTabs />)
    await userEvent.click(screen.getByRole('tab', { name: /live/i }))
    expect(await screen.findAllByText(/feed unavailable/i)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/reading.test.tsx`
Expected: FAIL, cannot resolve `@/components/ReadingTabs`.

- [ ] **Step 3: Implement `components/LiveFeed.tsx`**

Client component taking `{ endpoint, heading }`. Fetches on mount into `{ status: 'loading' | 'ready' | 'empty', items, fetchedAt }`. Renders a column of items with title as an external link, date, and meta. On `error` or zero items, renders "Feed unavailable, showing curated list only".

- [ ] **Step 4: Implement `components/ReadingTabs.tsx`**

Two tabs with `role="tablist"` and `role="tab"`, `aria-selected` reflecting state. Curated groups `content.readings` by `weekId` in week order, showing week number, title, source, year, kind badge, the `why` line, an external link, and a `Checkbox` keyed on the reading id. Live renders two `LiveFeed` columns, stacked below 768px and side by side above.

- [ ] **Step 5: Implement `app/reading/page.tsx`**

Renders `ReadingTabs` with metadata title `Reading | AI Engineer Practice Guide`.

- [ ] **Step 6: Run the tests**

Run: `pnpm test tests/unit/reading.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 7: Run everything and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add -A
git commit -m "feat: reading page with curated list and live arXiv and HN feeds"
```

---

### Task 17: Settings page

**Files:**
- Create: `app/settings/page.tsx`, `components/Settings.tsx`
- Test: `tests/unit/settings.test.tsx`

**Interfaces:**
- Consumes: `useProgress`, `mostRecentMonday`, `addDays`, `todayIso`, `migrate`.
- Produces: `components/Settings.tsx` default export `Settings()`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/settings.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from '@/components/Settings'
import { useProgress } from '@/lib/progress/store'
import { emptyBlob } from '@/lib/progress/types'
import { mostRecentMonday, todayIso, isMonday } from '@/lib/date'

beforeEach(() => {
  window.localStorage.clear()
  useProgress.setState(emptyBlob())
})

describe('Settings', () => {
  it('offers the most recent Monday and the next Monday', () => {
    render(<Settings />)
    const recent = mostRecentMonday(todayIso())
    expect(screen.getByRole('button', { name: new RegExp(recent) })).toBeDefined()
    expect(screen.getByText(/day 1 must be a Monday/i)).toBeDefined()
  })

  it('sets a Monday start date', async () => {
    render(<Settings />)
    const recent = mostRecentMonday(todayIso())
    await userEvent.click(screen.getByRole('button', { name: new RegExp(recent) }))
    const set = useProgress.getState().startDate!
    expect(set).toBe(recent)
    expect(isMonday(set)).toBe(true)
  })

  it('reports a readable error for a malformed import', async () => {
    render(<Settings />)
    const input = screen.getByLabelText(/import progress/i) as HTMLInputElement
    const file = new File(['{"version":1,"completed":"nope"}'], 'p.json', { type: 'application/json' })
    await userEvent.upload(input, file)
    expect(await screen.findByRole('alert')).toBeDefined()
  })

  it('leaves state untouched after a failed import', async () => {
    useProgress.getState().setStartDate('2026-09-07')
    render(<Settings />)
    const input = screen.getByLabelText(/import progress/i) as HTMLInputElement
    await userEvent.upload(input, new File(['not json'], 'p.json', { type: 'application/json' }))
    await screen.findByRole('alert')
    expect(useProgress.getState().startDate).toBe('2026-09-07')
  })

  it('requires confirmation before resetting', async () => {
    useProgress.getState().toggle('dsa-1-two-sum')
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /^reset progress$/i }))
    expect(useProgress.getState().completed['dsa-1-two-sum']).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /yes, erase everything/i }))
    expect(useProgress.getState().completed).toEqual({})
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test tests/unit/settings.test.tsx`
Expected: FAIL, cannot resolve `@/components/Settings`.

- [ ] **Step 3: Implement `components/Settings.tsx`**

Client component with four sections.

Start date: two buttons labelled with the ISO dates of `mostRecentMonday(todayIso())` and `addDays(mostRecentMonday(todayIso()), 7)`, plus the explanatory line "Day 1 must be a Monday so the weekly rhythm lines up."

Export: a button that builds `exportBlob()`, wraps it in a `Blob`, and triggers a download named `ai-engineer-guide-progress-${todayIso()}.json` via an object URL. Revoke the URL afterwards.

Import: a labelled file input. On change, read the file as text, call `importBlob` inside try/catch, and on failure set an error message rendered in a `role="alert"` element. On success show a confirmation and clear the input.

Reset: a button that flips into a confirmation pair, "Yes, erase everything" and "Cancel". Only the confirm button calls `reset()`.

- [ ] **Step 4: Implement `app/settings/page.tsx`**

Renders `Settings` with metadata title `Settings | AI Engineer Practice Guide`.

- [ ] **Step 5: Run the tests**

Run: `pnpm test tests/unit/settings.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Run everything and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add -A
git commit -m "feat: settings with start date, export, import, and guarded reset"
```

---

### Task 18: End-to-end test, README, and public deploy

**Files:**
- Create: `tests/e2e/progress.spec.ts`, `README.md`, `CONTRIBUTING.md`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: every page from Tasks 10 to 17.
- Produces: a passing e2e suite at both viewports and a live Vercel URL.

- [ ] **Step 1: Write the end-to-end suite**

Spec section 11.2 was rewritten and is the binding requirement — read it. This is a real suite, not a smoke
test. Write one spec FILE per area under `tests/e2e/`. Every spec runs at BOTH configured viewports
(1280x800 desktop, 390x844 mobile) unless the area is explicitly viewport-specific.

Add `data-testid="side-nav"` to SideNav's root and `data-testid="bottom-nav"` to BottomNav's root.

| File | Area | What it must assert |
|---|---|---|
| `onboarding.spec.ts` | first run | No start date shows the setup card; picking a date snaps to Monday; Today then renders day 1's tasks |
| `persistence.spec.ts` | progress | Check a task, reload, still checked; streak reads 1 |
| `export-import.spec.ts` | data | Export downloads a file named for today; reset clears; re-importing restores every checked item; a malformed file shows an alert and changes nothing |
| `cross-page.spec.ts` | shared identity | Checking a problem on a DSA pattern page marks it done on Today AND moves the month-1 problems meter. **This is the most important test in the suite** — it is the behaviour most likely to break silently. |
| `routes.spec.ts` | coverage | Walk all 13 routes plus one example of each of the 4 dynamic routes: HTTP 200, a visible `h1`, and zero console errors |
| `navigation.spec.ts` | shell | Desktop shows the rail and hides the tab bar; mobile the reverse; the More sheet opens and reaches all three secondary pages; the active item carries `aria-current` |
| `dsa.spec.ts` | filters | All / Core / company chips change the visible count; a pattern page shows signals, template, pitfalls and the right problem count; the LeetCode link href matches the data |
| `system-design.spec.ts` | framework | Expanding a question reveals all six steps; an ML question and a general question show DIFFERENT step headings |
| `reading.spec.ts` | feeds | Curated groups by week and toggles. Live renders items with both routes stubbed to succeed via `page.route`, and shows a per-column empty state with both stubbed to fail. Never hit the real APIs — the suite must pass offline. |
| `theme.spec.ts` | appearance | Toggle cycles dark / light / system; choice survives reload; no wrong-theme flash on first paint; body text over a glass panel passes a computed contrast assertion in BOTH themes |
| `responsive.spec.ts` | mobile | At 390px NO page scrolls horizontally, across all 13 routes, not one sample. Every interactive target is at least 44px. |
| `not-found.spec.ts` | errors | A bad dynamic slug renders the not-found page rather than crashing |

- [ ] **Step 1b: Add the accessibility pass**

Install `@axe-core/playwright`. Add `tests/e2e/a11y.spec.ts` running axe against Today, a DSA pattern page,
and Reading, in BOTH themes. The bar is zero critical violations. Also assert keyboard-only traversal
reaches every control on Today and Settings.

- [ ] **Step 2: Run the e2e suite**

Run: `pnpm test:e2e`
Expected: PASS at both viewports. If the horizontal-overflow check fails, find the offending element with `document.querySelectorAll('*')` filtered by `scrollWidth > clientWidth` and give it `overflow-x: auto` or `min-width: 0`.

- [ ] **Step 3: Write the README**

`README.md` covers: what the guide is and who it is for; the weekly template table from spec section 6.2; the six-month sequence table; how progress is stored and that it never leaves the browser; how to run locally (`pnpm install`, `pnpm dev`); how to run checks (`pnpm validate`, `pnpm test`, `pnpm test:e2e`); the content schema summary and id conventions; and a link to the spec.

- [ ] **Step 4: Write CONTRIBUTING.md**

Explain the one-pull-request path for adding content: pick the right file in `content/`, add one object following the schema, run `pnpm validate` and `pnpm test`, open the PR. State that `prebuild` runs validation so a broken content change cannot deploy. Include a worked example adding one DSA problem and one reading.

- [ ] **Step 5: Add the e2e job to CI**

Append to `.github/workflows/ci.yml`:

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
```

- [ ] **Step 6: Push to GitHub**

Create the public repository and push:

```bash
gh repo create ai-engineer-guide --public --source=. --remote=origin --description "An interview-first practice guide and daily tracker for AI engineers."
git push -u origin main
```

- [ ] **Step 7: Deploy to Vercel**

Use the Vercel MCP connection to link the project and deploy production from `main`. Confirm afterwards that `pnpm validate` ran during the build and that the deployment URL serves `/today`.

- [ ] **Step 8: Verify the live deployment**

Open the production URL and check: `/today` loads and offers the start date setup; `/dsa/arrays-hashing` shows the template and nine problems; `/reading` Live tab returns items; setting a start date and checking a task survives a reload.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "docs: README and contributing guide, add e2e to CI"
git push
```

---

## Self-Review

**Spec coverage.** Every numbered spec section maps to a task: section 3 architecture to Task 1; section 4 pages to Tasks 9 to 17; section 5 content model to Task 2; section 6 curriculum to Tasks 3 to 7; section 7 progress to Task 8; section 8 feed to Task 15; section 9 validation to Task 2; section 10 error handling across Tasks 8, 9, 15, 16, 17; section 11 testing throughout plus Task 18; section 12 deploy to Task 18; section 13 visual direction to Task 9 step 5.

**Known deferrals, stated rather than hidden.** Weeks 5 to 26 get week-level targets in Task 7 but not day-level tasks, exactly as spec section 6.4 specifies. Projects 2 to 6 get milestone titles and one-line scope, deepened when their month arrives. Both are spec decisions, not plan gaps.

**Type consistency checked.** `completionKey` is defined once in `lib/content/index.ts` and used by the validator, the selectors, and the Today page. `Track` is exported from `lib/progress/selectors.ts` and derives from `DayTask['track']`, so the two cannot drift. `ValidatableContent` is exported from the validator script and consumed by five content tests. `FeedResponse` is shared by both parsers, both routes, and `LiveFeed`.

**One risk worth naming.** Task 1 step 2 records the Tailwind major version, and Task 12 step 5 notes the Next.js `params` typing may be a Promise or a plain object depending on the scaffolded version. Both are checked at scaffold time rather than assumed.
