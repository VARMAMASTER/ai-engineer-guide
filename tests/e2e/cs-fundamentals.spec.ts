import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedDayOne } from './helpers'

const INDEX = '/cs-fundamentals'
const TOPIC = '/cs-fundamentals/networking'
/** TCP versus UDP: the first networking question, tagged for both loops. */
const QUESTION_ID = 'csq-tcp-vs-udp'
/** A phrase from that question's answer — not on the page until it is revealed. */
const ANSWER_PHRASE = /TCP is connection-oriented/

/**
 * The list item for one question, anchored on its checkbox's item id rather
 * than on prose — question text is long and several answers quote each other,
 * so a text filter would match the wrong row once everything is revealed.
 */
function questionItem(page: Page, id: string): Locator {
  return page.locator('li').filter({ has: page.locator(`label[data-item-id="${id}"]`) })
}

function revealToggleOf(item: Locator): Locator {
  return item.getByRole('button', { name: /reveal answer|hide answer/i })
}

function topicMeter(page: Page, slug: string): Locator {
  return page
    .locator(`a[href="/cs-fundamentals/${slug}"]`)
    .getByRole('progressbar', { name: 'Questions' })
}

test.describe('CS fundamentals index', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('lists the five topics, each linking to its question set', async ({ page }) => {
    await page.goto(INDEX)
    await expect(page.getByRole('heading', { level: 1, name: 'CS Fundamentals' })).toBeVisible()

    for (const slug of ['os', 'networking', 'databases', 'concurrency', 'oop']) {
      await expect(page.locator(`a[href="/cs-fundamentals/${slug}"]`)).toBeVisible()
    }
    await expect(page.getByRole('progressbar', { name: 'Questions' })).toHaveCount(5)
    // 70 questions across the five topics.
    const totals = await page
      .getByRole('progressbar', { name: 'Questions' })
      .evaluateAll((bars) =>
        bars.reduce((n, b) => n + Number(b.getAttribute('aria-valuemax')), 0),
      )
    expect(totals).toBe(70)
  })

  test('a question checked on a topic page counts on its own index meter only', async ({
    page,
  }) => {
    await page.goto(TOPIC)
    const row = questionItem(page, QUESTION_ID).locator('label[data-item-id]')
    await row.click()
    await expect(row).toHaveAttribute('data-completed', 'true')

    await page.goto(INDEX)
    await expect(topicMeter(page, 'networking')).toHaveAttribute('aria-valuenow', '1')
    await expect(topicMeter(page, 'os')).toHaveAttribute('aria-valuenow', '0')
  })

  test('an unknown topic slug is a 404, not a blank page', async ({ page }) => {
    const response = await page.goto('/cs-fundamentals/not-a-topic')
    expect(response?.status()).toBe(404)
  })
})

test.describe('CS fundamentals topic reveal', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('answers are hidden on load', async ({ page }) => {
    await page.goto(TOPIC)
    await expect(page.getByRole('heading', { level: 1, name: 'Networking' })).toBeVisible()
    const item = questionItem(page, QUESTION_ID)
    await expect(revealToggleOf(item)).toHaveAttribute('aria-expanded', 'false')
    await expect(item.getByText(ANSWER_PHRASE)).toHaveCount(0)
    await expect(page.getByText('Key point')).toHaveCount(0)
  })

  test('revealing one question does not reveal others, and does not check its box', async ({
    page,
  }) => {
    await page.goto(TOPIC)
    const item = questionItem(page, QUESTION_ID)
    const row = item.locator('label[data-item-id]')

    await revealToggleOf(item).click()
    await expect(revealToggleOf(item)).toHaveAttribute('aria-expanded', 'true')
    await expect(item.getByText(ANSWER_PHRASE)).toBeVisible()
    await expect(item.getByText('Key point')).toBeVisible()
    // Exactly one answer is open: the reveal is per question, not per page.
    await expect(page.getByText('Key point')).toHaveCount(1)
    await expect(row).toHaveAttribute('data-completed', 'false')

    await revealToggleOf(item).click()
    await expect(item.getByText(ANSWER_PHRASE)).toHaveCount(0)
  })

  test('checking a question does not reveal its answer', async ({ page }) => {
    await page.goto(TOPIC)
    const item = questionItem(page, QUESTION_ID)
    const row = item.locator('label[data-item-id]')

    await row.click()
    await expect(row).toHaveAttribute('data-completed', 'true')
    await expect(revealToggleOf(item)).toHaveAttribute('aria-expanded', 'false')
    await expect(item.getByText(ANSWER_PHRASE)).toHaveCount(0)
  })

  test('Reveal all opens every answer, Hide all closes them, neither ticks a box', async ({
    page,
  }) => {
    await page.goto(TOPIC)
    await page.getByRole('button', { name: /^reveal all$/i }).click()
    await expect(page.getByRole('button', { name: /^hide all$/i })).toBeVisible()

    const item = questionItem(page, QUESTION_ID)
    await expect(item.getByText(ANSWER_PHRASE)).toBeVisible()
    await expect(item.locator('label[data-item-id]')).toHaveAttribute('data-completed', 'false')

    await page.getByRole('button', { name: /^hide all$/i }).click()
    await expect(item.getByText(ANSWER_PHRASE)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^reveal all$/i })).toBeVisible()
  })

  test('reveal state resets on reload; it does not persist like the checkbox', async ({ page }) => {
    await page.goto(TOPIC)
    const item = questionItem(page, QUESTION_ID)
    await revealToggleOf(item).click()
    await expect(item.getByText(ANSWER_PHRASE)).toBeVisible()

    await page.reload()
    const reloaded = questionItem(page, QUESTION_ID)
    await expect(revealToggleOf(reloaded)).toHaveAttribute('aria-expanded', 'false')
    await expect(reloaded.getByText(ANSWER_PHRASE)).toHaveCount(0)
  })

  test('a company tag shows only where the question carries one', async ({ page }) => {
    await page.goto(TOPIC)
    const tagged = questionItem(page, QUESTION_ID)
    await expect(tagged.getByText('Amazon')).toBeVisible()
    await expect(tagged.getByText('Meta')).toBeVisible()
    // Nothing under a CS question claims Google — no question in the bank is
    // tagged for it, and an untagged question shows no tag row at all.
    await expect(page.getByText('Google', { exact: true })).toHaveCount(0)
  })

  test('no horizontal overflow at 390px with every answer revealed, in both themes', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(TOPIC)
    await page.getByRole('button', { name: /^reveal all$/i }).click()

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t)
      }, theme)
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(
        overflow.scrollWidth,
        `${theme} theme should not overflow horizontally`,
      ).toBeLessThanOrEqual(overflow.clientWidth)
    }
  })
})
