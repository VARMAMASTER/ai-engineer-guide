import { expect, test } from '@playwright/test'
import { seedDayOne } from './helpers'

/**
 * The brief's surface, in a real browser.
 *
 * The agent is the only feature that reads across every mini-app, and it lives
 * on Today rather than behind a tab of its own (spec 5.4). The risk that buys
 * is that Today is also the front page of the half of this app that works with
 * no account at all — so what is asserted here is mostly what the brief must
 * NOT do to a page it shares.
 */

test.describe('the brief on Today', () => {
  test('is invisible signed out, and takes nothing away from the page', async ({ page }) => {
    // The learning half is usable without an account and must stay that way.
    // Not "shows a sign-in prompt" — shows nothing.
    await seedDayOne(page)
    await page.goto('/today')
    await expect(page.getByTestId('agent-brief')).toHaveCount(0)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('leaves the day\'s tasks reachable without JavaScript', async ({ browser }) => {
    // The brief is client-only by design — it needs a session and a local date,
    // neither of which the static page has. It must therefore add nothing to
    // the server HTML that a JS-less visitor would see as a hole.
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    const response = await page.goto('/today')
    expect(response?.status()).toBe(200)
    const html = await page.content()
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).not.toContain('agent-brief')
    await context.close()
  })

  test('the API refuses anonymous callers rather than spending anything', async ({ request }) => {
    // The only route in this app that costs money. It must be shut before it
    // is cheap: signup is open, and the budget is the owner's.
    const post = await request.post('/api/agent/brief', { data: { date: '2026-09-14' } })
    expect(post.status()).toBe(401)

    const get = await request.get('/api/agent/brief')
    expect(get.status()).toBe(401)

    const patch = await request.patch('/api/agent/proposals', {
      data: { id: 'x', state: 'accepted' },
    })
    expect(patch.status()).toBe(401)
  })

  test('never lets a brief be cached by anything in front of it', async ({ request }) => {
    const response = await request.get('/api/agent/brief')
    expect(response.headers()['cache-control']).toContain('no-store')
  })
})
