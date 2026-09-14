/**
 * base64url, as bytes.
 *
 * SERVER ONLY — it uses `Buffer`. Browser-side decoding lives in
 * `./client.ts`, which is written against `atob` instead, so importing this
 * file from a Client Component would be a bundle-size and correctness mistake
 * rather than merely redundant.
 *
 * Every wire value in web push is base64url of RAW BYTES, never of text and
 * never standard base64: the subscription's `p256dh` (65 bytes) and `auth`
 * (16 bytes), the application server key (65 bytes), the private scalar (32
 * bytes), and each of the three JWT segments. `+/` and `=` are all illegal in
 * those positions, which is why the padding-stripping variant is the only one
 * this module speaks.
 */

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url')
}

export function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url')
}

/**
 * Decode and insist on an exact byte length.
 *
 * `Buffer.from(x, 'base64url')` never throws: it stops at the first byte it
 * cannot read and hands back whatever it managed, so a truncated `p256dh`
 * arrives as a short buffer and fails much later inside ECDH with an opaque
 * OpenSSL error. Checking the length at the boundary turns a corrupt
 * subscription into a named error at the point it was read.
 */
export function decodeExactly(value: string, bytes: number, what: string): Buffer {
  const decoded = fromBase64Url(value)
  if (decoded.length !== bytes) {
    throw new Error(`${what} should be ${bytes} bytes, got ${decoded.length}`)
  }
  return decoded
}
