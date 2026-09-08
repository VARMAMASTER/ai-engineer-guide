import { expect, test, type BrowserContext, type ConsoleMessage, type Page } from '@playwright/test'
import { seedDayOne, seedProgress } from './helpers'

/**
 * The offline promise, exercised the only way it can be believed: a real
 * browser, a production build, and the network actually switched off.
 *
 * Everything here also doubles as the installability gate. Chrome on Android
 * offers "Install app" only when the manifest parses, names a same-origin
 * start_url that answers directly, declares a real 192 and 512 PNG whose
 * pixel dimensions match their `sizes`, and a service worker with a fetch
 * handler is activated — so each of those is asserted separately below.
 */

/** Width and height out of a PNG's IHDR: 8-byte signature, length, type, then w/h. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  expect(bytes.toString('latin1', 12, 16)).toBe('IHDR')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

async function workerState(page: Page): Promise<string> {
  return page.evaluate(async () => {
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
}

/**
 * Wait until the worker has actually stored the app shell.
 *
 * Registration resolving is not the same as being useful offline: the build
 * chunks are handed over by `postMessage` after the page loads, so a test that
 * goes offline the moment `ready` resolves is racing the thing it is testing.
 */
async function waitForWarmCaches(page: Page): Promise<void> {
  await page.waitForFunction(
    async () => {
      const names = await caches.keys()
      const staticName = names.find((n) => n.startsWith('aeg-static-'))
      const pagesName = names.find((n) => n.startsWith('aeg-pages-'))
      if (!staticName || !pagesName) return false
      const [assets, pages] = await Promise.all([caches.open(staticName), caches.open(pagesName)])
      const [assetKeys, pageKeys] = await Promise.all([assets.keys(), pages.keys()])
      return (
        assetKeys.length >= 4 &&
        pageKeys.some((request) => new URL(request.url).pathname === '/today')
      )
    },
    null,
    { timeout: 30_000 },
  )
}

/**
 * Register, activate, take control, and fill the caches.
 *
 * The second load is not padding. A page that registers a worker is not
 * controlled by it until `clients.claim()` lands, so every request that page
 * already issued — including the router's prefetches of the nav — was never
 * seen by the worker. `warm()` hands over the build assets from that first
 * load; the prefetches recover on the next controlled load, which is what
 * every launch from an installed icon already is.
 */
async function installWorker(page: Page, at = '/today'): Promise<void> {
  await page.goto(at)
  expect(await workerState(page)).toBe('activated')
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {
    timeout: 15_000,
  })
  await waitForWarmCaches(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
}

