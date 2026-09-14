import { describe, it, expect, beforeAll } from 'vitest'
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto'
import { audienceOf, vapidAuthorization, vapidKeys, vapidToken } from '@/lib/push/vapid'

/**
 * VAPID, verified the way a push service verifies it.
 *
 * Every assertion below is one of the ways a send gets a 401 back with no
 * useful message attached. They are all silent failures in production — the
 * notification simply never arrives — so they are worth pinning here:
 *
 *   * the signature must be raw `r || s`, not DER
 *   * `aud` must be the endpoint's ORIGIN, not the endpoint
 *   * `exp` must be in the future and inside RFC 8292's 24-hour ceiling
 *   * the header must be `vapid t=..., k=...`, with `k` the application server
 *     key the subscription was created with
 */

function newPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const jwk = privateKey.export({ format: 'jwk' }) as { d: string; x: string; y: string }
  const uncompressed = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(jwk.x, 'base64url'),
    Buffer.from(jwk.y, 'base64url'),
  ])
  return {
    publicKey: uncompressed.toString('base64url'),
    privateKey: Buffer.from(jwk.d, 'base64url').toString('base64url'),
    subject: 'mailto:ops@example.com',
    verifier: publicKey,
  }
}

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/f4Ke-eNdPo1nt:APA91bH'
const NOW = new Date('2026-09-14T10:00:00.000Z')

let pair: ReturnType<typeof newPair>
beforeAll(() => {
  pair = newPair()
})

function decode(token: string) {
  const [header, payload, signature] = token.split('.')
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
    payload: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    signature: Buffer.from(signature, 'base64url'),
    signed: `${header}.${payload}`,
  }
}

describe('vapidToken', () => {
  it('signs a token the matching public key actually verifies', () => {
    const token = vapidToken(pair, ENDPOINT, NOW)
    const { signature, signed } = decode(token)

    const ok = verify('sha256', Buffer.from(signed, 'utf8'), {
      key: pair.verifier,
      dsaEncoding: 'ieee-p1363',
    }, signature)

    expect(ok).toBe(true)
  })

  it('emits a raw 64-byte signature, not a DER one', () => {
    // DER is `node:crypto`'s default and is what a push service rejects. A DER
    // signature is ~70 bytes and starts 0x30, so this fails loudly if the
    // `dsaEncoding` option is ever dropped.
    const { signature } = decode(vapidToken(pair, ENDPOINT, NOW))
    expect(signature.length).toBe(64)
    expect(signature[0]).not.toBe(0x30)
  })

  it('does not verify against a different key pair', () => {
    const other = newPair()
    const { signature, signed } = decode(vapidToken(pair, ENDPOINT, NOW))

    const ok = verify('sha256', Buffer.from(signed, 'utf8'), {
      key: other.verifier,
      dsaEncoding: 'ieee-p1363',
    }, signature)

    expect(ok).toBe(false)
  })

  it('addresses the token to the endpoint ORIGIN', () => {
    const { payload } = decode(vapidToken(pair, ENDPOINT, NOW))
    expect(payload.aud).toBe('https://fcm.googleapis.com')
    expect(payload.aud).not.toContain('/fcm/send')
  })

  it('carries a contact and an expiry inside the 24-hour ceiling', () => {
    const { header, payload } = decode(vapidToken(pair, ENDPOINT, NOW))

    expect(header).toEqual({ typ: 'JWT', alg: 'ES256' })
    expect(payload.sub).toBe('mailto:ops@example.com')

    const seconds = payload.exp - Math.floor(NOW.getTime() / 1000)
    expect(seconds).toBeGreaterThan(0)
    expect(seconds).toBeLessThan(24 * 60 * 60)
  })

  it('works for every push service, not just Google', () => {
    for (const endpoint of [
      'https://updates.push.services.mozilla.com/wpush/v2/gAAAA',
      'https://wns2-par02p.notify.windows.com/w/?token=abc',
      'https://web.push.apple.com/QF1n3',
    ]) {
      expect(decode(vapidToken(pair, endpoint, NOW)).payload.aud).toBe(new URL(endpoint).origin)
    }
  })

  it('refuses a key pair that is the wrong size rather than signing garbage', () => {
    expect(() => vapidToken({ ...pair, privateKey: 'AAAA' }, ENDPOINT, NOW)).toThrow(/32 bytes/)
    expect(() => vapidToken({ ...pair, publicKey: 'AAAA' }, ENDPOINT, NOW)).toThrow(/65 bytes/)
  })

  it('rejects a public key that is not an uncompressed point', () => {
    const compressed = Buffer.concat([Buffer.from([0x02]), Buffer.alloc(64)]).toString('base64url')
    expect(() => vapidToken({ ...pair, publicKey: compressed }, ENDPOINT, NOW)).toThrow(/uncompressed/)
  })
})

describe('vapidAuthorization', () => {
  it('is the `vapid t=..., k=...` header the RFC defines', () => {
    const header = vapidAuthorization(pair, ENDPOINT, NOW)
    const match = /^vapid t=([\w-]+\.[\w-]+\.[\w-]+), k=([\w-]+)$/.exec(header)

    expect(match, header).not.toBeNull()
    // `k` is the application server key the browser subscribed with. If it ever
    // disagreed with the signing key, every send would 403.
    expect(match![2]).toBe(pair.publicKey)
    expect(createPublicKey({ format: 'jwk', key: {
      kty: 'EC', crv: 'P-256',
      x: Buffer.from(pair.publicKey, 'base64url').subarray(1, 33).toString('base64url'),
      y: Buffer.from(pair.publicKey, 'base64url').subarray(33, 65).toString('base64url'),
    } })).toBeTruthy()
  })
})

describe('audienceOf', () => {
  it('drops everything after the origin, including a query string', () => {
    expect(audienceOf('https://host.example/a/b?c=d#e')).toBe('https://host.example')
  })
})

describe('vapidKeys', () => {
  it('is null unless all three variables are present, so push degrades instead of throwing', () => {
    // The learning half of this app must keep working with no backend
    // configured at all; a missing key is "notifications are unavailable here",
    // never a 500 on a page that merely mentions reminders.
    const before = {
      pub: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      priv: process.env.VAPID_PRIVATE_KEY,
      sub: process.env.VAPID_SUBJECT,
    }
    try {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      delete process.env.VAPID_PRIVATE_KEY
      delete process.env.VAPID_SUBJECT
      expect(vapidKeys()).toBeNull()

      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = pair.publicKey
      process.env.VAPID_PRIVATE_KEY = pair.privateKey
      expect(vapidKeys(), 'a pair with no contact is not usable').toBeNull()

      process.env.VAPID_SUBJECT = pair.subject
      expect(vapidKeys()).toEqual({
        publicKey: pair.publicKey,
        privateKey: pair.privateKey,
        subject: pair.subject,
      })
    } finally {
      if (before.pub === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = before.pub
      if (before.priv === undefined) delete process.env.VAPID_PRIVATE_KEY
      else process.env.VAPID_PRIVATE_KEY = before.priv
      if (before.sub === undefined) delete process.env.VAPID_SUBJECT
      else process.env.VAPID_SUBJECT = before.sub
    }
  })
})
