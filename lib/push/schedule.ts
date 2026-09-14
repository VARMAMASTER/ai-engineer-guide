/**
 * How often the sender runs, and the one number that has to move with it.
 *
 * THE CONSTRAINT. Delivery is a Vercel Cron Job (`vercel.json`), and this
 * project is on the Hobby plan, where the documented limits are **one
 * invocation per day** and **±59 minutes of scheduling precision** — a more
 * frequent cron expression fails at deploy time with
 * "Hobby accounts are limited to daily cron jobs". That is a billing fact, not
 * a design one, so the code is written for any cadence and only `vercel.json`
 * plus `SENDER_GRACE_MINUTES` change when the plan does.
 *
 * WHAT THE GRACE WINDOW IS FOR. `dueReminders(rules, tasks, now, grace)` fires
 * a reminder whose instant is at or before `now` and no more than `grace`
 * minutes in the past. Too small and a reminder that came due between two runs
 * is never delivered at all — silently, which is the worst failure a reminder
 * system has. Too large and a sender that was offline for a week replays the
 * week. The right value is therefore "the longest gap between two runs, plus
 * the platform's scheduling slop", which is what the constant below is and what
 * `tests/unit/push/schedule.test.ts` derives from `vercel.json` independently.
 *
 * Being late is safe here in a way it usually is not, because delivery is
 * idempotent: `push_delivery` claims each (rule, fire instant) before the send,
 * so a wide window can only ever make a reminder arrive once and late, never
 * twice. Lateness is a product limitation of the plan — stated plainly in the
 * Reminders UI rather than hidden — not a correctness bug.
 *
 * ON PRO, change two things together: the `schedule` in `vercel.json` to a
 * five-minute expression, and `SENDER_GRACE_MINUTES` down to roughly 15. The
 * unit test fails if you change one and forget the other.
 */

/** The path Vercel Cron invokes. Asserted against `vercel.json` by the unit test. */
export const SENDER_PATH = '/api/push/send'

/**
 * The largest gap the sender must tolerate, in minutes.
 *
 * 1440 for the daily cadence + 59 for the Hobby plan's stated precision + a
 * minute of slack, so two consecutive runs at the worst ends of their windows
 * still overlap rather than leaving a hole.
 */
export const SENDER_GRACE_MINUTES = 1500

/** Vercel's stated scheduling slop on the Hobby plan, in minutes. */
export const SCHEDULING_SLOP_MINUTES = 59

/** How long a send-log row is kept before the sender prunes it. */
export const DELIVERY_RETENTION_DAYS = 30

/**
 * The identifier that makes delivery idempotent.
 *
 * A reminder is not "a rule" — a rule with a `basis: 'schedule'` recurrence
 * fires again on every occurrence — and it is not "a rule on a day", because a
 * task can be rescheduled within one. It is a rule AT AN INSTANT, and
 * `reminderFiresAt` already computes exactly that as a local
 * `YYYY-MM-DDTHH:MM` string. So the key is the pair.
 *
 * Two consequences, both intended:
 *
 *   * Overlapping cron runs, a retry after a timeout, and a run that is simply
 *     late all produce the SAME key, so the second one claims nothing and sends
 *     nothing.
 *   * Moving a task's due time produces a DIFFERENT key, so the reminder for
 *     the new time is delivered. That is the correct behaviour — the user
 *     changed when they wanted to be told — and it is why the key is not just
 *     the rule id.
 */
export function deliveryKey(ruleId: string, firesAt: string): string {
  return `${ruleId}@${firesAt}`
}
