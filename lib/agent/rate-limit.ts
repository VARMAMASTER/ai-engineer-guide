/**
 * Per-user rate limiting, from day one — spec 5.4 names it as a day-one
 * requirement rather than a hardening task, and the reason is structural:
 * signup is open, the budget is the owner's, and an LLM call is the only thing
 * in this app that costs real money when a stranger presses a button.
 *
 * The limiter is a pure function so it can be tested exhaustively without a
 * clock or a database. The route supplies the stored counters; this decides.
 *
 * Two limits, because they stop different things:
 *
 *  - A **daily cap**, which bounds what one account can cost in a day.
 *  - A **cooldown**, which stops a held-down button turning into a hundred
 *    calls before the daily cap notices.
 *
 * Both are generous for a person and useless to a script. A brief is a thing
 * you read in the morning; nobody legitimately needs six of them before lunch.
 */

/** Briefs one account may generate in one local day. */
export const MAX_BRIEFS_PER_DAY = 5

/** Seconds between two generations for the same account. */
export const COOLDOWN_SECONDS = 60

export interface RateLimitState {
  /** Generations already made for this local date. */
  count: number
  /** When the last one happened, or null if there has not been one. */
  lastAt: Date | null
}

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: 'daily-cap' | 'cooldown'; retryAfterSeconds: number; message: string }

export function checkRateLimit(state: RateLimitState, now: Date): RateLimitDecision {
  if (state.count >= MAX_BRIEFS_PER_DAY) {
    return {
      allowed: false,
      reason: 'daily-cap',
      // The cap is per local day, and the caller knows the user's date, not us.
      // An hour is an honest "come back later" that never overstates.
      retryAfterSeconds: 3600,
      message: `That is ${MAX_BRIEFS_PER_DAY} briefs today, which is the daily limit. Tomorrow's will be along.`,
    }
  }

  if (state.lastAt) {
    const elapsed = Math.floor((now.getTime() - state.lastAt.getTime()) / 1000)
    if (elapsed < COOLDOWN_SECONDS) {
      const wait = COOLDOWN_SECONDS - elapsed
      return {
        allowed: false,
        reason: 'cooldown',
        retryAfterSeconds: wait,
        message: `Just a moment — the last brief was ${elapsed}s ago. Try again in ${wait}s.`,
      }
    }
  }

  return { allowed: true, remaining: MAX_BRIEFS_PER_DAY - state.count - 1 }
}
