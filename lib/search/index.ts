/* ============================================================================
   The search index behind the command palette.
   ----------------------------------------------------------------------------
   Two jobs, kept apart on purpose:

     1. BUILD — flatten the content banks into a flat array of `SearchItem`,
        each one carrying the destination URL it jumps to and its text
        pre-normalised for scoring. Built once, lazily, off a dynamic import so
        none of the ~800 content records reach the first-paint bundle.

     2. SCORE — rank those items against a query. Deliberately not a fuzzy
        matcher and deliberately not a dependency: the corpus is ~760 rows of
        short strings, which a direct scan scores in well under a millisecond,
        and a trigram/edit-distance library would cost a runtime package and
        return worse results on a corpus this small and this well-titled.

   Why not `includes()`: a substring scan over 760 items answers "sum" with
   "Subarray Sum Equals K", "Two Sum", "Minimum Size Subarray Sum" and forty
   rows whose body text happens to say "sum", in array order. The thing the
   user typed three letters of is never first. Ranking is the feature; matching
   is the easy half.
   ========================================================================== */

import * as nav from '@/lib/nav'

/* --- what a row in the index is ------------------------------------------ */

/**
 * The kind of thing a result is. Used for the badge on the row, and — through
 * `KIND_WEIGHT` — for how much a match on it is worth.
 */
export type SearchKind =
  | 'destination'
  | 'dsa-pattern'
  | 'dsa-problem'
  | 'sd-pattern'
  | 'sd-question'
  | 'lld-pattern'
  | 'lld-problem'
  | 'ai-topic'
  | 'ai-question'
  | 'cs-topic'
  | 'cs-question'
  | 'hw-topic'
  | 'hw-question'
  | 'behavioural-principle'
  | 'behavioural-question'
  | 'story'
  | 'company'
  | 'project'
  | 'milestone'
  | 'reading'
  | 'week'

/** Human label for the badge on a result row. */
export const KIND_LABEL: Record<SearchKind, string> = {
  destination: 'Go to',
  'dsa-pattern': 'DSA pattern',
  'dsa-problem': 'DSA problem',
  'sd-pattern': 'Design pattern',
  'sd-question': 'Design question',
  'lld-pattern': 'LLD pattern',
  'lld-problem': 'LLD problem',
  'ai-topic': 'AI / ML topic',
  'ai-question': 'AI / ML question',
  'cs-topic': 'CS topic',
  'cs-question': 'CS question',
  'hw-topic': 'Hardware topic',
  'hw-question': 'Hardware question',
  'behavioural-principle': 'Principle',
  'behavioural-question': 'Behavioural',
  story: 'Story',
  company: 'Company',
  project: 'Project',
  milestone: 'Milestone',
  reading: 'Reading',
  week: 'Week',
}

/**
 * How much a match on this kind is worth, as a multiplier on the whole score.
 *
 * A destination outranks a content item on an equal textual match because the
 * user who types "dsa" wants the section, not one of the 150 problems inside
 * it. The multipliers are small enough that they never cross a match tier:
 * the gap between a title prefix match and a title word match is 60 points,
 * and 25% of a word match is 37. An exact title match therefore wins its query
 * no matter what kind it is.
 */
const KIND_WEIGHT: Record<SearchKind, number> = {
  destination: 1.25,
  'dsa-pattern': 1.1,
  'sd-pattern': 1.1,
  'lld-pattern': 1.1,
  'ai-topic': 1.1,
  'cs-topic': 1.1,
  'hw-topic': 1.1,
  company: 1.1,
  project: 1.1,
  'dsa-problem': 1,
  'sd-question': 1,
  'lld-problem': 1,
  'ai-question': 1,
  'cs-question': 1,
  'hw-question': 1,
  'behavioural-principle': 1,
  'behavioural-question': 1,
  story: 1,
  milestone: 1,
  reading: 1,
  week: 1,
}

