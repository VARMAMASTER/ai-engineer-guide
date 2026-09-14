/**
 * One HTTP request to one push service. SERVER ONLY.
 *
 * This is the whole of the "web push protocol" (RFC 8030) that a sender needs:
 * a `POST` to the subscription's endpoint carrying the encrypted record, a
 * VAPID `Authorization` header, and a `TTL`. There is no SDK here because
 * there is nothing left for one to do — see `./encrypt.ts` for that argument.
 *
 * THE RESPONSE IS THE ONLY GARBAGE COLLECTOR THIS SYSTEM HAS. A subscription
 * dies when the user clears site data, uninstalls the PWA, revokes the
 * permission, or the browser rotates it. Nothing tells us; the endpoint simply
 * starts answering **404 Not Found** or **410 Gone**, forever. Left in the
 * table those rows are retried on every single run, so the failure mode is a
 * sender that gets slower every week and a log full of errors that mean
 * "working as intended". `gone` below is the flag the caller deletes on.
 *
 * Everything else that can go wrong must NOT delete the row:
 *   * 401 / 403 — the VAPID key does not match the one the subscription was
 *     created with. That is a server misconfiguration or a key rotation, and
 *     the subscriptions are fine. Deleting here would wipe the table on a
 *     fat-fingered env var.
 *   * 429 / 5xx — the push service is rate-limiting or briefly unwell.
 *   * A network error or timeout — says nothing about the subscription.
 *
 * A timeout is essential and not decoration: this runs inside a cron function
 * with a wall-clock budget, iterating over every subscriber. One push service
 * hanging must cost a few seconds, not the entire run.
 */
import { encryptPayload, type SubscriberKeys } from './encrypt'
import { decodeExactly } from './base64'
import { encodePayload, type NotificationPayload } from './notification'
import { vapidAuthorization, type VapidKeys } from './vapid'

/** Long enough to survive a phone that is briefly offline, short enough to expire. */
const DEFAULT_TTL_SECONDS = 6 * 60 * 60

const REQUEST_TIMEOUT_MS = 8000

export interface PushTarget {
  endpoint: string
  /** base64url, 87 characters. */
  p256dh: string
  /** base64url, 22 characters. */
  auth: string
}

export interface PushOutcome {
  ok: boolean
  /** HTTP status, or 0 when the request never got an answer. */
  status: number
  /** True only for 404/410: this subscription is dead and its row must go. */
  gone: boolean
  /** Short reason, for logs. Never contains key material or notification text. */
  detail?: string
}

function subscriberKeys(target: PushTarget): SubscriberKeys {
  return {
    p256dh: decodeExactly(target.p256dh, 65, 'subscription p256dh'),
    auth: decodeExactly(target.auth, 16, 'subscription auth secret'),
  }
}

/**
 * Send one notification. Never throws for a delivery failure — a thrown error
 * in the middle of a loop over subscribers is one dead phone stopping
 * everybody else's reminders.
 *
 * A malformed subscription (unparseable keys) is reported as `gone`, because
 * the row cannot ever be delivered to and is not going to fix itself.
 */
export async function sendPush(
  target: PushTarget,
  payload: NotificationPayload,
  keys: VapidKeys,
  now: Date = new Date(),
  options: { ttlSeconds?: number } = {},
): Promise<PushOutcome> {
  let body: Buffer
  let authorization: string
  try {
    body = encryptPayload(encodePayload(payload), subscriberKeys(target))
    authorization = vapidAuthorization(keys, target.endpoint, now)
  } catch (cause) {
    return {
      ok: false,
      status: 0,
      gone: true,
      detail: cause instanceof Error ? cause.message : 'could not encrypt',
    }
  }

  try {
    const response = await fetch(target.endpoint, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(options.ttlSeconds ?? DEFAULT_TTL_SECONDS),
        // A reminder is worth waking a dozing device for; that is the whole
        // point of one. `low` would let a phone batch it until it next woke up.
        Urgency: 'high',
      },
      // Uint8Array rather than the Buffer, so the body is a plain BodyInit that
      // undici does not try to interpret.
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })

    if (response.ok) return { ok: true, status: response.status, gone: false }

    return {
      ok: false,
      status: response.status,
      gone: response.status === 404 || response.status === 410,
      detail: `push service responded ${response.status}`,
    }
  } catch (cause) {
    return {
      ok: false,
      status: 0,
      gone: false,
      detail: cause instanceof Error ? cause.message : 'request failed',
    }
  }
}
