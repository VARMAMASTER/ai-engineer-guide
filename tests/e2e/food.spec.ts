import { expect, test } from '@playwright/test'

/**
 * The public food database, walked signed out.
 *
 * No `seedDayOne`, no session: the point of these routes is that they work for
 * a stranger with no account, so the test has to arrive as one.
 */

test.describe('the food database', () => {
  test('answers /food with a real h1 and something to look at', async ({ page }) => {
    const response = await page.goto('/food')
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Food database')
    await expect(page.getByRole('search')).toBeVisible()
    // Popular dishes before anybody types, rather than an empty box.
    await expect(page.getByRole('link', { name: /Dal tadka/ }).first()).toBeVisible()
  })

  test('searches without a session, and finds the dish rather than the raw dal', async ({
    page,
  }) => {
    await page.goto('/food?q=dal')
    const results = page.getByRole('link', { name: /kcal/ })
    await expect(results.first()).toContainText('Dal tadka')
    // The energy figure has to be the cooked dish's, not the dry lentil's.
    await expect(results.first()).toContainText(/1\d\d kcal per 1 katori/)
  })

  test('finds idli, sambar and paneer with numbers on them', async ({ page }) => {
    for (const [query, expected] of [
      ['idli', /Idli/],
      ['sambar', /Sambar/],
      ['paneer', /Paneer/],
    ] as const) {
      await page.goto(`/food?q=${query}`)
      const first = page.getByRole('link', { name: /kcal/ }).first()
      await expect(first).toContainText(expected)
      await expect(first).toContainText(/kcal \/ 100 g/)
    }
  })

  test('shows a dish as its recipe, with the lines adding up to the total', async ({ page }) => {
    await page.goto('/food/dal-tadka')
    await expect(page.locator('h1')).toHaveText('Dal tadka')

    const table = page.getByRole('table', { name: /Every ingredient in Dal tadka/ })
    await expect(table).toBeVisible()
    await expect(table.getByRole('link', { name: /Toor dal/ })).toBeVisible()
    await expect(table.getByRole('link', { name: 'Ghee' })).toBeVisible()

    // The footer total must equal the sum of the rows on screen. A breakdown
    // that does not add up looks like evidence and is not.
    const cells = await table.locator('tbody tr td:nth-child(3)').allInnerTexts()
    const summed = cells.reduce((total, cell) => total + Number(cell), 0)
    const footer = Number(await table.locator('tfoot tr td:nth-child(3)').innerText())
    expect(Math.abs(summed - footer)).toBeLessThanOrEqual(cells.length)
  })

  test('renders an unmeasured nutrient as words, not as zero', async ({ page }) => {
    // Sambar's sugar is genuinely unknown: drumstick and curry leaves carry no
    // figure, so the dish's total must not be the sum of the rest.
    await page.goto('/food/sambar')
    const row = page.getByRole('row', { name: /of which sugars/ })
    await expect(row).toContainText('not known')
    await expect(row).not.toContainText('0.0 g')
  })

  test('shows provenance and confidence on every food', async ({ page }) => {
    await page.goto('/food/ghee')
    await expect(page.getByText('IFCT 2017 (ICMR-NIN)')).toBeVisible()
    await expect(page.getByText('High confidence')).toBeVisible()
    // And a measured zero stays a zero.
    await expect(page.getByRole('row', { name: /^Fibre/ })).toContainText('0.0 g')

    await page.goto('/food/kasuri-methi')
    await expect(page.getByText('Estimate', { exact: true })).toBeVisible()
    await expect(page.getByText('Low confidence')).toBeVisible()
  })

  test('does not scroll sideways at 390px even with the nutrition table', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const url of ['/food', '/food?q=paneer', '/food/chicken-biryani', '/food/almond']) {
      await page.goto(url)
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(overflow.scrollWidth, `${url} scrolls horizontally`).toBeLessThanOrEqual(
        overflow.clientWidth + 1,
      )
    }
  })

  test('works with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/food?q=idli')
    await expect(page.locator('h1')).toHaveText('Food database')
    await expect(page.getByRole('link', { name: /Idli/ }).first()).toBeVisible()
    await context.close()
  })
})
