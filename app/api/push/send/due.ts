import type { SupabaseClient } from '@supabase/supabase-js'
import {
  REMINDER_COLUMNS,
  TASK_COLUMNS,
  rowsToReminders,
  rowsToTasks,
  type ReminderRow,
  type TaskRow,
} from '@/lib/ops/rows'
import { dueReminders, type DueReminder } from '@/lib/ops/reminders'
import { clamp, type NotificationPayload } from '@/lib/push/notification'
import { SENDER_GRACE_MINUTES, deliveryKey } from '@/lib/push/schedule'
import { zonedNow } from '@/lib/push/time'

/**
 * "What does this person need to be told, right now, where they are?"
 *
 * WHERE THE MODULE BOUNDARY SITS, because this file crosses it deliberately.
 * `lib/push/**` knows nothing about Ops: it is VAPID, encryption, a device
 * registry and a send log, and it would deliver anything anybody handed it.
 * Ops owns what a reminder MEANS. This file is the join, and it lives inside
 * `app/api/push/send/` — the Ops feature's own sender — rather than in
 * `lib/push`, so that pushing notifications never acquires a dependency on one
 * mini-app's schema (spec section 4.2). Deleting Ops deletes this file and the
 * push plumbing still builds.
 *
 * It also means there is exactly ONE definition of "which reminders are due":
 * `lib/ops/reminders.ts`, the same pure function the Reminders screen calls to
 * draw its "would be firing now" list. The sender does not reimplement the
 * rules with a timezone parameter bolted on — it hands that function a clock,
 * and `zonedNow` is what makes the clock the subscriber's rather than the
 * region's. See `lib/push/time.ts`.
 */

export interface DuePush {
  /** The idempotency key. Claimed in `push_delivery` before anything is sent. */
  key: string
  payload: NotificationPayload
}

/** Titles are capped at 200 characters in `ops_task`; the notification is tighter. */
const TITLE_LIMIT = 90

/**
 * Turn a due reminder into the notification a person actually reads.
 *
 * The task's title is the SUBJECT, not the app's name, because a notification
 * shade shows a stack of these and "Unyfide" repeated six times is unreadable.
 * The offset goes in the body, since "in 30 minutes" is the fact that makes the
 * notification actionable rather than merely alarming.
 */
export function payloadFor(due: DueReminder): NotificationPayload {
  const minutes = due.rule.offsetMinutes
  const when =
    minutes === 0
      ? 'Due now.'
      : minutes < 60
        ? `Due in ${minutes} minutes.`
        : minutes < 1440
          ? `Due in ${Math.round(minutes / 60)} hours.`
          : `Due in ${Math.round(minutes / 1440)} days.`

  const at = due.task.dueTime ? ` At ${due.task.dueTime}.` : ''

  return {
    title: clamp(due.task.title, TITLE_LIMIT),
    body: `${when}${at}`,
    url: '/ops/today',
    // The tag collapses a re-delivery on screen even before the send log is
    // consulted, and it is the same string the log is keyed by so the two can
    // never disagree about what "the same reminder" means.
    tag: deliveryKey(due.rule.id, due.firesAt),
  }
}

/**
 * Everything due for one user, evaluated in their own timezone.
 *
 * `supabase` must be the ADMIN client: this runs from a cron invocation with no
 * session, so there is no `auth.uid()` for the `ops_*` policies to match and a
 * request-scoped client would correctly return nothing. That is the one
 * legitimate RLS bypass in this feature, which is why the `user_id` filters
 * below are not decoration — with policies out of the picture they are the only
 * thing scoping the query, and getting one wrong would push another person's
 * task titles to this person's phone.
 *
 * A row that does not parse is skipped rather than thrown on
 * (`rowsToTasks`/`rowsToReminders` count them): one malformed recurrence blob
 * must not stop the run for everybody else.
 */
export async function dueForUser(
  supabase: SupabaseClient,
  userId: string,
  timeZone: string,
  instant: Date,
): Promise<DuePush[]> {
  const [tasks, reminders] = await Promise.all([
    supabase.from('ops_task').select(TASK_COLUMNS).eq('user_id', userId),
    supabase.from('ops_reminder').select(REMINDER_COLUMNS).eq('user_id', userId),
  ])

  if (tasks.error) throw new Error(`could not read tasks: ${tasks.error.message}`)
  if (reminders.error) throw new Error(`could not read reminders: ${reminders.error.message}`)

  const parsedTasks = rowsToTasks((tasks.data ?? []) as unknown as TaskRow[])
  const parsedRules = rowsToReminders((reminders.data ?? []) as unknown as ReminderRow[])

  const localNow = zonedNow(instant, timeZone)
  const due = dueReminders(parsedRules.items, parsedTasks.items, localNow, SENDER_GRACE_MINUTES)

  return due.map((item) => ({ key: deliveryKey(item.rule.id, item.firesAt), payload: payloadFor(item) }))
}
