import { expect, test } from '@playwright/test'
import { OPS_SECTIONS } from '../../app/ops/sections'

/**
 * The Ops app's public surface, walked as a real browser.
 *
 * Only the landing page is reachable without a session, so that is what these
 * assert: that `/ops` keeps the promise the tab bar makes, that it names its
 * four sections and links to each of them, and that every one of those links is
 * gated — carrying the destination, so signing in lands you where you were
 * going rather than on the account page.
 *
 * The interiors are not walked here. They need an account, and a signed-out
 * sweep of them would assert the redirect twice instead of testing a page; the
 * sections' own logic is covered by `tests/unit/ops/**` and by `lib/ops/**`'s
 * own suite, both of which run without a database.
 */

test.describe('the Ops landing page', () => {
  test('renders signed out, with its own h1', async ({ page }) => {
    const response = await page.goto('/ops')
    expect(response?.status()).toBe(200)
    expect(page.url(), '/ops is a permanent tab and must not bounce').not.toContain('/sign-in')
    await expect(page.getByRole('heading', { level: 1, name: 'Ops' })).toBeVisible()
  })

  test('ships that h1 in its server HTML, before any JavaScript runs', async ({ request }) => {
    const response = await request.get('/ops')
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('<h1>Ops</h1>')
  })

  test('names every section and links to it', async ({ page }) => {
    await page.goto('/ops')
    for (const section of OPS_SECTIONS) {
      const link = page.locator(`a[href="${section.href}"]`)
      await expect(link, `${section.href} should be linked from /ops`).toHaveCount(1)
      await expect(link).toContainText(section.label)
    }
  })

  test('holds nothing personal, so it stays cacheable', async ({ request }) => {
    // The landing page deliberately reads no session: the service worker may
    // keep serving it after a sign-out, and a personalised copy would show the
    // next person a trace of the last one.
    const response = await request.get('/ops')
    expect(response.headers()['set-cookie']).toBeUndefined()
    expect(response.headers()['cache-control'] ?? '').not.toContain('no-store')
  })

  test('does not scroll sideways at 390px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'this is the phone-width check')
    await page.goto('/ops')
    const box = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }))
    expect(box.scroll).toBeLessThanOrEqual(box.client + 1)
  })
})

test.describe('everything inside Ops is gated', () => {
  for (const section of OPS_SECTIONS) {
    test(`${section.href} sends a signed-out visitor to sign-in, carrying the destination`, async ({
      page,
    }) => {
      await page.goto(section.href)
      expect(page.url()).toContain('/sign-in')
      expect(page.url()).toContain(`next=${encodeURIComponent(section.href)}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
    })
  }
})