export interface SearchItem {
  /** Stable, unique across the whole index. Content id where there is one. */
  id: string
  /** What the row shows, and the field a title match scores against. */
  title: string
  /** Context line under the title — the parent section, pattern or topic. */
  subtitle?: string
  /** Where activating the row goes. */
  href: string
  kind: SearchKind
  /** Normalised title. Precomputed at build time; never recomputed per keystroke. */
  t: string
  /** Normalised secondary text (tags, parent names, summaries). */
  b: string
}

/* --- normalisation -------------------------------------------------------- */

/**
 * Lower-case, and collapse every run of non-alphanumerics to a single space.
 *
 * Punctuation is turned into a word boundary rather than deleted, so
 * "Two-Sum", "two sum" and "TWO_SUM" all normalise to `two sum` and a query of
 * either spelling matches. It also means the word-boundary test below is a
 * plain `includes(' ' + q)` — no regex per keystroke, no escaping the user's
 * input into a pattern.
 */
export function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** A query, parsed once per keystroke rather than once per item. */
export interface ParsedQuery {
  full: string
  tokens: string[]
}

export function parseQuery(raw: string): ParsedQuery {
  const full = normalise(raw)
  return { full, tokens: full.length > 0 ? full.split(' ') : [] }
}

/* --- scoring -------------------------------------------------------------- */

/* The four tiers a single field can match at, best to worst. The gaps are wide
   so that no weighting or tie-break below can move an item across a tier. */
const EXACT = 100
const PREFIX = 70
const WORD_PREFIX = 50
const SUBSTRING = 25

/** How much better a title match is than a match in the supporting text. */
const TITLE_WEIGHT = 3
const BODY_WEIGHT = 1

/** Out-of-order multi-word matches are real matches, but weaker ones. */
const SCATTER_PENALTY = 0.8

/**
 * Score one normalised field against one normalised needle.
 *
 * Ordered by how much the match tells you about intent: the whole field equals
 * what you typed; the field begins with it; some word in the field begins with
 * it; it appears somewhere inside a word. "sum" scores 50 on "two sum" (word
 * prefix) and 25 on "consume" (substring), which is the entire difference
 * between a useful result list and an alphabet soup.
 */
export function fieldScore(text: string, needle: string): number {
  if (text.length === 0 || needle.length === 0) return 0
  if (text === needle) return EXACT
  if (text.startsWith(needle)) return PREFIX
  if (text.includes(` ${needle}`)) return WORD_PREFIX
  if (text.includes(needle)) return SUBSTRING
  return 0
}

/**
 * Score a field against a whole query.
 *
 * A contiguous match on the full query always wins. Failing that, a multi-word
 * query may still match with its words scattered through the field ("rate
 * design" finding "Design a rate limiter") — every word must hit, and the
 * result is their mean, discounted, so it can never beat the same words found
 * contiguously.
 */
export function matchScore(text: string, query: ParsedQuery): number {
  const contiguous = fieldScore(text, query.full)
  if (contiguous > 0) return contiguous
  if (query.tokens.length < 2) return 0

  let sum = 0
  for (const token of query.tokens) {
    const score = fieldScore(text, token)
    if (score === 0) return 0
    sum += score
  }
  return (sum / query.tokens.length) * SCATTER_PENALTY
}

/**
 * Shorter titles win ties.
 *
 * "Two Sum" and "Two Sum II — Input Array Is Sorted" both match "two sum" at
 * the same tier; the shorter one is the one the user meant. Capped at 4 points
 * — a quarter of the smallest gap between tiers — so this only ever breaks a
 * tie and never overturns a better match.
 */
function lengthPenalty(title: string): number {
  return (Math.min(title.length, 120) / 120) * 4
}

export interface SearchResult {
  item: SearchItem
  score: number
}

/** Total score for one item. Zero means "not a match" and is dropped. */
export function scoreItem(item: SearchItem, query: ParsedQuery): number {
  const title = matchScore(item.t, query)
  const body = matchScore(item.b, query)
  if (title === 0 && body === 0) return 0
  return (
    (TITLE_WEIGHT * title + BODY_WEIGHT * body) * KIND_WEIGHT[item.kind] - lengthPenalty(item.title)
  )
}

