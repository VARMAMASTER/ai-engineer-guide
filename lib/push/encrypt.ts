/**
 * Message Encryption for Web Push — RFC 8291, over the `aes128gcm` content
 * coding of RFC 8188.
 *
 * SERVER ONLY (`node:crypto`).
 *
 * WHY THIS IS HAND-WRITTEN. The whole of it is sixty lines of standard
 * primitives that `node:crypto` already ships: one ECDH on P-256, four HMAC-
 * SHA-256 calls that are HKDF, and one AES-128-GCM seal. The alternative is a
 * dependency (`web-push`) whose real value is the HTTP plumbing this app
 * already has in `fetch`. That trade was made the same way `public/sw.js` was
 * written by hand instead of generated: a thin dependency tree is the point,
 * and this code is covered by a round-trip test that decrypts what it produces
 * with an independently generated subscriber key — the property that actually
 * matters, and one a wrapper would not have given us either.
 *
 * WHAT IS BEING PROTECTED, and from whom. The push service (FCM, Mozilla's
 * autopush, Apple's) is an untrusted relay. It sees the endpoint, the size and
 * the timing, and it must not be able to read the notification text. So the
 * payload is encrypted to a key only the subscriber's browser holds — the
 * `p256dh` public key and the 16-byte `auth` secret the browser minted at
 * subscribe time and handed to us. No key material derived here is ever stored.
 *
 * THE DERIVATION, in the order it happens:
 *
 *   ecdh_secret = ECDH(our ephemeral private, subscriber p256dh)
 *   PRK_key     = HMAC(auth_secret, ecdh_secret)
 *   key_info    = "WebPush: info" 0x00 || subscriber_public || our_public
 *   IKM         = HMAC(PRK_key, key_info || 0x01)[0..32]
 *   PRK         = HMAC(salt, IKM)                      -- salt is 16 random bytes
 *   CEK         = HMAC(PRK, "Content-Encoding: aes128gcm" 0x00 0x01)[0..16]
 *   NONCE       = HMAC(PRK, "Content-Encoding: nonce"     0x00 0x01)[0..12]
 *
 * Binding BOTH public keys into `key_info` is what makes the derived key
 * specific to this pair of parties: without it, a relay that could substitute
 * its own ephemeral key would be talking to the same derived secret.
 *
 * The body on the wire is RFC 8188's single record:
 *
 *   salt (16) || record size (4, big-endian) || keyid length (1) || our public
 *   key (65) || AES-128-GCM(padded plaintext)
 *
 * where the plaintext is padded with a single trailing 0x02 — the delimiter
 * that means "this is the last record". 0x01 there means "another record
 * follows" and produces a decryption error at the far end for a one-record
 * body, which is the kind of bug that shows up only as a silent non-delivery.
 *
 * The ephemeral key pair is generated PER MESSAGE and thrown away, so two
 * notifications to the same device share no key material.
 */
import { createCipheriv, createECDH, createHmac, randomBytes } from 'node:crypto'
import { MAX_PAYLOAD_BYTES } from './limits'

/** RFC 8188's record size. One record is always enough: payloads here are tiny. */
const RECORD_SIZE = 4096

export interface SubscriberKeys {
  /** The subscriber's public key: 65 raw bytes, uncompressed P-256. */
  p256dh: Buffer
  /** The subscriber's auth secret: 16 raw bytes. */
  auth: Buffer
}

/** Seams for the test, which needs a fixed salt and key pair to assert a vector. */
export interface EncryptOptions {
  salt?: Buffer
  /** Our ephemeral private scalar. Generated fresh per message when absent. */
  serverPrivateKey?: Buffer
}

function hmac(key: Buffer, data: Buffer): Buffer {
  return createHmac('sha256', key).update(data).digest()
}

/** HKDF-Expand for one block, which is all any of these four derivations need. */
function expand(prk: Buffer, info: Buffer, length: number): Buffer {
  return hmac(prk, Buffer.concat([info, Buffer.from([0x01])])).subarray(0, length)
}

function label(text: string): Buffer {
  return Buffer.concat([Buffer.from(text, 'utf8'), Buffer.from([0x00])])
}

/**
 * Encrypt one payload for one subscriber. Returns the exact bytes to PUT.
 *
 * Throws on an over-long payload rather than letting the push service reject
 * it with a 413 after a round trip — the caller can then shorten the message,
 * which is a decision only it can make.
 */
export function encryptPayload(
  plaintext: Buffer,
  keys: SubscriberKeys,
  options: EncryptOptions = {},
): Buffer {
  if (plaintext.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`push payload is ${plaintext.length} bytes; the limit is ${MAX_PAYLOAD_BYTES}`)
  }
  if (keys.p256dh.length !== 65 || keys.p256dh[0] !== 0x04) {
    throw new Error('subscriber p256dh must be a 65-byte uncompressed P-256 point')
  }
  if (keys.auth.length !== 16) {
    throw new Error('subscriber auth secret must be 16 bytes')
  }

  const ecdh = createECDH('prime256v1')
  if (options.serverPrivateKey) ecdh.setPrivateKey(options.serverPrivateKey)
  else ecdh.generateKeys()

  const serverPublic = ecdh.getPublicKey()
  const sharedSecret = ecdh.computeSecret(keys.p256dh)

  const prkKey = hmac(keys.auth, sharedSecret)
  const keyInfo = Buffer.concat([label('WebPush: info'), keys.p256dh, serverPublic])
  const ikm = expand(prkKey, keyInfo, 32)

  const salt = options.salt ?? randomBytes(16)
  if (salt.length !== 16) throw new Error('salt must be 16 bytes')
  const prk = hmac(salt, ikm)

  const cek = expand(prk, label('Content-Encoding: aes128gcm'), 16)
  const nonce = expand(prk, label('Content-Encoding: nonce'), 12)

  // 0x02 = last record. See the header comment: 0x01 here breaks decryption.
  const padded = Buffer.concat([plaintext, Buffer.from([0x02])])

  const cipher = createCipheriv('aes-128-gcm', cek, nonce)
  const ciphertext = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()])

  const recordSize = Buffer.alloc(4)
  recordSize.writeUInt32BE(RECORD_SIZE, 0)

  return Buffer.concat([
    salt,
    recordSize,
    Buffer.from([serverPublic.length]),
    serverPublic,
    ciphertext,
  ])
}
