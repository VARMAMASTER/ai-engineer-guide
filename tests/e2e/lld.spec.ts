import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedDayOne } from './helpers'

const INDEX = '/lld'
const PATTERN = '/lld/solid'
const PROBLEM = '/lld/parking-lot'

/** How far the document itself can be scrolled sideways. Must stay at zero. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.documentElement
    return Math.max(
      root.scrollWidth - root.clientWidth,
      document.body.scrollWidth - root.clientWidth,
    )
  })
}

function reveal(page: Page, name: RegExp): Locator {
  return page.getByRole('button', { name })
}

test.describe('low-level design', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('the index lists eight patterns and twenty-five problems', async ({ page }) => {
    await page.goto(INDEX)
    await expect(page.getByRole('heading', { level: 1, name: 'Low-Level Design' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Patterns', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Machine coding problems' })).toBeVisible()

    await expect(page.locator('a[href^="/lld/"]')).toHaveCount(33)
    await expect(page.locator('a[href="/lld/solid"]')).toHaveCount(1)
    await expect(page.locator('a[href="/lld/parking-lot"]')).toHaveCount(1)

    // No slug carries its bank prefix — one segment serves both banks.
    const hrefs = await page.locator('a[href^="/lld/"]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('href') ?? ''),
    )
    expect(hrefs.filter((h) => h.includes('lldp-') || h.includes('lldq-'))).toEqual([])
  })

  test('the Solved meter counts a problem marked done', async ({ page }) => {
    await page.goto(PROBLEM)
    const row = page.locator('label[data-item-id="lldq-parking-lot"]')
    await expect(row).toHaveAttribute('data-completed', 'false')
    await row.click()
    await expect(row).toHaveAttribute('data-completed', 'true')

    await page.goto(INDEX)
    await expect(page.getByRole('progressbar', { name: 'Solved' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    )
  })

  /* --- the problem page ------------------------------------------------- */

  test('the statement and the clarifying questions come before anything else', async ({ page }) => {
    await page.goto(PROBLEM)
    await expect(page.getByRole('heading', { level: 1, name: 'Parking Lot' })).toBeVisible()

    const statement = page.getByTestId('statement')
    await expect(statement).toBeVisible()
    await expect(statement).toContainText('Design a parking lot')

    const asks = page.getByRole('heading', { name: 'Ask these first' })
    await expect(asks).toBeVisible()

    // Order on the page, not just presence: the prompt is above the questions,
    // and both are above the first reveal.
    const statementY = (await statement.boundingBox())!.y
    const asksY = (await asks.boundingBox())!.y
    const revealY = (await reveal(page, /^Entities/).boundingBox())!.y
    expect(statementY).toBeLessThan(asksY)
    expect(asksY).toBeLessThan(revealY)
  })

  test('entities, the diagram and the solution are all hidden until asked for', async ({ page }) => {
    await page.goto(PROBLEM)

    for (const name of [/^Entities/, /^Class diagram/, /^Reference solution/]) {
      await expect(reveal(page, name)).toHaveAttribute('aria-expanded', 'false')
    }
    await expect(page.getByTestId('mermaid')).toHaveCount(0)
    await expect(page.locator('pre.code-block')).toHaveCount(0)
    await expect(page.getByText('ParkingLot - the aggregate root', { exact: false })).toHaveCount(0)
  })

  test('each reveal opens on its own, so a hint is not the whole answer', async ({ page }) => {
    await page.goto(PROBLEM)

    await reveal(page, /^Entities/).click()
    await expect(reveal(page, /^Entities/)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText('ParkingLot - the aggregate root', { exact: false })).toBeVisible()
    // Taking the structural hint has not handed over the code.
    await expect(page.locator('pre.code-block')).toHaveCount(0)

    await reveal(page, /^Reference solution/).click()
    const code = page.locator('pre.code-block')
    await expect(code).toBeVisible()
    await expect(code).toContainText('class ParkingLot')

    // And it closes again.
    await reveal(page, /^Reference solution/).click()
    await expect(page.locator('pre.code-block')).toHaveCount(0)
  })

  test('the Python solution scrolls inside its own solid box, not the page', async ({ page }) => {
    await page.goto(PROBLEM)
    await reveal(page, /^Reference solution/).click()

    const pre = page.locator('pre.code-block')
    await expect(pre).toBeVisible()
    const info = await pre.evaluate((el) => ({
      overflowX: window.getComputedStyle(el).overflowX,
      backdrop: window.getComputedStyle(el).backdropFilter,
      width: el.getBoundingClientRect().width,
    }))
    expect(info.overflowX).toBe('auto')
    // Solid, never glass: nothing is blurred behind code.
    expect(info.backdrop === 'none' || info.backdrop === '').toBe(true)
    expect(info.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  })

  test('the class diagram scrolls inside its own container instead of widening the page', async ({
    page,
  }) => {
    await page.goto(PROBLEM)
    await reveal(page, /^Class diagram/).click()

    const diagram = page.getByTestId('mermaid')
    await expect(diagram).toHaveAttribute('data-mermaid-status', 'ready', { timeout: 30_000 })

    const box = await diagram.evaluate((el) => ({
      overflowX: window.getComputedStyle(el).overflowX,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      right: el.getBoundingClientRect().right,
    }))
    expect(box.overflowX).toBe('auto')
    expect(box.right).toBeLessThanOrEqual(page.viewportSize()!.width + 1)

    // This is the assertion that matters at 390px: the diagram is genuinely
    // wider than its box, and the box — not the document — is what scrolls.
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  })

  test('the diagram is re-rendered, not just restyled, when the theme flips', async ({ page }) => {
    await page.goto(PROBLEM)
    await reveal(page, /^Class diagram/).click()

    const diagram = page.getByTestId('mermaid')
    await expect(diagram).toHaveAttribute('data-mermaid-status', 'ready', { timeout: 30_000 })
    await expect(diagram).toHaveAttribute('data-mermaid-theme', 'dark')

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
    await expect(diagram).toHaveAttribute('data-mermaid-theme', 'light')
    await expect(diagram).toHaveAttribute('data-mermaid-status', 'ready', { timeout: 30_000 })
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  })

  test('a problem links to every pattern it exercises', async ({ page }) => {
    await page.goto(PROBLEM)
    await expect(page.getByRole('heading', { name: 'Patterns it exercises' })).toBeVisible()
    await page.locator('a[href="/lld/modelling"]').click()
    await expect(page).toHaveURL(/\/lld\/modelling$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  /* --- the pattern page ------------------------------------------------- */

  test('a pattern leads with what it solves and when it is the wrong choice', async ({ page }) => {
    await page.goto(PATTERN)
    await expect(page.getByRole('heading', { level: 1, name: 'SOLID Principles' })).toBeVisible()
    await expect(page.getByText('LLD pattern')).toBeVisible()

    const wrong = page.getByTestId('when-wrong')
    await expect(wrong).toBeVisible()
    await expect(wrong).toContainText('SOLID buys changeability')

    // The warning block is not buried below the fold of the page's other prose.
    const solvesY = (await page.getByText('What it solves').boundingBox())!.y
    const wrongY = (await wrong.boundingBox())!.y
    const pitfallsY = (await page.getByText('Pitfalls').boundingBox())!.y
    expect(solvesY).toBeLessThan(wrongY)
    expect(wrongY).toBeLessThan(pitfallsY)
  })

  test('a pattern shows its Python example up front, no reveal needed', async ({ page }) => {
    await page.goto(PATTERN)
    const pre = page.locator('pre.code-block')
    await expect(pre).toBeVisible()
    await expect(pre).toContainText('class Invoice')
    expect(await pre.evaluate((el) => window.getComputedStyle(el).overflowX)).toBe('auto')
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  })

  test('a pattern lists the problems that exercise it and links back to them', async ({ page }) => {
    await page.goto(PATTERN)
    await expect(page.getByRole('heading', { name: 'Problems that exercise it' })).toBeVisible()
    const links = page.locator('a[href^="/lld/"]')
    expect(await links.count()).toBeGreaterThan(0)
    await links.first().click()
    await expect(page.getByTestId('statement')).toBeVisible()
  })

  test('a pattern that carries a diagram draws it without a reveal', async ({ page }) => {
    await page.goto('/lld/creational')
    const diagram = page.getByTestId('mermaid')
    await expect(diagram).toHaveAttribute('data-mermaid-status', 'ready', { timeout: 30_000 })
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  })

  test('an unknown slug is a 404, not an empty page', async ({ page }) => {
    const response = await page.goto('/lld/no-such-thing')
    expect(response!.status()).toBe(404)
  })
})