export const DEFAULT_LIMIT = 25

/**
 * Rank `items` against `raw`, best first.
 *
 * An empty query returns nothing — the palette shows its destination list in
 * that state, which is a different thing from a zero-result search.
 */
export function search(items: SearchItem[], raw: string, limit = DEFAULT_LIMIT): SearchResult[] {
  const query = parseQuery(raw)
  if (query.full.length === 0) return []

  const hits: SearchResult[] = []
  for (const item of items) {
    const score = scoreItem(item, query)
    if (score > 0) hits.push({ item, score })
  }
  // Ties break on title length first (already folded into the score) and then
  // on id, so the order is stable across builds rather than array order.
  hits.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
  return hits.slice(0, limit)
}

/* --- destinations ---------------------------------------------------------
   Harvested from `lib/nav.ts`, merged over a list owned here.

   That module is being restructured while this one is written — it has already
   dropped `NAV_ITEMS` for `NAV_APPS` / `LEARN_SECTIONS` once — so it is read as
   a NAMESPACE and walked for anything shaped like `{ href, label }`, one level
   into a nested `sections` array. That survives a renamed export, a new app, a
   regrouped section and a dropped one, none of which a named import would. The
   list below stands on its own if the walk comes back empty, and also carries
   the routes the nav does not itself list (`/revise/sheets`, the three drills).
   Merged by href with nav labels winning, so a renamed section shows its new
   name here without this file being touched. */

/** The static routes this app has, independent of what the nav chooses to show. */
const OWN_DESTINATIONS: Array<{ href: string; label: string; subtitle: string }> = [
  { href: '/today', label: 'Today', subtitle: "Today's tasks and the day's plan" },
  { href: '/roadmap', label: 'Roadmap', subtitle: '26 weeks, 30 days, the whole plan' },
  { href: '/dsa', label: 'DSA', subtitle: '18 patterns, 150 problems' },
  { href: '/system-design', label: 'System Design', subtitle: '20 patterns, 60 questions' },
  { href: '/lld', label: 'Low-Level Design', subtitle: 'Machine coding patterns and problems' },
  { href: '/ai-ml', label: 'AI / ML', subtitle: '10 topics, 122 questions' },
  { href: '/cs-fundamentals', label: 'CS Fundamentals', subtitle: 'OS, networking, databases' },
  { href: '/hardware', label: 'GPU / Hardware', subtitle: 'Memory, interconnect, precision' },
  { href: '/behavioural', label: 'Behavioural', subtitle: 'Principles, questions, STAR stories' },
  { href: '/companies', label: 'Companies', subtitle: 'What each loop actually is' },
  { href: '/projects', label: 'Projects', subtitle: 'Six builds and their defense docs' },
  { href: '/reading', label: 'Reading', subtitle: '49 papers, posts and API launches' },
  { href: '/feed', label: 'AI Feed', subtitle: 'What shipped this week' },
  { href: '/revise', label: 'Revise', subtitle: 'Spaced-repetition decks' },
  { href: '/revise/sheets', label: 'Cheat Sheets', subtitle: 'One page per pattern' },
  { href: '/mock', label: 'Mock', subtitle: 'Timed interview drills' },
  { href: '/mock/coding', label: 'Coding drill', subtitle: 'One problem, 25 minutes, on the clock' },
  { href: '/mock/design', label: 'System design drill', subtitle: 'One question with a phase budget' },
  { href: '/mock/behavioural', label: 'Behavioural drill', subtitle: 'One prompt and its probes' },
  { href: '/settings', label: 'Settings', subtitle: 'Start date, export, reset' },
]

interface MinimalNavItem {
  href: string
  label: string
}

/** `{ href, label }` if `value` is one, otherwise undefined. No shape trusted. */
function asNavItem(value: unknown): MinimalNavItem | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { href, label } = value as Record<string, unknown>
  if (typeof href !== 'string' || typeof label !== 'string') return undefined
  if (!href.startsWith('/') || label.length === 0) return undefined
  return { href, label }
}

