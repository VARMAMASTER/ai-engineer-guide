/**
 * The one seam that crosses a mini-app boundary.
 *
 * Diet, Train, Ops and Learn are bounded contexts: none imports another, none
 * reads another's tables, and deleting any one leaves the rest building (see
 * `docs/superpowers/specs/2026-09-14-unified-app-design.md` section 4.2). Two
 * things legitimately see more than one app, and this is how they see it:
 *
 *   1. Today renders one card per app.
 *   2. The agent reads every app to form a cross-app sentence.
 *
 * Both consume `AppSummary` and nothing else. An app publishes a summary; it
 * does not know who reads it, and it certainly does not know what the other
 * apps contain. That keeps this a plugin seam rather than a dependency — an app
 * that is absent simply contributes no card, and Today needs no change.
 *
 * The deliberate constraint is that a summary is FLAT and SMALL: a headline
 * number, a short status, a link. If a consumer needs more than this, the
 * answer is a richer summary type agreed here — never a direct import of the
 * app's internals, which is the exact move this file exists to prevent.
 *
 * It is also what makes the agent testable without a database: feed it four
 * fixture summaries and assert the brief it writes.
 */

/** Which way a number is moving, where that is meaningful. */
export type Trend = 'up' | 'down' | 'flat' | 'unknown'

/**
 * How a day is going for one app.
 *
 * `ok` / `behind` / `attention` are deliberately vague rather than a score:
 * apps measure incomparable things, and a shared 0-100 would invite Today to
 * rank them, which is a judgement no app has the standing to make about
 * another.
 */
export type AppStatus = 'ok' | 'behind' | 'attention' | 'idle'

export interface SummaryMetric {
  /** Short label — "Calories", "Protein", "Due today". */
  label: string
  /** Pre-formatted for display. Apps own their own units and rounding. */
  value: string
  /** Optional target shown beside the value — "/ 2,050". */
  of?: string
  /** 0-1, when the metric is genuinely a proportion. Drives a meter. */
  fraction?: number
  trend?: Trend
}

export interface AppSummary {
  /** Stable app id: 'learn' | 'diet' | 'train' | 'ops'. */
  appId: string
  /** Display name for the card. */
  title: string
  /** Where the card links to. */
  href: string
  status: AppStatus
  /**
   * One sentence a person would say out loud. Not a slogan and not a metric
   * restated — "Nothing logged since 14:20" rather than "Calories: 1,840".
   */
  headline: string
  /** At most three. More than three is a dashboard, and this is a card. */
  metrics: SummaryMetric[]
  /**
   * The local date this describes, `YYYY-MM-DD`. Present so a stale summary is
   * detectable rather than silently rendered as today.
   */
  date: string
}

/**
 * What an app must export to appear on Today and to be visible to the agent.
 *
 * Kept synchronous over already-loaded data. Fetching belongs to the caller, so
 * that Today can decide how to load and the agent can run against fixtures.
 */
export type SummaryProvider<TInput> = (input: TInput) => AppSummary

/** A summary describing a date other than the one being viewed is stale. */
export function isStale(summary: AppSummary, today: string): boolean {
  return summary.date !== today
}

/**
 * Order for display: the things wanting attention first, idle apps last.
 *
 * Ordering by status rather than by app is deliberate — a fixed order buries
 * whichever app is actually off track behind whichever app happens to be first.
 */
const STATUS_RANK: Record<AppStatus, number> = {
  attention: 0,
  behind: 1,
  ok: 2,
  idle: 3,
}

export function orderSummaries(summaries: AppSummary[]): AppSummary[] {
  return [...summaries].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.appId.localeCompare(b.appId),
  )
}
