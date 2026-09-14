/**
 * The one size budget in the push system, in the one file that can be imported
 * from anywhere.
 *
 * It lives alone because both ends need it and neither may import the other:
 * `./encrypt.ts` enforces it on the bytes it seals (`node:crypto`), and
 * `./notification.ts` enforces it on the JSON before that, so the failure is
 * "this notification is too long" rather than an opaque crypto error.
 *
 * 4096 is the payload size RFC 8030 §7.2 requires every push service to accept.
 * AES-128-GCM's authentication tag (16 bytes) and RFC 8188's record delimiter
 * (1 byte) are spent out of the same budget, so the plaintext ceiling is lower
 * than the number people quote.
 */
export const MAX_PAYLOAD_BYTES = 4096 - 16 - 1
