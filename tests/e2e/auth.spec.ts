import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { LEARN_SECTIONS } from '../../lib/nav'
import { seedDayOne } from './helpers'

/**
 * The public/private split, walked as a real browser.
 *
 * The two failures worth catching here are opposites, and both are silent:
 * a learning route that starts demanding a session (the half of the app that
 * is supposed to be shareable stops being shareable), and an account route
 * that stops demanding one.
 */

test.describe('the learning half stays login-free', () => {
  test('every study section still renders signed out', async ({ page }) => {
    await seedDayOne(page)
    for (const section of LEARN_SECTIONS) {
      const response = await page.goto(section.href)
      expect(response?.status(), `${section.href} should answer 200`).toBe(200)
      expect(page.url(), `${section.href} must not bounce to sign-in`).not.toContain('/sign-in')
      await expect(page.locator('h1')).toBeVisible()
    }
  })

  test('a signed-out study page is still cacheable — no session headers on it', async ({
    request,
  }) => {
    // The proxy short-circuits when there is no auth cookie, precisely so the
    // learning half keeps the caching and offline behaviour it had before
    // accounts existed. A `Set-Cookie` or a `no-store` here would mean every
    // study page had quietly become uncacheable for everyone.
    const response = await request.get('/dsa')
    expect(response.status()).toBe(200)
    expect(response.headers()['set-cookie']).toBeUndefined()
    expect(response.headers()['cache-control'] ?? '').not.toContain('no-store')
  })

  test('the mini-app landing pages are public gates, not redirects', async ({ page }) => {
    for (const href of ['/diet', '/train', '/ops']) {
      const response = await page.goto(href)
      expect(response?.status(), `${href} should answer 200`).toBe(200)
      expect(page.url(), `${href} is a permanent tab and must render`).not.toContain('/sign-in')
      await expect(page.locator('h1')).toBeVisible()
    }
  })
})

test.describe('the private half is gated', () => {
  test('the account page sends a signed-out visitor to sign-in, carrying the destination', async ({
    page,
  }) => {
    await page.goto('/account')
    await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount/)
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  })

  test('everything inside a mini-app is gated', async ({ page }) => {
    for (const href of ['/diet/log', '/train/session', '/ops/todos']) {
      await page.goto(href)
      await expect(page, `${href} must require a session`).toHaveURL(/\/sign-in\?next=/)
    }
  })

  test('the export endpoint refuses an anonymous request', async ({ request }) => {
    const response = await request.get('/api/account/export', { maxRedirects: 0 })
    // Either the proxy redirects it or the handler answers 401 — never 200.
    expect([307, 308, 302, 401]).toContain(response.status())
    expect(response.status()).not.toBe(200)
  })
})

test.describe('the sign-in page', () => {
  test('ships its heading and both fields in server HTML, before any JavaScript', async ({
    request,
  }) => {
    const html = await (await request.get('/sign-in')).text()
    expect(html).toMatch(/<h1[\s>]/)
    expect(html).toContain('name="email"')
    expect(html).toContain('name="password"')
  })

  test('reports a refused sign-in instead of silently doing nothing', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill('nobody@example.invalid')
    await page.getByLabel('Password').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // The message differs between a configured deployment ("Invalid login
    // credentials") and one with no Supabase env, so this asserts the contract
    // that matters: the user is told, and is not left on a dead form.
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('offers the way to the other form', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('link', { name: 'Create one' }).click()
    await expect(page).toHaveURL(/\/sign-up$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create an account')
  })

  test('axe is clean on the form', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.locator('h1')).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    expect(bad.map((v) => v.id)).toEqual([])
  })
})

test('Settings offers a way into an account without hiding the local-only path', async ({
  page,
}) => {
  await seedDayOne(page)
  await page.goto('/settings')
  const link = page.getByTestId('sign-in-link')
  await expect(link).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(/\/sign-in$/)
})
