/**
 * Mint a VAPID application-server key pair.
 *
 *   npx tsx scripts/generate-vapid.ts
 *
 * Prints three `NAME=value` lines to stdout and nothing else, so the output can
 * be read by a human, piped into `vercel env add`, or appended to a local
 * `.env.local` — and never accidentally interleaved with progress chatter that
 * would end up inside a secret.
 *
 * WHAT A VAPID KEY IS, because the names are confusing. It is an ordinary
 * P-256 key pair (RFC 8292). The PUBLIC half is the `applicationServerKey` the
 * browser is handed at `pushManager.subscribe()` time; it is not a secret and
 * is deliberately shipped to the client. The PRIVATE half signs the JWT that
 * proves to the push service that this server is the same server the user
 * subscribed to. It is the only secret here, and if it reaches a browser
 * bundle anyone can send notifications as this app.
 *
 * The encoding is raw-bytes-as-base64url, NOT PEM and NOT JWK, because that is
 * what `pushManager.subscribe()` accepts and what every push service expects in
 * the `k=` parameter:
 *   * public  — 65 bytes, the uncompressed point `0x04 || X || Y`
 *   * private — 32 bytes, the scalar `d`
 *
 * Rotating the pair invalidates every stored subscription: a push service ties
 * a subscription to the application server key it was created with and answers
 * 403 for a JWT signed by a different one. `lib/push/send.ts` treats that as
 * "not gone" on purpose, so a rotation does not silently wipe the table — but
 * the practical recovery is that every device resubscribes.
 */
import { generateKeyPairSync } from 'node:crypto'

function base64url(bytes: Buffer): string {
  return bytes.toString('base64url')
}

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })

const jwk = privateKey.export({ format: 'jwk' }) as { d?: string; x?: string; y?: string }
if (!jwk.d || !jwk.x || !jwk.y) throw new Error('generated key is missing d/x/y')

// The JWK coordinates are already base64url of the raw 32-byte values; the
// uncompressed point is just 0x04 followed by both of them.
const x = Buffer.from(jwk.x, 'base64url')
const y = Buffer.from(jwk.y, 'base64url')
if (x.length !== 32 || y.length !== 32) throw new Error('unexpected coordinate length')

const uncompressed = Buffer.concat([Buffer.from([0x04]), x, y])

// Cross-check against the public half the runtime derived independently, so a
// bad pair is caught here rather than as a 403 from a push service later.
const publicJwk = publicKey.export({ format: 'jwk' }) as { x?: string; y?: string }
if (publicJwk.x !== jwk.x || publicJwk.y !== jwk.y) {
  throw new Error('public and private halves disagree')
}

process.stdout.write(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${base64url(uncompressed)}\n`)
process.stdout.write(`VAPID_PRIVATE_KEY=${base64url(Buffer.from(jwk.d, 'base64url'))}\n`)
process.stdout.write('VAPID_SUBJECT=mailto:you@example.com\n')
