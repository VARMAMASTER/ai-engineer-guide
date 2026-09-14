/**
 * The push subscription: what the browser hands us, what the table holds, and
 * the boundary between the two.
 *
 * Pure — no I/O, no `node:` import — so every rule below is asserted in
 * `tests/unit/push/subscription.test.ts` without a database or a browser. The
 * routes in `app/api/push/**` are the only things that talk to Postgres.
 *
 * WHAT IS STORED, AND WHY EACH FIELD EXISTS.
 *
 * `endpoint` — the push service URL the browser minted. It is the identifier:
 *   one row per device per browser profile, so it is the non-`user_id` half of
 *   the primary key. It is also a CAPABILITY — anyone holding it can ask the
 *   push service to wake that device — which is why the table grants nothing to
 *   `anon` and why nothing ever renders it.
 *
 * `p256dh` / `auth` — the subscriber's public key and 16-byte shared secret.
 *   Together they are what `./encrypt.ts` encrypts to. They are useless to a
 *   reader without the endpoint and useless to the push service, which never
 *   sees them.
 *
 * `timezone` — an IANA zone name, captured from the browser at subscribe time.
 *   THIS IS THE FIELD THAT MAKES REMINDERS CORRECT. `lib/ops/**` is built on
 *   local calendar dates and local `HH:MM` wall-clock times: a task due at
 *   18:00 means 18:00 where the person is. The sender runs in a Vercel region
 *   with no idea where that is, so without this column "18:00" would silently
 *   mean 18:00 UTC and every reminder outside UTC would fire at the wrong hour.
 *   See `./time.ts` for how it is applied.
 *
 * A DEVICE, NOT A PERSON. One account can hold several rows — phone, laptop,
 * installed PWA and browser tab are all separate subscriptions. The sender
 * therefore sends each due reminder to every live subscription of that user,
 * and the send log is keyed by the REMINDER, not by the device, so "sent once"
 * means once per reminder rather than once per device.
 */
import { z } from 'zod'

/** The columns a subscription is read with. One constant so a read and a parse cannot drift. */
export const SUBSCRIPTION_COLUMNS = 'endpoint, p256dh, auth, timezone, created_at, updated_at'

/**
 * What `PushSubscription#toJSON()` produces, plus the timezone the client
 * reads from `Intl`. This is an UNTRUSTED request body — it arrives at
 * `POST /api/push/subscribe` from a browser — so every field is bounded.
 *
 * The key lengths are checked as base64url character counts rather than
 * decoded byte counts, because this schema has to stay free of `Buffer`: 65
 * raw bytes is 87 base64url characters and 16 is 22. `./encrypt.ts` checks the
 * decoded lengths again on the way out, which is the check that actually
 * protects the crypto; this one is here to keep obvious junk out of the table.
 */
export const PushSubscriptionInputSchema = z.object({
  endpoint: z
    .string()
    .min(1)
    .max(1000)
    .refine((value) => value.startsWith('https://'), { message: 'endpoint must be https' }),
  keys: z.object({
    p256dh: z.string().length(87),
    auth: z.string().length(22),
  }),
  timezone: z.string().min(1).max(64),
})

export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInputSchema>

export interface SubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
  timezone: string
}

/**
 * A row ready to insert, with `user_id` still to be added by the caller.
 *
 * Deliberately not given the user id here: `app/api/push/subscribe/route.ts`
 * is the only place that knows who is signed in, and RLS is the thing keeping
 * one account's rows out of another's. Threading the id through this pure
 * function would read as though the check lived here.
 */
export function inputToRow(input: PushSubscriptionInput, timezone: string): SubscriptionRow {
  return {
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    timezone,
  }
}
