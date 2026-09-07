import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedDayOne } from './helpers'

const PAGE = '/ai-ml/transformers'
const QUESTION = 'How does byte-pair encoding build a vocabulary'

function questionItem(page: Page, title: string): Locator {
  return page.locator('li').filter({ hasText: title }).first()
}

function revealToggleOf(item: Locator): Locator {
  return item.getByRole('button', { name: /reveal answer|hide answer/i })
}

test.describe('AI/ML topic reveal', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('answers are hidden on load', async ({ page }) => {
    await page.goto(PAGE)
    const item = questionItem(page, QUESTION)
    await expect(revealToggleOf(item)).toHaveAttribute('aria-expanded', 'false')
    await expect(item.getByText(/BPE starts from/)).toHaveCount(0)
  })

  test('revealing one question does not reveal others, and does not check its box', async ({ page }) => {
    await page.goto(PAGE)
    const item = questionItem(page, QUESTION)
    const row = item.locator('label[data-item-id]')

    await revealToggleOf(item).click()
    await expect(revealToggleOf(item)).toHaveAttribute('aria-expanded', 'true')
    await expect(item.getByText(/BPE starts from/)).toBeVisible()
    await expect(item.getByText('Key point')).toBeVisible()

    // The checkbox for this question is untouched by revealing its answer.
    await expect(row).toHaveAttribute('data-completed', 'false')

    // Collapsing puts the answer away again.
    await revealToggleOf(item).click()
    await expect(item.getByText(/BPE starts from/)).toHaveCount(0)
  })

  test('checking a question does not reveal its answer', async ({ page }) => {
    await page.goto(PAGE)
    const item = questionItem(page, QUESTION)
    const row = item.locator('label[data-item-id]')

    await row.click()
    await expect(row).toHaveAttribute('data-completed', 'true')
    await expect(revealToggleOf(item)).toHaveAttribute('aria-expanded', 'false')
    await expect(item.getByText(/BPE starts from/)).toHaveCount(0)
  })

  test('Reveal all opens every answer on the page, Hide all closes them, neither ticks a box', async ({
    page,
  }) => {
    await page.goto(PAGE)
    const bulk = page.getByRole('button', { name: /^reveal all$/i })
    await bulk.click()
    await expect(page.getByRole('button', { name: /^hide all$/i })).toBeVisible()

    const item = questionItem(page, QUESTION)
    await expect(item.getByText(/BPE starts from/)).toBeVisible()
    await expect(item.locator('label[data-item-id]')).toHaveAttribute('data-completed', 'false')

    await page.getByRole('button', { name: /^hide all$/i }).click()
    await expect(item.getByText(/BPE starts from/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^reveal all$/i })).toBeVisible()
  })

  test('reveal state resets on reload; it does not persist like the checkbox', async ({ page }) => {
    await page.goto(PAGE)
    const item = questionItem(page, QUESTION)
    await revealToggleOf(item).click()
    await expect(item.getByText(/BPE starts from/)).toBeVisible()

    await page.reload()
    const reloaded = questionItem(page, QUESTION)
    await expect(revealToggleOf(reloaded)).toHaveAttribute('aria-expanded', 'false')
    await expect(reloaded.getByText(/BPE starts from/)).toHaveCount(0)
  })

  test('no horizontal overflow at 390px with a long answer revealed, in both themes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/ai-ml/inference')
    await page.getByRole('button', { name: /^reveal all$/i }).click()

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t)
      }, theme)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth, `${theme} theme should not overflow horizontally`).toBeLessThanOrEqual(clientWidth)
    }
  })
})
