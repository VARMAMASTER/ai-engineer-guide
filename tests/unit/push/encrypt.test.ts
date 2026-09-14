import { describe, it, expect } from 'vitest'
import { createCipheriv, createDecipheriv, createECDH, createHmac, randomBytes } from 'node:crypto'
import { encryptPayload } from '@/lib/push/encrypt'
import { MAX_PAYLOAD_BYTES } from '@/lib/push/limits'

/**
 * RFC 8291 message encryption, tested by DECRYPTING what it produces.
 *
 * This is the test that justifies not taking a dependency for the crypto. A
 * unit test that asserts "the output is 150 bytes and starts with the salt"
 * would pass for an implementation that derived the wrong key — which is
 * exactly the bug a wrapper library would have protected against, and exactly
 * the bug that shows up in production as notifications that are accepted by the
 * push service with a 201 and then silently discarded by the browser.
 *
 * So the subscriber half is implemented here, independently and from the RFC,
 * with a key pair this file generates: if `encryptPayload` derives a different
 * CEK or nonce, `createDecipheriv` fails its authentication tag and the test
 * fails loudly. The only way both halves agree is if both are right.
 */

const KEY_INFO = Buffer.from('WebPush: info\0', 'utf8')
const CEK_INFO = Buffer.from('Content-Encoding: aes128gcm\0', 'utf8')
const NONCE_INFO = Buffer.from('Content-Encoding: nonce\0', 'utf8')

function hmac(key: Buffer, data: Buffer): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

function expand(prk: Buffer, info: Buffer, length: number): Buffer {
  return hmac(prk, Buffer.concat([info, Buffer.from([0x01])])).subarray(0, length)
}

/** A browser's half of a push subscription. */
function newSubscriber() {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  return {
    privateKey: ecdh.getPrivateKey(),
    p256dh: ecdh.getPublicKey(),
    auth: randomBytes(16),
  }
}

/** What the browser does with the bytes it is handed. Written from RFC 8188/8291. */
function decrypt(body: Buffer, subscriber: ReturnType<typeof newSubscriber>): Buffer {
  const salt = body.subarray(0, 16)
  const recordSize = body.readUInt32BE(16)
  const keyIdLength = body[20]
  const serverPublic = body.subarray(21, 21 + keyIdLength)
  const ciphertext = body.subarray(21 + keyIdLength)

  expect(recordSize, 'record size should be the 4096 the sender declares').toBe(4096)
  expect(keyIdLength, 'the key id is an uncompressed P-256 point').toBe(65)

  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(subscriber.privateKey)
  const shared = ecdh.computeSecret(serverPublic)

  const prkKey = hmac(subscriber.auth, shared)
  const ikm = expand(prkKey, Buffer.concat([KEY_INFO, subscriber.p256dh, serverPublic]), 32)
  const prk = hmac(salt, ikm)
  const cek = expand(prk, CEK_INFO, 16)
  const nonce = expand(prk, NONCE_INFO, 12)

  const tag = ciphertext.subarray(ciphertext.length - 16)
  const sealed = ciphertext.subarray(0, ciphertext.length - 16)
  const decipher = createDecipheriv('aes-128-gcm', cek, nonce)
  decipher.setAuthTag(tag)
  const padded = Buffer.concat([decipher.update(sealed), decipher.final()])

  // The last byte is RFC 8188's record delimiter; 0x02 means "last record".
  expect(padded[padded.length - 1]).toBe(0x02)
  return padded.subarray(0, padded.length - 1)
}

