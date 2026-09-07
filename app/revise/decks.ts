import { content } from '@/lib/content/index'
import type {
  DsaPattern, DsaProblem, LldPattern, LldQuestion,
  SdPattern, SdQuestion, Topic, TopicQuestion,
} from '@/lib/content/schema'

/**
 * Revision mode's data layer (spec 6.7b).
 *
 * The rest of the guide is a six-month practice tool: exercises, checkboxes,
 * meters. This is the opposite shape — the night before an interview you want
 * answers, not exercises. So the same content is re-cut into decks of cards:
 * a prompt on the front, the thing you have to be able to say on the back.
 *
 * Nothing here reads or writes progress. Confidence is the store's problem.
 */

export type DeckKind = 'ai-ml' | 'dsa' | 'system-design' | 'lld'

/** One labelled block on the back of a card. Exactly one of the three bodies is set. */
export interface CardSection {
  label: string
  text?: string
  items?: string[]
  code?: string
}

export interface ReviseCard {
  /** The content id. Confidence is keyed by this, so a card known in one deck is known in all. */
  id: string
  /** The prompt, shown before the reveal. */
  front: string
  /** A short line of context under the prompt: difficulty, tier, what it solves. */
  frontMeta?: string
  /** The answer. Never empty — a card with nothing on the back is not built. */
  sections: CardSection[]
  /** Where to go for the long version. */
  href?: string
  hrefLabel?: string
}

export interface Deck {
  slug: string
  kind: DeckKind
  title: string
  subtitle: string
  cards: ReviseCard[]
}

/** What the picker needs: enough to count, not enough to render a card. */
export interface DeckSummary {
  slug: string
  kind: DeckKind
  title: string
  subtitle: string
  cardIds: string[]
}

const DECK_PREFIXES = ['topic-', 'dsap-', 'sdp-', 'mlp-', 'lldp-'] as const

/**
 * A deck's URL segment is its source id minus the prefix, so `topic-transformers`
 * is `/revise/transformers`. `lib/content/ids` cannot do this one: its prefix list
 * has no `lldp`, and it strips `dsa-` before `dsap-`.
 */
export function deckSlug(id: string): string {
  for (const p of DECK_PREFIXES) if (id.startsWith(p)) return id.slice(p.length)
  return id
}

/* --- AI/ML: question front, answer and key point on reveal ---------------- */

function topicCard(q: TopicQuestion): ReviseCard {
  return {
    id: q.id,
    front: q.text,
    sections: [
      { label: 'Answer', text: q.answer },
      { label: 'Key point', text: q.keyPoint },
    ],
  }
}

function topicDeck(topic: Topic, questions: TopicQuestion[]): Deck {
  return {
    slug: deckSlug(topic.id),
    kind: 'ai-ml',
    title: topic.name,
    subtitle: topic.summary,
    cards: questions.filter((q) => q.topicId === topic.id).map(topicCard),
  }
}

/* --- DSA: the pattern, then every problem that hangs off it --------------- */

function dsaPatternCard(p: DsaPattern): ReviseCard {
  return {
    id: p.id,
    front: p.name,
    frontMeta: 'What makes you reach for it, and the shape you write',
    sections: [
      { label: 'Signals', items: p.signals },
      { label: 'Template', code: p.template },
    ],
    href: '/dsa/' + deckSlug(p.id),
    hrefLabel: 'Open the pattern',
  }
}

/**
 * A problem card, built from whatever study material the problem actually
 * carries. `signal`, `approach`, `complexity`, `solution` and `followUps` are
 * optional in the schema and land problem by problem; a missing field drops its
 * own section rather than the card, and a problem carrying none of them still
 * reveals where it sits, so no card is ever blank on the back.
 */
function dsaProblemCard(problem: DsaProblem, pattern: DsaPattern): ReviseCard {
  const sections: CardSection[] = []
  if (problem.signal) sections.push({ label: 'Signal', text: problem.signal })
  if (problem.approach) sections.push({ label: 'Approach', text: problem.approach })
  if (problem.complexity) {
    sections.push({
      label: 'Complexity',
      text: 'Time ' + problem.complexity.time + ' — Space ' + problem.complexity.space,
    })
  }
  if (problem.solution) sections.push({ label: 'Solution', code: problem.solution })
  if (problem.followUps?.length) sections.push({ label: 'Follow-ups', items: problem.followUps })
  if (sections.length === 0) {
    sections.push({ label: 'Pattern', text: pattern.name + ' — ' + pattern.signals[0] })
  }

  const meta = ['LC ' + problem.leetcodeNumber, problem.difficulty]
  if (problem.core) meta.push('core')

  return {
    id: problem.id,
    front: problem.name,
    frontMeta: meta.join(' · '),
    sections,
    href: problem.url,
    hrefLabel: 'Open on LeetCode',
  }
}

