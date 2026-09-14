/**
 * The browser half of push. Runs in a Client Component and nowhere else.
 *
 * NOTHING SECRET IS REACHABLE FROM HERE, and that is load-bearing rather than
 * incidental. Only `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is read — the application
 * server key, which is not a secret and which the browser is required to be
 * given in order to subscribe at all. The private half lives in `./vapid.ts`,
 * behind a plain `VAPID_PRIVATE_KEY`; a `NEXT_PUBLIC_` prefix on that one would
 * be inlined into this bundle by the compiler and shipped to every visitor.
 * `tests/unit/push/client.test.ts` asserts that nothing under `lib/push` reads
 * a private key through a `NEXT_PUBLIC_` name.
 *
 * THE PERMISSION PROMPT IS THE PRODUCT DECISION IN THIS FILE.
 * `Notification.requestPermission()` is called by `subscribe()` and by nothing
 * else, and `subscribe()` is only ever reached from a button press — never on
 * mount, never from an effect. An unprompted permission dialog is the
 * most-denied dialog on the web, and a denial is close to permanent: the
 * browser will not ask again, and recovery means the user finding site
 * settings. So the UI explains what will arrive BEFORE the button exists, and
 * the browser's dialog is the second question, not the first.
 */

/** Where the reason for "you cannot turn this on" comes from, for the UI to explain. */
export type PushSupport =
  | { kind: 'ready' }
  | { kind: 'unconfigured' }
  | { kind: 'unsupported' }
  | { kind: 'ios-needs-install' }

/**
 * The application server key, as the `Uint8Array` `subscribe()` requires.
 *
 * Written as a literal `process.env.NEXT_PUBLIC_...` access because only that
 * exact form is substituted at build time; a computed lookup arrives as
 * `undefined` in the browser.
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

/**
 * base64url -> bytes, without `Buffer`.
 *
 * Typed as `Uint8Array<ArrayBuffer>` rather than the default
 * `Uint8Array<ArrayBufferLike>`: `applicationServerKey` requires a
 * `BufferSource` backed by a real `ArrayBuffer`, and the looser alias admits a
 * `SharedArrayBuffer`, which it does not accept. Allocating the buffer
 * explicitly is what makes the narrower type true rather than asserted.
 */
export function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * iOS/iPadOS supports web push ONLY for a PWA the user has added to the Home
 * Screen — a subscription from Safari's normal browsing UI is not merely
 * denied, the API is absent. Detecting it is the difference between an honest
 * "add Unyfide to your Home Screen first" and a button that appears to do
 * nothing.
 *
 * Feature detection cannot answer this on its own: `PushManager` is missing in
 * both the "browser tab on iOS" case and the "browser that has no push at all"
 * case, and those need different sentences. So the platform is sniffed, which
 * is the narrow situation where sniffing is the correct tool.
 */
function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  // iPadOS 13+ reports itself as a Mac; a touch-capable "Mac" is an iPad.
  return ua.includes('Macintosh') && navigator.maxTouchPoints > 1
}

function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // Safari's own flag, which is the only one that is true for an iOS PWA.
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return { kind: 'unsupported' }
  if (!VAPID_PUBLIC_KEY) return { kind: 'unconfigured' }

  const hasApi =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (hasApi) return { kind: 'ready' }

  if (isIosSafari() && !isInstalled()) return { kind: 'ios-needs-install' }
  return { kind: 'unsupported' }
}

/** The browser's current answer, without asking it anything. */
export function permissionState(): NotificationPermission | 'unavailable' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unavailable'
  return Notification.permission
}

/** The zone the reminder rules must be evaluated in. See `./time.ts`. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing
  // In development the registrar deliberately unregisters workers, so this is
  // the path a dev-mode subscribe takes.
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

export type SubscribeResult =
  | { kind: 'subscribed' }
  | { kind: 'denied' }
  | { kind: 'dismissed' }
  | { kind: 'failed'; message: string }

/**
 * Ask for permission, subscribe, and register the subscription with the server.
 *
 * MUST be called from a user gesture. See the module comment.
 *
 * `userVisibleOnly: true` is not optional in Chrome, and it is also a promise
 * this app keeps: every push this sender produces results in a visible
 * notification, which is what `public/sw.js`'s `push` handler guarantees even
 * when the payload is missing or unparseable.
 */
export async function subscribe(): Promise<SubscribeResult> {
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'denied') return { kind: 'denied' }
    // Chrome returns 'default' when the user closed the dialog without
    // choosing. That is recoverable — asking again later is allowed — so it is
    // reported separately from a denial, which is not.
    if (permission !== 'granted') return { kind: 'dismissed' }

    const reg = await registration()
    await navigator.serviceWorker.ready

    const existing = await reg.pushManager.getSubscription()
    const subscription =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(VAPID_PUBLIC_KEY),
      }))

    const json = subscription.toJSON()
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        timezone: browserTimeZone(),
      }),
    })

    if (!response.ok) {
      // The browser now holds a subscription the server does not know about,
      // which would be a device that can never be reached. Undo it, so the
      // next attempt starts clean rather than finding a stale `getSubscription`.
      await subscription.unsubscribe().catch(() => undefined)
      const problem = await response.json().catch(() => null)
      return { kind: 'failed', message: problem?.error ?? `The server refused (${response.status}).` }
    }

    return { kind: 'subscribed' }
  } catch (cause) {
    return { kind: 'failed', message: cause instanceof Error ? cause.message : 'Something went wrong.' }
  }
}

/**
 * Stop notifications on this device.
 *
 * The server row is deleted FIRST. If the order were reversed and the page
 * closed in between, the browser would have dropped the subscription while the
 * table kept a row that can never be delivered to — an endpoint that answers
 * 410 forever, retried on every run.
 */
export async function unsubscribe(): Promise<{ ok: boolean; message?: string }> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/')
    const subscription = await reg?.pushManager.getSubscription()

    if (subscription) {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      if (!response.ok) return { ok: false, message: `The server refused (${response.status}).` }
      await subscription.unsubscribe()
    }

    return { ok: true }
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : 'Something went wrong.' }
  }
}

/** Whether this device currently holds a subscription. */
export async function hasSubscription(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
    const reg = await navigator.serviceWorker.getRegistration('/')
    return Boolean(await reg?.pushManager.getSubscription())
  } catch {
    return false
  }
}