/**
 * Walk the nav module for anything that looks like a destination.
 *
 * Every export is inspected, not a named few: arrays of items, single items,
 * and the `sections` array nested inside an app entry. Functions, strings and
 * anything else are ignored. This is the whole reason the palette did not
 * break when that module replaced `NAV_ITEMS` with `NAV_APPS` mid-flight.
 */
function readNavItems(): MinimalNavItem[] {
  const out: MinimalNavItem[] = []

  // `depth` bounds the nesting, not the fan-out: an app holds sections, and a
  // section is a leaf. Two levels is all the shape has ever had.
  const takeItem = (value: unknown, depth: number) => {
    const found = asNavItem(value)
    if (found) out.push(found)
    if (depth >= 2 || typeof value !== 'object' || value === null) return
    const { sections } = value as Record<string, unknown>
    if (!Array.isArray(sections)) return
    for (const section of sections as unknown[]) takeItem(section, depth + 1)
  }

  for (const exported of Object.values(nav as Record<string, unknown>)) {
    if (Array.isArray(exported)) for (const entry of exported as unknown[]) takeItem(entry, 0)
    else takeItem(exported, 0)
  }
  return out
}

function buildDestinations(): SearchItem[] {
  const subtitles = new Map(OWN_DESTINATIONS.map((d) => [d.href, d.subtitle]))
  const byHref = new Map<string, string>(OWN_DESTINATIONS.map((d) => [d.href, d.label]))
  // Nav labels win: if the nav renames a section, the palette says the new name.
  for (const item of readNavItems()) byHref.set(item.href, item.label)

  return [...byHref].map(([href, label]) => {
    const subtitle = subtitles.get(href)
    return {
      id: `dest:${href}`,
      title: label,
      subtitle,
      href,
      kind: 'destination' as const,
      t: normalise(label),
      b: normalise(`${subtitle ?? ''} ${href}`),
    }
  })
}

/**
 * Every section and page, ranked ahead of content on an equal match.
 *
 * Computed once at module scope and safe on the server: it touches the nav
 * module and this file's own list, never the content banks.
 */
export const DESTINATIONS: SearchItem[] = buildDestinations()

/* --- building the content half -------------------------------------------- */

/** Ids carry their bank as a prefix; the URL slug is that prefix removed. */
function unprefix(id: string, prefix: string): string {
  return id.startsWith(prefix) ? id.slice(prefix.length) : id
}

/** Keep the index small: body text is for matching, never for display. */
const MAX_BODY = 400

function body(...parts: Array<string | number | string[] | undefined>): string {
  const flat: string[] = []
  for (const part of parts) {
    if (part === undefined) continue
    if (Array.isArray(part)) flat.push(part.join(' '))
    else flat.push(String(part))
  }
  return normalise(flat.join(' ')).slice(0, MAX_BODY)
}

function item(
  id: string,
  kind: SearchKind,
  title: string,
  href: string,
  subtitle: string | undefined,
  bodyText: string,
): SearchItem {
  return { id, kind, title, href, subtitle, t: normalise(title), b: bodyText }
}

type ContentModule = typeof import('@/lib/content/index')

/**
 * Flatten the banks into rows.
 *
 * Two banks are deliberately left out. `docs` is generated — seven rows per
 * project whose entire title is a generic word ("problem", "architecture",
 * "scaling"), so 42 identical-looking rows would bury the six project pages
 * they belong to and answer "architecture" worse than the system design bank
 * does. `days` has no title at all beyond its number, and the tasks inside a
 * day are all indexed already under their own banks.
 */
