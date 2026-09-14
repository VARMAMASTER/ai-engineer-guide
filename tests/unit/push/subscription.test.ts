import { describe, it, expect } from 'vitest'
import {
  PushSubscriptionInputSchema,
  SUBSCRIPTION_COLUMNS,
  inputToRow,
} from '@/lib/push/subscription'

/**
 * The subscribe endpoint's request body is untrusted input from a browser, and
 * what it writes is a row saying "you may wake this device". So the schema is
 * the boundary, and these are the shapes that must not get past it.
 */

const VALID = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/f4Ke-eNdPo1nt',
  keys: {
    // 65 raw bytes -> 87 base64url characters; 16 -> 22.
    p256dh: 'B'.repeat(87),
    auth: 'A'.repeat(22),
  },
  timezone: 'Asia/Kolkata',
}

describe('PushSubscriptionInputSchema', () => {
  it('accepts what a browser actually sends', () => {
    expect(PushSubscriptionInputSchema.parse(VALID)).toEqual(VALID)
  })

  it('insists the endpoint is https', () => {
    // A push endpoint is always https. Anything else is either a mistake or an
    // attempt to make this server POST an encrypted blob somewhere chosen by
    // the caller.
    for (const endpoint of ['http://fcm.googleapis.com/x', 'file:///etc/passwd', 'ftp://x/y', '']) {
      expect(PushSubscriptionInputSchema.safeParse({ ...VALID, endpoint }).success, endpoint).toBe(false)
    }
  })

  it('pins both key lengths, so a truncated key never reaches the crypto', () => {
    // A short p256dh fails inside ECDH with an opaque OpenSSL error much later.
    // Rejecting it here names the problem at the point it arrived.
    expect(PushSubscriptionInputSchema.safeParse({
      ...VALID, keys: { ...VALID.keys, p256dh: 'B'.repeat(86) },
    }).success).toBe(false)
    expect(PushSubscriptionInputSchema.safeParse({
      ...VALID, keys: { ...VALID.keys, auth: 'A'.repeat(21) },
    }).success).toBe(false)
  })

  it('bounds the endpoint and the timezone, because both are stored', () => {
    expect(PushSubscriptionInputSchema.safeParse({
      ...VALID, endpoint: `https://x/${'y'.repeat(1000)}`,
    }).success).toBe(false)
    expect(PushSubscriptionInputSchema.safeParse({
      ...VALID, timezone: 'z'.repeat(65),
    }).success).toBe(false)
  })

  it('requires the keys object at all', () => {
    expect(PushSubscriptionInputSchema.safeParse({ endpoint: VALID.endpoint, timezone: 'UTC' }).success).toBe(false)
    expect(PushSubscriptionInputSchema.safeParse({ ...VALID, keys: null }).success).toBe(false)
  })
})

describe('inputToRow', () => {
  it('takes the timezone it is GIVEN, not the one in the body', () => {
    // The route passes the value through `safeTimeZone` first. Threading the
    // sanitised value in as an argument is what makes it impossible to store
    // the raw one by forgetting a call here.
    const row = inputToRow({ ...VALID, timezone: 'Mars/Olympus_Mons' }, 'UTC')
    expect(row.timezone).toBe('UTC')
  })

  it('does not invent a user id', () => {
    // The route is the only thing that knows who is signed in, and RLS is what
    // keeps accounts apart. A `user_id` here would read as though this pure
    // function were doing the scoping.
    expect(Object.keys(inputToRow(VALID, 'UTC')).sort()).toEqual(
      ['auth', 'endpoint', 'p256dh', 'timezone'],
    )
  })
})

describe('SUBSCRIPTION_COLUMNS', () => {
  it('names every field a send needs', () => {
    for (const column of ['endpoint', 'p256dh', 'auth', 'timezone']) {
      expect(SUBSCRIPTION_COLUMNS, column).toContain(column)
    }
  })
})
