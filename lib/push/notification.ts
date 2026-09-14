/**
 * The payload shape that crosses from the sender to `public/sw.js`.
 *
 * It is the contract between three places that cannot import one another: the
 * sender (Node), the service worker (a classic script in a worker), and the
 * tests. Writing the shape down once means the worker's defensive parsing and
 * the sender's construction are describing the same object rather than two
 * guesses about it — `tests/unit/push/notification.test.ts` holds them to that
 * by feeding the worker's own parser a payload built here.
 *
 * `url` is a PATH, never an absolute URL. The worker resolves it against its
 * own origin when a notification is clicked; accepting an absolute URL would
 * make a notification a redirect primitive, and the payload is attacker-shaped
 * data the moment anything other than this sender can write a reminder title.
 */
import { z } from 'zod'
import { MAX_PAYLOAD_BYTES } from './limits'

export const NotificationPayloadSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(400).default(''),
  /** Where a click goes. Same-origin path, leading slash, no protocol. */
  url: z
    .string()
    .max(300)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), {
      message: 'url must be a same-origin path',
    })
    .default('/ops/reminders'),
  /**
   * The notification's replacement key. Two pushes with the same tag collapse
   * into one on screen rather than stacking, which is what stops a retried
   * delivery from looking like two reminders even before the send log is
   * consulted. It is belt to the send log's braces, not a substitute for it.
   */
  tag: z.string().min(1).max(120),
})

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>

export function parseNotificationPayload(input: unknown): NotificationPayload {
  return NotificationPayloadSchema.parse(input)
}

/**
 * Serialise, and refuse to build something no push service will carry.
 *
 * The 4096-byte ceiling is the encrypted record's, so the JSON has to fit
 * inside it with the GCM tag and the padding delimiter already subtracted.
 * Titles and bodies are user-authored task text, so this is reachable: a task
 * title is capped at 200 characters in `ops_task`, but nothing caps how many
 * of them a future digest might concatenate.
 */
export function encodePayload(payload: NotificationPayload): Buffer {
  const bytes = Buffer.from(JSON.stringify(payload), 'utf8')
  if (bytes.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`notification payload is ${bytes.length} bytes; the limit is ${MAX_PAYLOAD_BYTES}`)
  }
  return bytes
}

/** Trim a string to `max` characters, ellipsis included, without splitting a surrogate pair. */
export function clamp(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = [...text].slice(0, max - 1).join('')
  return `${cut}…`
}
