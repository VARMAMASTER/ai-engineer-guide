import { expect, test } from '@playwright/test'
import { relativeLuminance, sampleAverageColor, seedDayOne, seedProgress } from './helpers'

const BAD_SLUGS = [
  '/dsa/not-a-pattern',
  '/system-design/not-a-pattern',
  '/ai-ml/not-a-topic',
  '/projects/not-a-project',
]

test.describe('unknown routes', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  for (const url of BAD_SLUGS) {
    test(`${url} renders the not-found page instead of crashing`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))

      const response = await page.goto(url)
      expect(response!.status()).toBe(404)

      await expect(page.getByTestId('not-found')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
      expect(errors, `${url} threw: ${errors.join(' | ')}`).toEqual([])
    })
  }

  test('the not-found page keeps the shell and offers a way back', async ({ page }, testInfo) => {
    await page.goto(BAD_SLUGS[0])

    const nav = page.getByTestId(testInfo.project.name === 'mobile' ? 'bottom-nav' : 'side-nav')
    await expect(nav).toBeVisible()

    await page.getByRole('link', { name: 'Back to Today' }).click()
    await page.waitForURL('**/today')
    await expect(page.getByRole('heading', { level: 1, name: /Day \d+ of 180/ })).toBeVisible()
  })

  test('an unknown route does not repaint the app in the wrong theme', async ({ page }) => {
    // Next.js's built-in 404 ships an inline `body{color:#000;background:#fff}`
    // rule, which wins over the Ground token and turns the whole shell white in
    // dark mode. Owning `app/not-found.tsx` is what stops that, so the pixels
    // are what this asserts.
    await seedProgress(page, { theme: 'dark', startDate: null })
    await page.goto(BAD_SLUGS[0])
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    const ground = await sampleAverageColor(page, { x: 2, y: 300, width: 6, height: 6 })
    expect(
      relativeLuminance(ground),
      `the 404 page painted rgb(${ground.join(', ')}) in dark mode`,
    ).toBeLessThan(0.25)
  })

  test('a deep unknown path under a known section still 404s cleanly', async ({ page }) => {
    const response = await page.goto('/dsa/arrays-hashing/extra')
    expect(response!.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })
})