describe('encryptPayload', () => {
  it('produces something the subscriber can decrypt back to the original bytes', () => {
    const subscriber = newSubscriber()
    const plaintext = Buffer.from(
      JSON.stringify({ title: 'Third Tuesday board pack', body: 'Due in 30 minutes.' }),
      'utf8',
    )

    const body = encryptPayload(plaintext, { p256dh: subscriber.p256dh, auth: subscriber.auth })

    expect(decrypt(body, subscriber).toString('utf8')).toBe(plaintext.toString('utf8'))
  })

  it('survives a round trip of non-ASCII text, which a byte-length bug would not', () => {
    const subscriber = newSubscriber()
    const plaintext = Buffer.from('Déjeuner — 13:00 · 早い', 'utf8')

    const body = encryptPayload(plaintext, { p256dh: subscriber.p256dh, auth: subscriber.auth })

    expect(decrypt(body, subscriber).toString('utf8')).toBe('Déjeuner — 13:00 · 早い')
  })

  it('uses a fresh ephemeral key and salt per message', () => {
    const subscriber = newSubscriber()
    const plaintext = Buffer.from('same message', 'utf8')
    const keys = { p256dh: subscriber.p256dh, auth: subscriber.auth }

    const first = encryptPayload(plaintext, keys)
    const second = encryptPayload(plaintext, keys)

    // Identical plaintext, identical subscriber, and yet nothing on the wire
    // repeats — neither the salt (first 16) nor the public key (21..86).
    expect(first.subarray(0, 16).equals(second.subarray(0, 16))).toBe(false)
    expect(first.subarray(21, 86).equals(second.subarray(21, 86))).toBe(false)
    expect(decrypt(first, subscriber).toString()).toBe('same message')
    expect(decrypt(second, subscriber).toString()).toBe('same message')
  })

  it('is deterministic when the salt and ephemeral key are pinned', () => {
    // Not a property the sender relies on — it is what makes the derivation
    // testable at all, and it proves nothing but the salt and key vary above.
    const subscriber = newSubscriber()
    const salt = randomBytes(16)
    const ecdh = createECDH('prime256v1')
    ecdh.generateKeys()
    const options = { salt, serverPrivateKey: ecdh.getPrivateKey() }
    const keys = { p256dh: subscriber.p256dh, auth: subscriber.auth }

    const a = encryptPayload(Buffer.from('x'), keys, options)
    const b = encryptPayload(Buffer.from('x'), keys, options)
    expect(a.equals(b)).toBe(true)
  })

  it('writes the header exactly as RFC 8188 lays it out', () => {
    const subscriber = newSubscriber()
    const body = encryptPayload(Buffer.from('hi'), {
      p256dh: subscriber.p256dh,
      auth: subscriber.auth,
    })

    expect(body.readUInt32BE(16)).toBe(4096)
    expect(body[20]).toBe(65)
    expect(body[21], 'the key id must be an uncompressed point').toBe(0x04)
    // salt + rs + idlen + key + (2 bytes plaintext + 1 delimiter + 16 tag)
    expect(body.length).toBe(16 + 4 + 1 + 65 + 19)
  })

  it('refuses a payload no push service is required to carry', () => {
    const subscriber = newSubscriber()
    const keys = { p256dh: subscriber.p256dh, auth: subscriber.auth }

    expect(() => encryptPayload(Buffer.alloc(MAX_PAYLOAD_BYTES), keys)).not.toThrow()
    expect(() => encryptPayload(Buffer.alloc(MAX_PAYLOAD_BYTES + 1), keys)).toThrow(/limit is/)
  })

  it('rejects a malformed subscription rather than producing undeliverable bytes', () => {
    const subscriber = newSubscriber()

    expect(() =>
      encryptPayload(Buffer.from('x'), { p256dh: Buffer.alloc(64), auth: subscriber.auth }),
    ).toThrow(/65-byte uncompressed/)

    expect(() =>
      encryptPayload(Buffer.from('x'), { p256dh: subscriber.p256dh, auth: Buffer.alloc(8) }),
    ).toThrow(/16 bytes/)
  })
})

describe('the test harness itself', () => {
  it('fails when the ciphertext is tampered with', () => {
    // Guards the guard: if `decrypt` ignored the authentication tag, every
    // assertion above would pass for a broken sender.
    const subscriber = newSubscriber()
    const body = encryptPayload(Buffer.from('hello'), {
      p256dh: subscriber.p256dh,
      auth: subscriber.auth,
    })
    const tampered = Buffer.from(body)
    tampered[tampered.length - 20] ^= 0xff

    expect(() => decrypt(tampered, subscriber)).toThrow()
  })

  it('knows AES-128-GCM the same way the sender does', () => {
    // A sanity check on the primitive, so a Node change that altered tag
    // handling would show up here rather than as an unexplained delivery bug.
    const key = randomBytes(16)
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-128-gcm', key, iv)
    const sealed = Buffer.concat([cipher.update('abc'), cipher.final()])
    const decipher = createDecipheriv('aes-128-gcm', key, iv)
    decipher.setAuthTag(cipher.getAuthTag())
    expect(Buffer.concat([decipher.update(sealed), decipher.final()]).toString()).toBe('abc')
  })
})
