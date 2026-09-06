import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'
import { ALL_ROUTES, DYNAMIC_ROUTES, STATIC_ROUTES, seedDayOne, todayIso } from './helpers'

/**
 * Coverage sweep: every URL the app serves, walked as a real document load.
 *
 * `/` is a redirect, so its final response is `/today`'s. Everything else must
 * answer 200, paint exactly one visible `h1`, and log nothing to the console.
 */

function collectProblems(page: Page): { errors: string[] } {
  const errors: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('requestfailed', (req) => {
    // Aborted feed polling on teardown is not a page defect; a failed document
    // or asset request is.
    const url = req.url()
    if (url.includes('/api/feed/')) return
    errors.push(`requestfailed: ${url} — ${req.failure()?.errorText ?? 'unknown'}`)
  })
  return { errors }
}

test.describe('every route loads', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  for (const route of ALL_ROUTES) {
    test(`${route} answers 200 with a visible h1 and a clean console`, async ({ page }) => {
      const { errors } = collectProblems(page)

      const response = await page.goto(route, { waitUntil: 'networkidle' })
      expect(response, `no response for ${route}`).not.toBeNull()
      expect(response!.status(), `${route} should answer 200`).toBe(200)

      const h1 = page.locator('h1')
      await expect(h1).toHaveCount(1)
      await expect(h1).toBeVisible()
      await expect(h1).not.toBeEmpty()

      expect(errors, `${route} logged: ${errors.join(' | ')}`).toEqual([])
    })
  }

  test('/ lands on Today', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/today$/)
  })

  test('the 13 walked URLs are the 9 static routes plus one of each dynamic segment', () => {
    expect(STATIC_ROUTES).toHaveLength(9)
    expect(DYNAMIC_ROUTES).toHaveLength(4)
    expect(ALL_ROUTES).toHaveLength(13)
  })

  test('no route scrolls horizontally at the desktop width either', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the 390px sweep lives in responsive.spec.ts')

    for (const route of ALL_ROUTES) {
      await page.goto(route)
      const overflow = await page.evaluate(() => {
        const el = document.documentElement
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
      })
      expect(
        overflow.scrollWidth,
        `${route} overflows horizontally at ${testInfo.project.use.viewport?.width}px`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1)
    }
  })

  test('each page carries its own title', async ({ page }) => {
    const seen = new Set<string>()
    for (const route of ALL_ROUTES.filter((r) => r !== '/')) {
      await page.goto(route)
      const title = await page.title()
      expect(title, `${route} has no title`).toContain('AI Engineer Practice Guide')
      seen.add(title)
    }
    expect(seen.size, 'every route should have a distinct title').toBe(12)
  })

  test('the seeded day is the one Today renders', async ({ page }) => {
    await page.goto('/today')
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    await expect(page.getByText('Day 1 of 180')).toBeVisible()
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('every route ships a real h1 in its server HTML, before any JavaScript runs', async ({
    request,
  }) => {
    // The gap this closes: every check above drives a hydrated page — Playwright
    // always waits for the client to take over before it looks at the DOM. That
    // is exactly the view a crawler, a screen reader on a slow connection, or a
    // visitor whose JS failed to load never gets. Fetching the route directly
    // (no browser, no script execution) inspects the same bytes those visitors
    // are stuck with, which is the only way to catch a page that ships a real
    // heading only after hydration completes.
    for (const route of ALL_ROUTES) {
      const response = await request.get(route)
      expect(response.status(), `${route} should answer 200`).toBe(200)
      const html = await response.text()
      expect(html, `${route} should ship an <h1> in its initial HTML`).toMatch(/<h1[\s>]/)
    }
  })
})
