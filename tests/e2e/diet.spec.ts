import { expect, test } from '@playwright/test'

/**
 * The Diet app's public surface, and the line around its private one.
 *
 * Everything with data in it needs a session, so what a browser can be driven
 * through without one is the landing page and the gate. That is exactly the
 * pair worth pinning: `/diet` is a permanent tab and must never bounce to a
 * login form, and everything under it must never render without one. Both
 * failures are silent — a tab that suddenly demands a login, and a screen that
 * suddenly does not.
 *
 * The behaviour behind the gate is covered by the unit tests over the same
 * components (`tests/unit/diet/ui-honesty.test.tsx`) and by the arithmetic
 * suite under `tests/unit/diet`.
 */

const SECTIONS = ['/diet/log', '/diet/weight', '/diet/trends', '/diet/setup']

test.describe('the Diet landing page is public', () => {
  test('renders its own heading and every section shortcut', async ({ page }) => {
    const response = await page.goto('/diet')
    expect(response?.status()).toBe(200)
    expect(page.url(), '/diet is a permanent tab and must render').not.toContain('/sign-in')

    await expect(page.getByRole('heading', { level: 1, name: 'Diet' })).toBeVisible()
    for (const href of SECTIONS) {
      await expect(page.locator(`main a[href="${href}"]`)).toBeVisible()
    }
  })

  test('ships its heading in server HTML, before any JavaScript runs', async ({ request }) => {
    const html = await (await request.get('/diet')).text()
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toContain('Diet')
  })

  test('says how to get in when nobody is signed in', async ({ page }) => {
    await page.goto('/diet')
    const note = page.getByTestId('diet-signed-out-note')
    await expect(note).toBeVisible()
    await expect(note.getByRole('link', { name: 'Sign in' })).toBeVisible()
  })

  test('states the honesty rules rather than only implementing them', async ({ page }) => {
    await page.goto('/diet')
    await expect(page.getByText('A day you did not log is invisible, not zero')).toBeVisible()
    await expect(page.getByText('A meal outside your window is marked, never blocked')).toBeVisible()
    await expect(page.getByText('A range when the data is thin, and it says so')).toBeVisible()
  })

  test('does not scroll sideways', async ({ page }) => {
    await page.goto('/diet')
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  })
})

test.describe('everything inside Diet needs a session', () => {
  for (const href of SECTIONS) {
    test(`${href} sends a signed-out visitor to sign-in, carrying the destination`, async ({
      page,
    }) => {
      await page.goto(href)
      // A plain substring rather than a regex: the expected value is
      // percent-encoded, and escaping that for a regex is one more thing to get
      // subtly wrong in a test whose whole job is to be unambiguous.
      expect(page.url()).toContain(`/sign-in?next=${encodeURIComponent(href)}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
    })
  }

  test('the food lookup is not an open proxy to Open Food Facts', async ({ request }) => {
    // Without this check the route would fetch a third party on behalf of
    // anyone who found the URL. The proxy redirects it; the handler answers 401
    // if it ever stops.
    const response = await request.get('/diet/api/foods?q=peanut', { maxRedirects: 0 })
    expect([307, 308, 302, 401]).toContain(response.status())
    expect(response.status()).not.toBe(200)
  })
})
