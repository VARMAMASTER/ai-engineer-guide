import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedDayOne } from './helpers'

const GENERAL_PAGE = '/system-design/caching'
const GENERAL_QUESTION = 'Design a distributed cache'
const ML_PAGE = '/system-design/rag-systems'
const ML_QUESTION = 'Design a semantic search engine over podcast transcripts'

const SHARED_STEPS = ['Define the problem', 'Wrap up']
const GENERAL_ONLY = ['Data model', 'Core components', 'Scale and consistency', 'Deploy and operate']
const ML_ONLY = ['Data pipeline', 'Model architecture', 'Train and evaluate', 'Deploy and monitor']

function questionItem(page: Page, title: string): Locator {
  return page.locator('li.panel').filter({ hasText: title })
}

function toggleOf(item: Locator): Locator {
  return item.getByRole('button').first()
}

test.describe('system design framework', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('a collapsed question hides its steps', async ({ page }) => {
    await page.goto(GENERAL_PAGE)
    const item = questionItem(page, GENERAL_QUESTION)
    await expect(toggleOf(item)).toHaveAttribute('aria-expanded', 'false')

    for (const step of [...SHARED_STEPS, ...GENERAL_ONLY]) {
      await expect(item.getByRole('heading', { name: step, exact: true })).toHaveCount(0)
    }
  })

  test('expanding a general question reveals all six steps', async ({ page }) => {
    await page.goto(GENERAL_PAGE)
    const item = questionItem(page, GENERAL_QUESTION)

    await toggleOf(item).click()
    await expect(toggleOf(item)).toHaveAttribute('aria-expanded', 'true')

    for (const step of [...SHARED_STEPS, ...GENERAL_ONLY]) {
      await expect(item.getByRole('heading', { name: step, exact: true })).toBeVisible()
    }
    // Each step carries its prompts, not just a bare heading.
    expect(await item.locator('li').count()).toBeGreaterThanOrEqual(6)

    // Collapsing puts them away again.
    await toggleOf(item).click()
    await expect(item.getByRole('heading', { name: 'Data model', exact: true })).toHaveCount(0)
  })

  test('an ML question shows the ML wording, and only the ML wording', async ({ page }) => {
    await page.goto(ML_PAGE)
    const item = questionItem(page, ML_QUESTION)

    await toggleOf(item).click()
    for (const step of [...SHARED_STEPS, ...ML_ONLY]) {
      await expect(item.getByRole('heading', { name: step, exact: true })).toBeVisible()
    }
    for (const step of GENERAL_ONLY) {
      await expect(item.getByRole('heading', { name: step, exact: true })).toHaveCount(0)
    }
  })

  test('the two groups genuinely use different step headings', async ({ page }) => {
    await page.goto(GENERAL_PAGE)
    const general = questionItem(page, GENERAL_QUESTION)
    await toggleOf(general).click()
    for (const step of ML_ONLY) {
      await expect(general.getByRole('heading', { name: step, exact: true })).toHaveCount(0)
    }

    // The four middle steps are named differently on each side; only the first
    // and last are shared. That asymmetry is the point of the assertion.
    expect(GENERAL_ONLY.filter((s) => ML_ONLY.includes(s))).toEqual([])
  })

  test('the index groups patterns into General and ML/LLM', async ({ page }) => {
    await page.goto('/system-design')
    await expect(page.getByRole('heading', { level: 1, name: 'System Design' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /General/ }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /ML/ }).first()).toBeVisible()
    await expect(page.locator('a[href^="/system-design/"]')).toHaveCount(20)
  })

  test('a question checkbox is independent of the expansion state', async ({ page }) => {
    await page.goto(GENERAL_PAGE)
    const item = questionItem(page, GENERAL_QUESTION)
    const row = item.locator('label[data-item-id]')

    await expect(row).toHaveAttribute('data-completed', 'false')
    await row.click()
    await expect(row).toHaveAttribute('data-completed', 'true')

    await toggleOf(item).click()
    await expect(row).toHaveAttribute('data-completed', 'true')

    await page.reload()
    await expect(questionItem(page, GENERAL_QUESTION).locator('label[data-item-id]')).toHaveAttribute(
      'data-completed',
      'true',
    )
  })
})
