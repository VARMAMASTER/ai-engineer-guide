import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedDayOne } from './helpers'

const INDEX = '/hardware'
const TOPIC = '/hardware/memory-hierarchy'

/** A question whose `numbers` is populated, and the figure it should surface. */
const WITH_NUMBERS = {
  text: 'Walk me down the GPU memory hierarchy',
  figure: 'H100 SXM5: 80 GB HBM3 at 3.35 TB/s',
  answerFragment: /Registers are per-thread and fastest/,
}

/** A question in the same topic with no `numbers` at all. */
const NO_NUMBERS = {
  text: 'Two kernels read the same amount of data from HBM',
  answerFragment: /Access pattern\. HBM is read in wide transactions/,
}

function questionItem(page: Page, text: string): Locator {
  return page.locator('li').filter({ hasText: text }).first()
}

function revealToggleOf(item: Locator): Locator {
  return item.getByRole('button', { name: /reveal answer|hide answer/i })
}

test.describe('GPU/hardware index', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('lists all seven topics, each with a question meter', async ({ page }) => {
    await page.goto(INDEX)
    await expect(page.getByRole('heading', { level: 1, name: 'GPU / Hardware' })).toBeVisible()

    const cards = page.locator('a[href^="/hardware/"]')
    await expect(cards).toHaveCount(7)
    await expect(page.getByRole('progressbar', { name: 'Questions' })).toHaveCount(7)
  })

  test('a card opens its topic page', async ({ page }) => {
    await page.goto(INDEX)
    await page.locator('a[href="/hardware/memory-hierarchy"]').click()
    await page.waitForURL('**/hardware/memory-hierarchy')
    await expect(page.getByRole('heading', { level: 1, name: 'Memory Hierarchy' })).toBeVisible()
  })

  test('an unknown topic slug is a 404, not a blank page', async ({ page }) => {
    const response = await page.goto('/hardware/not-a-real-topic')
    expect(response?.status()).toBe(404)
  })
})

test.describe('GPU/hardware topic reveal', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('answers and cited figures are both hidden on load', async ({ page }) => {
    await page.goto(TOPIC)
    const item = questionItem(page, WITH_NUMBERS.text)
    await expect(revealToggleOf(item)).toHaveAttribute('aria-expanded', 'false')
    await expect(item.getByText(WITH_NUMBERS.answerFragment)).toHaveCount(0)
    // The figure is often the whole answer, so it must not leak past the reveal.
    await expect(page.getByTestId('hw-numbers')).toHaveCount(0)
    await expect(page.getByText(WITH_NUMBERS.figure)).toHaveCount(0)
  })

  test('revealing shows the figures in their own block, above the prose', async ({ page }) => {
    await page.goto(TOPIC)
    const item = questionItem(page, WITH_NUMBERS.text)
    await revealToggleOf(item).click()

    const numbers = item.getByTestId('hw-numbers')
    await expect(numbers).toBeVisible()
    await expect(numbers.getByText(WITH_NUMBERS.figure)).toBeVisible()
    await expect(numbers.getByText('Numbers to cite')).toBeVisible()

    // Scannable first: the figures sit above the answer paragraph, and the
    // paragraph is not inside the figures block.
    const prose = item.getByText(WITH_NUMBERS.answerFragment)
    await expect(prose).toBeVisible()
    const numbersBox = await numbers.boundingBox()
    const proseBox = await prose.boundingBox()
    expect(numbersBox!.y + numbersBox!.height).toBeLessThanOrEqual(proseBox!.y + 1)

    // Monospace, like every other numeric readout in the app.
    const family = await numbers
      .locator('li')
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily)
    expect(family.toLowerCase()).toMatch(/mono/)
  })

  test('a question with no numbers gets no empty block', async ({ page }) => {
    await page.goto(TOPIC)
    const item = questionItem(page, NO_NUMBERS.text)
    await revealToggleOf(item).click()

    await expect(item.getByText(NO_NUMBERS.answerFragment)).toBeVisible()
    await expect(item.getByText('Key point')).toBeVisible()
    await expect(item.getByTestId('hw-numbers')).toHaveCount(0)
    await expect(item.getByText('Numbers to cite')).toHaveCount(0)
  })

  test('revealing one question leaves the others closed and its box unticked', async ({ page }) => {
    await page.goto(TOPIC)
    const item = questionItem(page, WITH_NUMBERS.text)
    const row = item.locator('label[data-item-id]')

    await revealToggleOf(item).click()
    await expect(revealToggleOf(item)).toHaveAttribute('aria-expanded', 'true')
    await expect(row).toHaveAttribute('data-completed', 'false')
    await expect(page.getByTestId('hw-numbers')).toHaveCount(1)

    await revealToggleOf(item).click()
    await expect(item.getByText(WITH_NUMBERS.answerFragment)).toHaveCount(0)
  })

  test('checking a question does not reveal its answer', async ({ page }) => {
    await page.goto(TOPIC)
    const item = questionItem(page, WITH_NUMBERS.text)
    const row = item.locator('label[data-item-id]')

    await row.click()
    await expect(row).toHaveAttribute('data-completed', 'true')
    await expect(revealToggleOf(item)).toHaveAttribute('aria-expanded', 'false')
    await expect(item.getByText(WITH_NUMBERS.answerFragment)).toHaveCount(0)
  })

  test('Reveal all opens every answer, Hide all closes them, neither ticks a box', async ({
    page,
  }) => {
    await page.goto(TOPIC)
    await page.getByRole('button', { name: /^reveal all$/i }).click()

    const item = questionItem(page, WITH_NUMBERS.text)
    await expect(item.getByText(WITH_NUMBERS.answerFragment)).toBeVisible()
    await expect(item.locator('label[data-item-id]')).toHaveAttribute('data-completed', 'false')
    // Six of the seven memory-hierarchy questions carry figures.
    await expect(page.getByTestId('hw-numbers')).toHaveCount(6)

    await page.getByRole('button', { name: /^hide all$/i }).click()
    await expect(item.getByText(WITH_NUMBERS.answerFragment)).toHaveCount(0)
    await expect(page.getByTestId('hw-numbers')).toHaveCount(0)
  })

  test('reveal state resets on reload; it does not persist like the checkbox', async ({ page }) => {
    await page.goto(TOPIC)
    const item = questionItem(page, WITH_NUMBERS.text)
    await revealToggleOf(item).click()
    await expect(item.getByTestId('hw-numbers')).toBeVisible()

    await page.reload()
    const reloaded = questionItem(page, WITH_NUMBERS.text)
    await expect(revealToggleOf(reloaded)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByTestId('hw-numbers')).toHaveCount(0)
  })

  test('figures wrap rather than overflow at 390px, in both themes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    // The generations question carries the longest figures in the bank.
    await page.goto(TOPIC)
    await page.getByRole('button', { name: /^reveal all$/i }).click()
    await expect(page.getByTestId('hw-numbers').first()).toBeVisible()

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t)
      }, theme)

      const doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(doc.scrollWidth, `${theme} theme should not overflow the page`).toBeLessThanOrEqual(
        doc.clientWidth,
      )

      // And the blocks themselves must not scroll sideways internally.
      const overflowing = await page
        .getByTestId('hw-numbers')
        .evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length)
      expect(overflowing, `${theme} theme: a figures block overflows its own box`).toBe(0)
    }
  })
})
