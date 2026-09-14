import { expect, test } from '@playwright/test'

/**
 * The push surface, walked as a real browser and a real HTTP client.
 *
 * WHAT THIS FILE CAN AND CANNOT COVER. Actually receiving a push needs a real
 * push service to hand the browser an endpoint, and Chrome refuses the Push API
 * in the incognito profile every Playwright context uses
 * (crbug.com/41124656) — so delivery itself is verified by hand against a real
 * Chrome profile and FCM, and recorded in
 * `.superpowers/sdd/2026-09-06-ai-engineer-guide/task-push.md`.
 *
 * What IS automated here is everything a regression would silently break: the
 * four endpoints' auth posture, the worker still registering with its push
 * handlers attached, and the Reminders section no longer claiming that nothing
 * is delivered.
 */

test.describe('the push endpoints refuse anonymous callers', () => {
  test('subscribing and unsubscribing need a session', async ({ request }) => {
    // These write a row saying "you may wake this device". An open one would
    // let anybody register an endpoint against somebody else's account.
    for (const path of ['/api/push/subscribe', '/api/push/unsubscribe', '/api/push/test']) {
      const response = await request.post(path, { data: { endpoint: 'https://example.test/x' } })
      expect(response.status(), path).toBe(401)
    }
  })

  test('the scheduled sender needs the cron secret', async ({ request }) => {
    // The worst endpoint in the app to leave open: it sends a notification to
    // every user who has turned them on, and can be fired in a loop.
    const anonymous = await request.get('/api/push/send')
    expect(anonymous.status()).toBe(401)

    const wrong = await request.get('/api/push/send', {
      headers: { authorization: 'Bearer definitely-not-the-secret' },
    })
    expect(wrong.status()).toBe(401)

    // A bare token without the scheme must not pass either.
    const unschemed = await request.get('/api/push/send', {
      headers: { authorization: 'definitely-not-the-secret' },
    })
    expect(unschemed.status()).toBe(401)
  })

  test('none of them is cacheable', async ({ request }) => {
    const response = await request.get('/api/push/send')
    expect(response.headers()['cache-control'] ?? '').not.toContain('public')
  })
})

test.describe('the service worker', () => {
  test('still activates, now with the push handlers attached', async ({ page }) => {
    await page.goto('/today')

    // Activation is the part that could regress: a syntax error anywhere in the
    // push code below `classify` kills the whole worker, and the symptom is an
    // app that silently stops working offline rather than one that fails here.
    // `ready` resolving is not the same as activated — the worker may still be
    // running its `activate` handler, which sweeps old caches and claims the
    // page — so wait for the state rather than sampling it.
    const state = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      const worker = registration.active
      if (!worker) return 'none'
      if (worker.state === 'activated') return worker.state
      await new Promise<void>((resolve) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve()
        })
      })
      return worker.state
    })
    expect(state).toBe('activated')

    // The shipped file as the browser fetches it: the handlers must be in the
    // bytes actually served, not only in the repository.
    const source = await (await page.request.get('/sw.js')).text()
    for (const handler of ["'push'", "'notificationclick'", "'pushsubscriptionchange'"]) {
      expect(source, `sw.js should register a ${handler} listener`).toContain(
        `addEventListener(${handler}`,
      )
    }
    // And the caching it already had is still there. `tests/e2e/pwa.spec.ts`
    // proves that behaviour works; this only proves push did not remove it.
    for (const handler of ["'fetch'", "'install'", "'activate'", "'message'"]) {
      expect(source, `sw.js must keep its ${handler} listener`).toContain(
        `addEventListener(${handler}`,
      )
    }
  })
})

test.describe('the Reminders section', () => {
  test('no longer tells people nothing is delivered', async ({ request }) => {
    // The old copy said so honestly, and leaving it up after delivery shipped
    // would be the same dishonesty pointing the other way.
    const response = await request.get('/ops')
    const html = await response.text()
    expect(html).not.toContain('Nothing is delivered yet')
  })

  test('is still gated, so the subscribe controls are behind a session', async ({ page }) => {
    await page.goto('/ops/reminders')
    expect(page.url()).toContain('/sign-in')
    expect(page.url()).toContain(encodeURIComponent('/ops/reminders'))
  })
})
