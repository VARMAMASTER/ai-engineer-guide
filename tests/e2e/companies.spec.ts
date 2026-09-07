import { expect, test } from '@playwright/test'
import { seedDayOne } from './helpers'

const ORDER = ['Amazon', 'Microsoft', 'Google', 'Meta', 'OpenAI', 'Anthropic']

test.describe('companies', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('the index lists all six, ranked by how realistic each loop is', async ({ page }) => {
    await page.goto('/companies')
    await expect(page.getByRole('heading', { level: 1, name: 'Companies' })).toBeVisible()

    const cards = page.locator('a[href^="/companies/"]')
    await expect(cards).toHaveCount(6)
    for (const [i, name] of ORDER.entries()) {
      await expect(cards.nth(i)).toContainText(name)
      await expect(cards.nth(i)).toContainText(`#${i + 1}`)
    }
  })

  test('a card opens its loop guide', async ({ page }) => {
    await page.goto('/companies')
    await page.locator('a[href="/companies/amazon"]').click()
    await page.waitForURL('**/companies/amazon')
    await expect(page.getByRole('heading', { level: 1, name: 'Amazon' })).toBeVisible()
  })

  test('the detail page carries the level, the rounds table and the market note', async ({
    page,
  }) => {
    await page.goto('/companies/amazon')
    await expect(page.getByText('Realistic level')).toBeVisible()
    await expect(page.getByRole('rowheader', { name: 'Bar Raiser' })).toBeVisible()
    await expect(page.getByText('Where this loop is lost')).toBeVisible()
    await expect(page.getByTestId('market-note')).toBeVisible()
  })

  /**
   * The drill list is only worth reading if it is one tap from the thing it
   * tells you to drill. These links are generated from ids embedded in prose,
   * so a wrong route map would produce a page full of 404s that no unit test
   * over rendered markup would notice.
   */
  test('a drill link lands on a real page', async ({ page }) => {
    await page.goto('/companies/google')
    const link = page.locator('a[title^="dsap-"]').first()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^\/dsa\//)

    const response = await page.goto(href!)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('an unknown company 404s rather than rendering an empty guide', async ({ page }) => {
    const response = await page.goto('/companies/netflix')
    expect(response?.status()).toBe(404)
  })
})