export function buildItems({ content }: Pick<ContentModule, 'content'>): SearchItem[] {
  const items: SearchItem[] = [...DESTINATIONS]

  /* DSA ------------------------------------------------------------------ */
  const dsaHref = new Map<string, string>()
  for (const p of content.dsaPatterns) {
    const href = `/dsa/${unprefix(p.id, 'dsap-')}`
    dsaHref.set(p.id, href)
    items.push(item(p.id, 'dsa-pattern', p.name, href, 'DSA', body(p.signals, p.pitfalls)))
  }
  for (const p of content.dsaProblems) {
    const parent = content.dsaPatterns.find((x) => x.id === p.patternId)
    items.push(
      item(
        p.id,
        'dsa-problem',
        p.name,
        dsaHref.get(p.patternId) ?? '/dsa',
        parent?.name,
        body(parent?.name, p.difficulty, p.companies, `lc ${p.leetcodeNumber}`, p.signal),
      ),
    )
  }

  /* System design -------------------------------------------------------- */
  const sdHref = new Map<string, string>()
  for (const p of content.sdPatterns) {
    const href = `/system-design/${unprefix(unprefix(p.id, 'sdp-'), 'mlp-')}`
    sdHref.set(p.id, href)
    items.push(
      item(
        p.id,
        'sd-pattern',
        p.name,
        href,
        p.group === 'ml' ? 'ML & LLM design' : 'System design',
        body(p.solves, p.tradeoffs),
      ),
    )
  }
  for (const q of content.sdQuestions) {
    const parent = content.sdPatterns.find((x) => x.id === q.patternId)
    items.push(
      item(
        q.id,
        'sd-question',
        q.title,
        sdHref.get(q.patternId) ?? '/system-design',
        parent?.name,
        body(parent?.name, q.companies, `tier ${q.tier}`, q.solution.define),
      ),
    )
  }

  /* Low-level design ----------------------------------------------------- */
  for (const p of content.lldPatterns) {
    items.push(
      item(
        p.id,
        'lld-pattern',
        p.name,
        `/lld/${unprefix(p.id, 'lldp-')}`,
        'LLD pattern',
        body(p.solves, p.whenWrong, p.example),
      ),
    )
  }
  for (const q of content.lldQuestions) {
    items.push(
      item(
        q.id,
        'lld-problem',
        q.name,
        `/lld/${unprefix(q.id, 'lldq-')}`,
        'Machine coding',
        body(q.statement, q.entities, q.companies),
      ),
    )
  }

  /* AI / ML -------------------------------------------------------------- */
  const topicHref = new Map<string, string>()
  for (const t of content.topics) {
    const href = `/ai-ml/${unprefix(t.id, 'topic-')}`
    topicHref.set(t.id, href)
    items.push(item(t.id, 'ai-topic', t.name, href, 'AI / ML', body(t.summary)))
  }
  for (const q of content.topicQuestions) {
    const parent = content.topics.find((x) => x.id === q.topicId)
    items.push(
      item(
        q.id,
        'ai-question',
        q.text,
        topicHref.get(q.topicId) ?? '/ai-ml',
        parent?.name,
        body(parent?.name, q.keyPoint),
      ),
    )
  }

  /* CS fundamentals ------------------------------------------------------ */
  const csHref = new Map<string, string>()
  for (const t of content.csTopics) {
    const href = `/cs-fundamentals/${unprefix(t.id, 'cst-')}`
    csHref.set(t.id, href)
    items.push(item(t.id, 'cs-topic', t.name, href, 'CS fundamentals', body(t.area, t.summary)))
  }
  for (const q of content.csQuestions) {
    const parent = content.csTopics.find((x) => x.id === q.topicId)
    items.push(
      item(
        q.id,
        'cs-question',
        q.text,
        csHref.get(q.topicId) ?? '/cs-fundamentals',
        parent?.name,
        body(parent?.name, parent?.area, q.keyPoint, q.companies),
      ),
    )
  }

  /* GPU / hardware ------------------------------------------------------- */
  const hwHref = new Map<string, string>()
  for (const t of content.hwTopics) {
    const href = `/hardware/${unprefix(t.id, 'hwt-')}`
    hwHref.set(t.id, href)
    items.push(item(t.id, 'hw-topic', t.name, href, 'GPU / hardware', body(t.summary)))
  }
  for (const q of content.hwQuestions) {
    const parent = content.hwTopics.find((x) => x.id === q.topicId)
    items.push(
      item(
        q.id,
        'hw-question',
        q.text,
        hwHref.get(q.topicId) ?? '/hardware',
        parent?.name,
        body(parent?.name, q.keyPoint, q.numbers),
      ),
    )
  }

  /* Behavioural ---------------------------------------------------------- */
  const principleName = new Map(content.behaviouralPrinciples.map((p) => [p.id, p.name]))
  for (const p of content.behaviouralPrinciples) {
    items.push(
      item(p.id, 'behavioural-principle', p.name, '/behavioural', p.company, body(p.meaning, p.lookingFor)),
    )
  }
  for (const q of content.behaviouralQuestions) {
    const covers = q.principleIds.map((id) => principleName.get(id) ?? id)
    items.push(
      item(q.id, 'behavioural-question', q.prompt, '/behavioural', covers[0], body(covers, q.traps)),
    )
  }
  for (const s of content.storySlots) {
    const covers = s.covers.map((id) => principleName.get(id) ?? id)
    items.push(item(s.id, 'story', s.title, '/behavioural', s.source, body(s.source, covers)))
  }

  /* Companies ------------------------------------------------------------ */
  for (const g of content.companyGuides) {
    items.push(
      item(
        g.id,
        'company',
        g.name,
        `/companies/${unprefix(g.id, 'co-')}`,
        g.level,
        body(g.level, g.rounds.map((r) => r.name), g.failsOn),
      ),
    )
  }

  /* Projects ------------------------------------------------------------- */
  const projectHref = new Map<string, string>()
  const projectName = new Map<string, string>()
  for (const p of content.projects) {
    const href = `/projects/${unprefix(p.id, 'proj-')}`
    projectHref.set(p.id, href)
    projectName.set(p.id, p.name)
    items.push(item(p.id, 'project', p.name, href, `Month ${p.month}`, body(p.goal, p.architecture)))
  }
  for (const m of content.milestones) {
    items.push(
      item(
        m.id,
        'milestone',
        m.title,
        projectHref.get(m.projectId) ?? '/projects',
        projectName.get(m.projectId),
        body(projectName.get(m.projectId), m.scope),
      ),
    )
  }

  /* Reading -------------------------------------------------------------- */
  for (const r of content.readings) {
    items.push(
      item(
        r.id,
        'reading',
        r.title,
        '/reading',
        `${r.source} · ${r.year}`,
        body(r.source, r.year, r.kind, r.why),
      ),
    )
  }

  /* Plan ----------------------------------------------------------------- */
  for (const w of content.weeks) {
    // A week's theme is four sentences covering four tracks. All four are worth
    // matching on, none of them belong in a title: an eleven-word row buries
    // the rows around it and loses on every tie-break for no reason. The first
    // sentence names the week, the rest stays searchable in the body.
    const headline = w.theme.split('.')[0].trim()
    items.push(
      item(
        w.id,
        'week',
        `Week ${w.number} — ${headline}`,
        '/roadmap',
        `Month ${w.month}`,
        body(w.theme, w.targets),
      ),
    )
  }

  return items
}

/* --- the lazy, build-once index ------------------------------------------- */

let indexPromise: Promise<SearchItem[]> | null = null
let buildCount = 0

/**
 * The index, built at most once per page load.
 *
 * The promise is memoised rather than the array, so two callers racing on the
 * same first open share one build instead of starting two. The content banks
 * arrive through a dynamic `import()`, which keeps ~800 records and every
 * answer, diagram and solution string out of the first-paint bundle: nothing
 * here is touched during SSR or on the first render of any page, only when the
 * palette is first opened.
 */
export function getSearchIndex(): Promise<SearchItem[]> {
  indexPromise ??= (async () => {
    buildCount += 1
    const mod = await import('@/lib/content/index')
    return buildItems(mod)
  })()
  return indexPromise
}

/** How many times the index has actually been built. Asserted by the tests. */
export function searchIndexBuildCount(): number {
  return buildCount
}

/** Drop the memoised index. Exists for tests; nothing in the app calls it. */
export function resetSearchIndex(): void {
  indexPromise = null
  buildCount = 0
}
