import { expect, test, type Page } from '@playwright/test'
import { DAY_1, seedDayOne } from './helpers'

const TOTAL_PROBLEMS = 150
const CORE_PROBLEMS = 75
const ARRAYS_HASHING_COUNT = 9

/** The "N problems" summary line above the grid. */
async function filteredTotal(page: Page): Promise<number> {
  const text = await page.locator('p.readout', { hasText: /problems$/ }).first().innerText()
  return Number(text.match(/\d+/)![0])
}

/** The per-card counts, which must always add up to the summary line. */
async function cardTotal(page: Page): Promise<number> {
  const counts = await page
    .locator('a[href^="/dsa/"] p')
    .evaluateAll((els) =>
      els.map((el) => Number((el.textContent ?? '').match(/(\d+)\s*problems/)?.[1] ?? 0)),
    )
  return counts.reduce((a, b) => a + b, 0)
}

test.describe('DSA index filters', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
    await page.goto('/dsa')
  })

  test('All shows the full bank and the cards add up to it', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(await filteredTotal(page)).toBe(TOTAL_PROBLEMS)
    expect(await cardTotal(page)).toBe(TOTAL_PROBLEMS)
    await expect(page.locator('a[href^="/dsa/"]')).toHaveCount(18)
  })

  test('Core narrows to Blind 75', async ({ page }) => {
    await page.getByRole('button', { name: 'Core (Blind 75)' }).click()
    await expect(page.getByRole('button', { name: 'Core (Blind 75)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')

    expect(await filteredTotal(page)).toBe(CORE_PROBLEMS)
    expect(await cardTotal(page)).toBe(CORE_PROBLEMS)
  })

  test('each company chip changes the visible count', async ({ page }) => {
    const seen = new Map<string, number>()

    for (const company of ['Google', 'Meta', 'Amazon']) {
      await page.getByRole('button', { name: company, exact: true }).click()
      await expect(page.getByRole('button', { name: company, exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      )

      const total = await filteredTotal(page)
      expect(total, `${company} should tag at least one problem`).toBeGreaterThan(0)
      expect(total, `${company} should not tag the whole bank`).toBeLessThan(TOTAL_PROBLEMS)
      expect(await cardTotal(page), `${company} cards should sum to the header`).toBe(total)
      seen.set(company, total)
    }

    // Back to All restores the full bank.
    await page.getByRole('button', { name: 'All' }).click()
    expect(await filteredTotal(page)).toBe(TOTAL_PROBLEMS)

    expect(seen.size).toBe(3)
  })
})

test.describe('DSA pattern page', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
    await page.goto(DAY_1.patternPage)
  })

  test('shows signals, a template, pitfalls and the right problem count', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Arrays & Hashing' })).toBeVisible()

    const signals = page.locator('section', { hasText: 'Reach for this when' }).first()
    await expect(signals.locator('li').first()).toBeVisible()
    expect(await signals.locator('li').count()).toBeGreaterThan(0)

    const template = page.locator('pre.code-block')
    await expect(template).toBeVisible()
    await expect(template).not.toBeEmpty();

    const pitfalls = page.locator('section', { hasText: 'Pitfalls' }).last()
    expect(await pitfalls.locator('li').count()).toBeGreaterThan(0)

    await expect(page.locator('label[data-item-id^="dsa-"]')).toHaveCount(ARRAYS_HASHING_COUNT)
  })

  test('the LeetCode link points at the URL in the data', async ({ page }) => {
    const row = page.locator('li', { has: page.locator(`label[data-item-id="${DAY_1.firstProblemId}"]`) })
    const link = row.getByRole('link', { name: /^LC 217$/ })
    await expect(link).toHaveAttribute('href', DAY_1.firstProblemUrl)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noreferrer/)
  })

  test('every problem row is individually checkable and individually named', async ({ page }) => {
    const rows = page.locator('label[data-item-id^="dsa-"]')
    const names = await rows
      .locator('input[type="checkbox"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))

    expect(new Set(names).size, 'each checkbox needs its own accessible name').toBe(
      ARRAYS_HASHING_COUNT,
    )
    expect(names.every((n) => n && n.length > 0)).toBe(true)

    await rows.nth(2).click()
    await expect(rows.nth(2)).toHaveAttribute('data-completed', 'true')
    await expect(rows.nth(0)).toHaveAttribute('data-completed', 'false')
    await expect(rows.nth(3)).toHaveAttribute('data-completed', 'false')
  })

  test('difficulty and core badges render', async ({ page }) => {
    const row = page.locator('li', { has: page.locator(`label[data-item-id="${DAY_1.firstProblemId}"]`) })
    await expect(row.getByText('easy')).toBeVisible()
    await expect(row.getByText('Core', { exact: true })).toBeVisible()
  })
})
