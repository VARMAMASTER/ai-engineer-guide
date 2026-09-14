/**
 * VAPID — Voluntary Application Server Identification (RFC 8292).
 *
 * SERVER ONLY. This module reads `VAPID_PRIVATE_KEY`, which is the one secret
 * in the push system. It is deliberately NOT a `NEXT_PUBLIC_` variable: Next
 * inlines every `NEXT_PUBLIC_*` access into the browser bundle at build time,
 * so naming it that way would publish the key to everyone who loads the app
 * and let any of them send notifications as Unyfide. Nothing under
 * `components/**` or any `'use client'` file may import this file; the public
 * half a Client Component genuinely needs is in `./client.ts`.
 *
 * WHAT THE PUSH SERVICE CHECKS. A subscription is created against a specific
 * application server key. Every send must carry a JWT signed by the matching
 * private key, or the service answers 403 — which is what stops a stranger who
 * has scraped an endpoint URL out of a log from pushing to it. The header is:
 *
 *     Authorization: vapid t=<JWT>, k=<application server public key>
 *
 * The JWT is ES256 over `{ aud, exp, sub }`:
 *   * `aud` — the ORIGIN of the endpoint (`https://fcm.googleapis.com`), not
 *     the full URL. A full URL here is the single most common reason a send
 *     that looks right returns 401.
 *   * `exp` — RFC 8292 caps this at 24 hours from now. Twelve is used below,
 *     which is comfortably inside the cap and still survives any clock skew a
 *     serverless region might have.
 *   * `sub` — a `mailto:` or `https:` contact the push service operator can
 *     use to reach whoever is sending. Required, and Firefox's service (autopush)
 *     rejects a token without it.
 *
 * ES256 signatures come out of `node:crypto` DER-encoded by default; JWS wants
 * the raw `r || s` pair, which is what `dsaEncoding: 'ieee-p1363'` produces.
 * A DER signature here fails verification at every push service with no useful
 * message, so it is the other classic silent failure.
 */
import { createPrivateKey, sign as signWith } from 'node:crypto'
import { decodeExactly, toBase64Url } from './base64'

/** How long a signed token stays valid. RFC 8292's ceiling is 24 hours. */
const TOKEN_LIFETIME_SECONDS = 12 * 60 * 60

export interface VapidKeys {
  /** The application server key, base64url of the 65-byte uncompressed point. */
  publicKey: string
  /** The private scalar, base64url of 32 bytes. Never leaves the server. */
  privateKey: string
  /** `mailto:` or `https:` contact for the push service operator. */
  subject: string
}

/**
 * The configured key pair, or `null` when push is not set up.
 *
 * Null rather than a throw, because the learning half of this app must keep
 * working with no backend configured at all (spec section 3). A deployment
 * without VAPID keys should say "notifications are not available here", not
 * 500 on a page that merely mentions reminders.
 */
export function vapidKeys(): VapidKeys | null {
  // Static property accesses, not `process.env[name]`: only the literal form is
  // substituted by the bundler, and the public one has to survive that.
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? ''
  const subject = process.env.VAPID_SUBJECT ?? ''
  if (!publicKey || !privateKey || !subject) return null
  return { publicKey, privateKey, subject }
}

/** The origin a JWT for this endpoint must be addressed to. */
export function audienceOf(endpoint: string): string {
  return new URL(endpoint).origin
}

function segment(value: object): string {
  return toBase64Url(Buffer.from(JSON.stringify(value), 'utf8'))
}

/**
 * Rebuild a signing key from the raw pair.
 *
 * The private scalar alone is not a key any crypto library will accept, so the
 * public coordinates are carried in from the public half rather than recomputed
 * — which also means a mismatched pair is caught by the push service's 403
 * rather than producing a valid-looking signature for the wrong key.
 */
function privateKeyObject(keys: VapidKeys) {
  const publicBytes = decodeExactly(keys.publicKey, 65, 'VAPID public key')
  if (publicBytes[0] !== 0x04) {
    throw new Error('VAPID public key must be an uncompressed P-256 point (0x04 prefix)')
  }
  const d = decodeExactly(keys.privateKey, 32, 'VAPID private key')

  return createPrivateKey({
    format: 'jwk',
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(publicBytes.subarray(1, 33)),
      y: toBase64Url(publicBytes.subarray(33, 65)),
      d: toBase64Url(d),
    },
  })
}

/** A signed VAPID JWT for one endpoint's origin. */
export function vapidToken(keys: VapidKeys, endpoint: string, now: Date): string {
  const header = segment({ typ: 'JWT', alg: 'ES256' })
  const payload = segment({
    aud: audienceOf(endpoint),
    exp: Math.floor(now.getTime() / 1000) + TOKEN_LIFETIME_SECONDS,
    sub: keys.subject,
  })
  const unsigned = `${header}.${payload}`

  const signature = signWith('sha256', Buffer.from(unsigned, 'utf8'), {
    key: privateKeyObject(keys),
    dsaEncoding: 'ieee-p1363',
  })

  return `${unsigned}.${toBase64Url(signature)}`
}

/** The `Authorization` header value for a send to this endpoint. */
export function vapidAuthorization(keys: VapidKeys, endpoint: string, now: Date): string {
  return `vapid t=${vapidToken(keys, endpoint, now)}, k=${keys.publicKey}`
}
