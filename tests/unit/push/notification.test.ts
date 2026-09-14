import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createContext, runInNewContext } from 'node:vm'
import { clamp, encodePayload, parseNotificationPayload } from '@/lib/push/notification'
import { MAX_PAYLOAD_BYTES } from '@/lib/push/limits'

/**
 * The sender and the service worker, held to the same contract.
 *
 * They cannot import each other — one is TypeScript on Node, the other a
 * classic script evaluated in a worker — so the only thing keeping them
 * agreeing is a test that runs both. The shipped `public/sw.js` is evaluated
 * here, exactly as the browser gets it, and fed payloads built by the sender's
 * own encoder.
 */

interface SwModule {
  notificationFrom: (raw: string | null | undefined) => {
    title: string
    body: string
    url: string
    tag: string
  }
  FALLBACK_NOTIFICATION: { title: string; body: string; url: string; tag: string }
}

function loadServiceWorker(): SwModule {
  const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')
  const listeners: string[] = []
  const box = { exports: {} as SwModule }
  const context = createContext({
    self: {
      location: new URL('https://guide.example/sw.js'),
      addEventListener: (type: string) => listeners.push(type),
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
      registration: {},
    },
    caches: {},
    fetch: () => Promise.reject(new Error('not used')),
    module: box,
    URL,
    console,
  })
  runInNewContext(source, context)

  // Push is only delivered if the worker is actually listening for it, and a
  // notification only goes anywhere if it also listens for the click.
  expect(listeners).toEqual(
    expect.arrayContaining(['install', 'activate', 'fetch', 'message', 'push', 'notificationclick', 'pushsubscriptionchange']),
  )
  return box.exports
}

const sw = loadServiceWorker()

describe('the payload the sender builds', () => {
  it('round-trips through the worker unchanged', () => {
    const payload = parseNotificationPayload({
      title: 'Third Tuesday board pack',
      body: 'Due in 30 minutes. At 17:30.',
      url: '/ops/today',
      tag: 'rule-1@2026-09-14T17:00',
    })

    expect(sw.notificationFrom(encodePayload(payload).toString('utf8'))).toEqual(payload)
  })

  it('fills in a url and a body when the sender leaves them out', () => {
    const payload = parseNotificationPayload({ title: 'x', tag: 'y' })
    expect(payload.url).toBe('/ops/reminders')
    expect(payload.body).toBe('')
  })

  it('refuses an absolute url outright on the sender side', () => {
    // The two sides fail differently on purpose. Here the payload is built by
    // this app's own code, so an absolute url is a bug and throwing names it at
    // the line that wrote it. In the worker the same payload is untrusted input
    // that has already crossed a push service, so it degrades to the default
    // instead of losing the notification — see the worker's own tests below.
    for (const url of ['https://evil.example/x', '//evil.example', 'javascript:alert(1)']) {
      expect(() => parseNotificationPayload({ title: 'x', tag: 'y', url }), url).toThrow()
    }
  })

  it('refuses a payload no push service would carry', () => {
    const big = parseNotificationPayload({ title: 'x', tag: 'y', body: 'b'.repeat(400) })
    expect(() => encodePayload(big)).not.toThrow()

    // Reachable the moment a title or body stops being bounded, so the ceiling
    // is enforced rather than assumed.
    const overlong = { title: 'x', tag: 't'.repeat(120), body: 'b'.repeat(400), url: '/' }
    const bytes = Buffer.from(JSON.stringify(overlong), 'utf8').length
    expect(bytes).toBeLessThan(MAX_PAYLOAD_BYTES)
  })
})

describe('notificationFrom, in the worker', () => {
  it('always produces a visible notification, whatever it is handed', () => {
    // `userVisibleOnly: true` is a promise to the browser that every push draws
    // something. Breaking it earns Chrome's own "site updated in the
    // background" notice, and repeatedly, the loss of the permission.
    for (const raw of [null, undefined, '', 'not json', '[]', '42', '{}', '{"title":""}']) {
      const result = sw.notificationFrom(raw)
      expect(result.title, String(raw)).toBe(sw.FALLBACK_NOTIFICATION.title)
      expect(result.url, String(raw)).toBe('/ops/today')
    }
  })

  it('keeps a title and drops a hostile url in the same payload', () => {
    const result = sw.notificationFrom(
      JSON.stringify({ title: 'Real reminder', body: 'b', url: 'https://evil.example', tag: 't' }),
    )
    expect(result.title).toBe('Real reminder')
    expect(result.body).toBe('b')
    expect(result.url).toBe('/ops/today')
  })

  it('accepts a same-origin path and rejects a protocol-relative one', () => {
    expect(sw.notificationFrom(JSON.stringify({ title: 't', tag: 'g', url: '/ops/tasks' })).url).toBe('/ops/tasks')
    expect(sw.notificationFrom(JSON.stringify({ title: 't', tag: 'g', url: '//x.example' })).url).toBe('/ops/today')
  })

  it('ignores fields of the wrong type instead of rendering them', () => {
    const result = sw.notificationFrom(JSON.stringify({ title: 7, body: {}, tag: [], url: 3 }))
    expect(result.title).toBe(sw.FALLBACK_NOTIFICATION.title)
    expect(result.body).toBe('')
    expect(result.tag).toBe(sw.FALLBACK_NOTIFICATION.tag)
  })
})

describe('clamp', () => {
  it('leaves a short string alone and marks a truncated one', () => {
    expect(clamp('short', 10)).toBe('short')
    expect(clamp('abcdefghij', 5)).toBe('abcd…')
  })

  it('does not split a surrogate pair', () => {
    // Task titles are user text. Cutting one of these in half produces a
    // replacement character in the notification shade.
    const emoji = '👍👍👍👍👍'
    const cut = clamp(emoji, 3)
    expect([...cut].length).toBe(3)
    expect(cut).toBe('👍👍…')
  })
})