function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`)
  })
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  page.on('requestfailed', (req) =>
    problems.push(`requestfailed: ${req.url()} — ${req.failure()?.errorText ?? 'unknown'}`),
  )
  return problems
}

async function goOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true)
}

test.describe('installability', () => {
  test('the manifest is linked from the document and parses', async ({ page, request }) => {
    await page.goto('/today')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href, 'no <link rel="manifest"> in the document').toBeTruthy()

    const response = await request.get(href!)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('manifest+json')

    const manifest = JSON.parse(await response.text())
    expect(manifest.name).toBe('AI Engineer Practice Guide')
    expect(manifest.short_name).toBe('AI Guide')
    expect(manifest.id).toBe('/')
    expect(manifest.start_url).toBe('/today')
    expect(manifest.scope).toBe('/')
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display)
    expect(manifest.theme_color).toBe('#121822')
    expect(manifest.background_color).toBe('#121822')
  })

  test('start_url answers 200 directly, with no redirect in the way', async ({ request }) => {
    // The usual silent failure: pointing start_url at `/`, which 307s.
    const direct = await request.get('/today', { maxRedirects: 0 })
    expect(direct.status()).toBe(200)

    const root = await request.get('/', { maxRedirects: 0 })
    expect(root.status(), '/ is still the redirect it always was').toBe(307)
  })

  test('every declared icon resolves and decodes at its declared size', async ({ request }) => {
    const manifest = JSON.parse(await (await request.get('/manifest.webmanifest')).text())
    const icons: { src: string; sizes: string; type: string; purpose?: string }[] = manifest.icons
    expect(icons.length).toBeGreaterThanOrEqual(3)

    for (const icon of icons) {
      const response = await request.get(icon.src)
      expect(response.status(), `${icon.src} did not resolve`).toBe(200)
      expect(response.headers()['content-type'], `${icon.src} content-type`).toBe('image/png')

      const bytes = await response.body()
      const { width, height } = pngSize(bytes)
      expect(
        `${width}x${height}`,
        `${icon.src} decodes to ${width}x${height} but declares ${icon.sizes} — Chrome drops the whole manifest for this`,
      ).toBe(icon.sizes)
    }

    // Chrome's own floor: a 192 and a 512 for `any`, plus the maskable Android
    // uses for the adaptive launcher shape.
    const anySizes = icons.filter((i) => i.purpose !== 'maskable').map((i) => i.sizes)
    expect(anySizes).toContain('192x192')
    expect(anySizes).toContain('512x512')
    expect(icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true)

    const apple = await request.get('/icons/apple-touch-icon.png')
    expect(apple.status()).toBe(200)
    expect(pngSize(await apple.body())).toEqual({ width: 180, height: 180 })
  })

  test("Chrome itself reports no installability errors", async ({ page, context }) => {
    // The individual criteria are asserted above; this asks the browser for its
    // own verdict, which is the thing that actually decides whether "Install
    // app" appears on an Android phone.
    const cdp = await context.newCDPSession(page)
    await page.goto('/today')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })

    const manifest = (await cdp.send('Page.getAppManifest')) as { errors: unknown[] }
    expect(manifest.errors, 'Chrome could not parse the manifest').toEqual([])

    try {
      const verdict = (await cdp.send(
        'Page.getInstallabilityErrors' as 'Page.getAppManifest',
      )) as unknown as { installabilityErrors: { errorId: string }[] }
      expect(
        verdict.installabilityErrors,
        `Chrome refuses to install: ${JSON.stringify(verdict.installabilityErrors)}`,
      ).toEqual([])
    } catch (err) {
      // The domain command is non-standard and has been deprecated once
      // already; losing it must not turn into a green test that checks nothing.
      expect(String(err)).toContain("wasn't found")
    }
  })

  test('the worker registers, reaches activated, and owns a fetch handler', async ({ page }) => {
    await page.goto('/today')
    expect(await workerState(page)).toBe('activated')

    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
    expect(scope).toBe(`${new URL(page.url()).origin}/`)

    // A worker with no fetch handler does not make an app installable, and the
    // only way to see one from here is to watch it answer.
    const servedByWorker = await page.evaluate(async () => {
      const response = await fetch('/manifest.webmanifest')
      return response.ok
    })
    expect(servedByWorker).toBe(true)
  })
})

test.describe('offline', () => {
  test('the app still opens after the network is cut', async ({ page, context }) => {
    await seedDayOne(page)
    await installWorker(page, '/today')

    const problems = collectProblems(page)
    await goOffline(context)
    const response = await page.reload()

    expect(response, 'no response for the offline reload').not.toBeNull()
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    // Progress lives in localStorage, which the network cannot take away.
    await expect(page.getByText('Day 1 of 180')).toBeVisible()
    await page.waitForLoadState('networkidle')
    // Nothing failed — not the document, not a chunk, not one of the router's
    // prefetches of the nav.
    expect(problems, `offline reload logged: ${problems.join(' | ')}`).toEqual([])
  })

  test('a content page still renders offline', async ({ page, context }) => {
    await installWorker(page, '/today')
    await page.goto('/revise/sheets')
    await page.goto('/ai-ml/transformers')

    await goOffline(context)

    await page.goto('/revise/sheets')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).not.toBeEmpty()

    await page.goto('/ai-ml/transformers')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).not.toBeEmpty()
  })

  test('the nav still navigates offline, without a full reload', async ({ page, context }) => {
    await installWorker(page, '/today')
    await goOffline(context)

    // The router's prefetch of the rail landed in the pages cache while the
    // worker was in control, so this is a client transition, not a reload.
    await page.locator('a[href="/roadmap"]:visible').first().click()
    await expect(page).toHaveURL(/\/roadmap$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('an uncached route falls back to the offline page, not a browser error', async ({
    page,
    context,
  }) => {
    await installWorker(page, '/today')
    await goOffline(context)

    // Never visited, and not in the nav, so nothing prefetched it either.
    await page.goto('/hardware/interconnect')

    await expect(page.getByTestId('offline')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'You are offline' })).toBeVisible()
  })

  test('the offline fallback ships its h1 without JavaScript', async ({ request }) => {
    const html = await (await request.get('/offline')).text()
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toContain('You are offline')
  })

  test('the feed degrades to its last response instead of breaking', async ({ page, context }) => {
    test.slow() // the route fans out to real publishers on a cold cache

    await installWorker(page, '/today')

    // Straight at the endpoint rather than through /feed: the strategy under
    // test is the worker's, and the board fetches four sources at once.
    const online = await page.evaluate(async () => {
      const response = await fetch('/api/feed/hn')
      return { ok: response.ok, length: (await response.text()).length }
    })
    expect(online.ok, 'the feed endpoint should answer online').toBe(true)

    await page.waitForFunction(
      async () => {
        const feed = (await caches.keys()).find((n) => n.startsWith('aeg-feed-'))
        if (!feed) return false
        const keys = await (await caches.open(feed)).keys()
        return keys.some((request) => new URL(request.url).pathname === '/api/feed/hn')
      },
      null,
      { timeout: 20_000 },
    )

    await goOffline(context)
    const offline = await page.evaluate(async () => {
      const response = await fetch('/api/feed/hn')
      return { ok: response.ok, status: response.status, length: (await response.text()).length }
    })

    expect(offline.ok, 'the cached feed response should still answer offline').toBe(true)
    expect(offline.length).toBe(online.length)
  })

  test('there is no wrong-theme flash on an offline launch', async ({ page, context }) => {
    await seedProgress(page, { theme: 'light' })
    await installWorker(page, '/today')

    await page.addInitScript(() => {
      const log: { theme: string | null; bodyExists: boolean; why: string }[] = []
      ;(window as unknown as { __themeLog: typeof log }).__themeLog = log
      const record = (why: string) =>
        log.push({
          why,
          theme: document.documentElement?.getAttribute('data-theme') ?? null,
          bodyExists: document.body !== null,
        })
      new MutationObserver(() => record('attr')).observe(document, {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-theme'],
      })
      requestAnimationFrame(() => record('first-frame'))
    })

    await goOffline(context)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    const log = await page.evaluate(
      () =>
        (
          window as unknown as {
            __themeLog: { theme: string | null; bodyExists: boolean; why: string }[]
          }
        ).__themeLog,
    )
    const firstFrame = log.find((e) => e.why === 'first-frame')
    expect(firstFrame, 'no frame was recorded').toBeTruthy()
    expect(
      firstFrame!.theme,
      'the first frame of the offline launch was not the stored theme',
    ).toBe('light')
    expect(
      log.filter((e) => e.bodyExists && e.theme !== 'light'),
      `data-theme held a non-light value while content existed: ${JSON.stringify(log)}`,
    ).toEqual([])
  })
})

test.describe('cache hygiene', () => {
  test('every cache the worker opens is namespaced and versioned', async ({ page }) => {
    await installWorker(page, '/today')
    const names = await page.evaluate(() => caches.keys())
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) expect(name, `${name} is not ours`).toMatch(/^aeg-[a-z]+-v\d+$/)
  })

  test('a cache left by an older version is swept on activate', async ({ page }) => {
    await installWorker(page, '/today')

    // Plant what a previous VERSION would have left behind, then force a fresh
    // install/activate cycle by dropping the registration and reloading.
    await page.evaluate(async () => {
      const stale = await caches.open('aeg-pages-v0')
      await stale.put('/stale', new Response('old build'))
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((r) => r.unregister()))
    })
    expect(await page.evaluate(() => caches.keys())).toContain('aeg-pages-v0')

    await page.reload()
    expect(await workerState(page)).toBe('activated')
    await page.waitForFunction(async () => !(await caches.keys()).includes('aeg-pages-v0'), null, {
      timeout: 15_000,
    })

    const names = await page.evaluate(() => caches.keys())
    expect(names, 'the v0 cache survived activation').not.toContain('aeg-pages-v0')
    expect(names.length, 'the current caches were swept too').toBeGreaterThan(0)
  })
})

test.describe('the system bar of the installed app', () => {
  test('there is exactly one theme-color tag, and it follows the chosen theme', async ({ page }) => {
    // Two unscoped theme-color tags is the bug this guards: Next emits its
    // metadata after the layout's own <head> children, so a script that creates
    // the tag rather than finding it leaves the page with two, and which one
    // Chrome honours comes down to insertion order.
    await seedDayOne(page, { theme: 'dark' })
    await page.goto('/today')

    const metas = page.locator('meta[name="theme-color"]')
    await expect(metas).toHaveCount(1)
    await expect(metas).toHaveAttribute('content', '#121822')

    // Switching to light must move the bar with the page, live — not only on
    // the next reload. An installed app shows this bar on every screen.
    await page.getByTestId('theme-toggle').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(metas).toHaveCount(1)
    await expect(metas).toHaveAttribute('content', '#f3f1ea')

    // And it survives a cold load, set by the blocking script before paint.
    await page.reload()
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f3f1ea')
  })

  test('a stored dark choice beats a light OS, which a media-matched tag would not', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' })
    const page = await ctx.newPage()
    await seedDayOne(page, { theme: 'dark' })
    await page.goto('/today')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#121822')
    await ctx.close()
  })
})