function dsaDeck(pattern: DsaPattern, problems: DsaProblem[]): Deck {
  const mine = problems.filter((p) => p.patternId === pattern.id)
  return {
    slug: deckSlug(pattern.id),
    kind: 'dsa',
    title: pattern.name,
    subtitle: pattern.signals[0],
    cards: [dsaPatternCard(pattern), ...mine.map((p) => dsaProblemCard(p, pattern))],
  }
}

/* --- System design: the pattern's trade-offs, then its questions ---------- */

function sdPatternCard(p: SdPattern): ReviseCard {
  return {
    id: p.id,
    front: p.name,
    frontMeta: p.solves,
    sections: [{ label: 'Trade-offs', items: p.tradeoffs }],
    href: '/system-design/' + deckSlug(p.id),
    hrefLabel: 'Open the pattern',
  }
}

function sdQuestionCard(q: SdQuestion): ReviseCard {
  const tier = typeof q.tier === 'number' ? 'tier ' + q.tier : q.tier
  return {
    id: q.id,
    front: q.title,
    frontMeta: tier + ' · ' + q.minutes + 'm round',
    sections: [
      { label: 'Architecture', text: q.solution.architecture },
      { label: 'Numbers to say out loud', items: q.solution.numbers },
      { label: 'Traps', items: q.delivery.traps },
    ],
  }
}

function sdDeck(pattern: SdPattern, questions: SdQuestion[]): Deck {
  const mine = questions.filter((q) => q.patternId === pattern.id)
  return {
    slug: deckSlug(pattern.id),
    kind: 'system-design',
    title: pattern.name,
    subtitle: pattern.solves,
    cards: [sdPatternCard(pattern), ...mine.map(sdQuestionCard)],
  }
}

/* --- LLD: the pattern, then the machine-coding problems that use it ------- */

function lldPatternCard(p: LldPattern): ReviseCard {
  return {
    id: p.id,
    front: p.name,
    sections: [
      { label: 'Solves', text: p.solves },
      { label: 'When it is the wrong call', text: p.whenWrong },
    ],
    href: '/lld/' + deckSlug(p.id),
    hrefLabel: 'Open the pattern',
  }
}

function lldQuestionCard(q: LldQuestion): ReviseCard {
  return {
    id: q.id,
    front: q.name,
    frontMeta: q.statement,
    sections: [
      { label: 'Clarify first', items: q.clarify },
      { label: 'Entities', items: q.entities },
      { label: 'Extensions they will ask for', items: q.extensions },
    ],
  }
}

function lldDeck(pattern: LldPattern, questions: LldQuestion[]): Deck {
  const mine = questions.filter((q) => q.patterns.includes(pattern.id))
  return {
    slug: deckSlug(pattern.id),
    kind: 'lld',
    title: pattern.name,
    subtitle: pattern.solves,
    cards: [lldPatternCard(pattern), ...mine.map(lldQuestionCard)],
  }
}

/* --- the registry --------------------------------------------------------- */

function byOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order)
}

export const decks: Deck[] = [
  ...byOrder(content.topics).map((t) => topicDeck(t, content.topicQuestions)),
  ...byOrder(content.dsaPatterns).map((p) => dsaDeck(p, content.dsaProblems)),
  ...byOrder(content.sdPatterns).map((p) => sdDeck(p, content.sdQuestions)),
  ...byOrder(content.lldPatterns).map((p) => lldDeck(p, content.lldQuestions)),
]

export const deckBySlug: Map<string, Deck> = new Map(decks.map((d) => [d.slug, d]))

export function findDeck(slug: string): Deck | undefined {
  return deckBySlug.get(slug)
}

export const deckSummaries: DeckSummary[] = decks.map((d) => ({
  slug: d.slug,
  kind: d.kind,
  title: d.title,
  subtitle: d.subtitle,
  cardIds: d.cards.map((c) => c.id),
}))
