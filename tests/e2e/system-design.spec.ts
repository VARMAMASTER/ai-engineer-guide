import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedDayOne } from './helpers'

const GENERAL_PAGE = '/system-design/caching'
const GENERAL_QUESTION = 'Design a distributed cache'
const ML_PAGE = '/system-design/rag-systems'
const ML_QUESTION = 'Design a semantic search engine over podcast transcripts'
const RATE_LIMIT_PAGE = '/system-design/rate-limiting'
const RATE_LIMIT_QUESTION = 'Design a rate limiter'

const SHARED_STEPS = ['Define the problem', 'Wrap up']
const GENERAL_ONLY = ['Data model', 'Core components', 'Scale and consistency', 'Deploy and operate']
const ML_ONLY = ['Data pipeline', 'Model architecture', 'Train and evaluate', 'Deploy and monitor']

function questionItem(page: Page, title: string): Locator {
  return page.locator('li.panel').filter({ hasText: title })
}

function toggleOf(item: Locator): Locator {
  return item.getByRole('button').first()
}

function revealOf(item: Locator): Locator {
  return item.getByTestId('sd-reveal')
}

function answerOf(item: Locator): Locator {
  return item.getByTestId('sd-answer')
}

/** How far the document itself can be scrolled sideways. Must stay at zero. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.documentElement
    return Math.max(root.scrollWidth - root.clientWidth, document.body.scrollWidth - root.clientWidth)
  })
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

/**
 * The line between practising a question and reading its answer.
 *
 * The prompts only do their job if you attempt the question before the solution
 * is on screen, so everything below is really one assertion made from several
 * angles: nothing from `solution`, `diagram`, `traps` or `whenPushed` may reach
 * the DOM until the reader asks for it, and asking is a separate act from
 * expanding the question.
 */
test.describe('system design: practice before answer', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('pacing and the opening line are there before the answer is', async ({ page }) => {
    await page.goto(RATE_LIMIT_PAGE)
    const item = questionItem(page, RATE_LIMIT_QUESTION)
    await toggleOf(item).click()

    // The budget strip. These four phase labels are unique on the row; the
    // other two collide with step headings, which is what `exact` would catch.
    for (const phase of ['Requirements', 'Estimates', 'API and data', 'Deep dive']) {
      await expect(item.getByText(phase, { exact: true })).toBeVisible()
    }
    await expect(item.getByText('45m total')).toBeVisible()
    await expect(item.getByText('by 45m')).toBeVisible()
    await expect(item.getByRole('heading', { name: 'Open with', exact: true })).toBeVisible()

    // And nothing at all from the answer side.
    await expect(answerOf(item)).toHaveCount(0)
    await expect(revealOf(item)).toHaveAttribute('aria-expanded', 'false')
    await expect(item.getByRole('heading', { name: 'Traps', exact: true })).toHaveCount(0)
    await expect(item.getByRole('heading', { name: 'When pushed', exact: true })).toHaveCount(0)
    await expect(item.getByTestId('mermaid')).toHaveCount(0)
  })

  test('the reveal opens and closes the reference answer', async ({ page }) => {
    await page.goto(RATE_LIMIT_PAGE)
    const item = questionItem(page, RATE_LIMIT_QUESTION)
    await toggleOf(item).click()

    await revealOf(item).click()
    const answer = answerOf(item)
    await expect(answer).toBeVisible()
    await expect(revealOf(item)).toHaveAttribute('aria-expanded', 'true')
    await expect(
      answer.getByRole('heading', { name: 'Numbers to say out loud', exact: true }),
    ).toBeVisible()
    await expect(answer.getByRole('heading', { name: 'Traps', exact: true })).toBeVisible()
    await expect(answer.getByRole('heading', { name: 'When pushed', exact: true })).toBeVisible()
    // Keyed to the same six steps as the prompts, so the two can be compared.
    for (const step of [...SHARED_STEPS, ...GENERAL_ONLY]) {
      await expect(answer.getByRole('heading', { name: step, exact: true })).toBeVisible()
    }

    await revealOf(item).click()
    await expect(answerOf(item)).toHaveCount(0)
  })

  test('collapsing a question resets its reveal', async ({ page }) => {
    await page.goto(RATE_LIMIT_PAGE)
    const item = questionItem(page, RATE_LIMIT_QUESTION)

    await toggleOf(item).click()
    await revealOf(item).click()
    await expect(answerOf(item)).toBeVisible()

    await toggleOf(item).click()
    await toggleOf(item).click()

    await expect(answerOf(item)).toHaveCount(0)
    await expect(revealOf(item)).toHaveAttribute('aria-expanded', 'false')
  })

  test('the ML bank reveals its own headings, not the general ones', async ({ page }) => {
    await page.goto(ML_PAGE)
    const item = questionItem(page, ML_QUESTION)
    await toggleOf(item).click()
    await revealOf(item).click()

    const answer = answerOf(item)
    for (const step of ML_ONLY) {
      await expect(answer.getByRole('heading', { name: step, exact: true })).toBeVisible()
    }
    for (const step of GENERAL_ONLY) {
      await expect(answer.getByRole('heading', { name: step, exact: true })).toHaveCount(0)
    }
  })

  test('the diagram renders on a solid surface that scrolls itself', async ({ page }) => {
    await page.goto(RATE_LIMIT_PAGE)
    const item = questionItem(page, RATE_LIMIT_QUESTION)
    await toggleOf(item).click()
    await revealOf(item).click()

    const diagram = answerOf(item).getByTestId('mermaid')
    await expect(diagram).toHaveAttribute('data-mermaid-status', 'ready', { timeout: 30_000 })
    await expect(diagram.locator('svg')).toBeVisible()
    await expect(diagram).toHaveClass(/surface-solid/)
    expect(await diagram.evaluate((el) => window.getComputedStyle(el).overflowX)).toBe('auto')

    // Never nested in a glass panel of its own: the only Panel above it is the
    // question row itself, which is where every question already lives.
    const glassAbove = await diagram.evaluate((el) => {
      let n: HTMLElement | null = el.parentElement
      let count = 0
      while (n && !(n.tagName === 'LI' && n.classList.contains('panel'))) {
        if (n.classList.contains('panel') || n.classList.contains('raised')) count += 1
        n = n.parentElement
      }
      return count
    })
    expect(glassAbove).toBe(0)
  })

  test('the diagram is rendered again when the theme flips', async ({ page }) => {
    await page.goto(RATE_LIMIT_PAGE)
    const item = questionItem(page, RATE_LIMIT_QUESTION)
    await toggleOf(item).click()
    await revealOf(item).click()

    const diagram = answerOf(item).getByTestId('mermaid')
    await expect(diagram).toHaveAttribute('data-mermaid-status', 'ready', { timeout: 30_000 })
    await expect(diagram).toHaveAttribute('data-mermaid-theme', 'dark')

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
    await expect(diagram).toHaveAttribute('data-mermaid-theme', 'light')
    await expect(diagram).toHaveAttribute('data-mermaid-status', 'ready', { timeout: 30_000 })
  })

  test('a fully revealed question never scrolls the page sideways', async ({ page }) => {
    await page.goto(RATE_LIMIT_PAGE)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)

    const item = questionItem(page, RATE_LIMIT_QUESTION)
    await toggleOf(item).click()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)

    await revealOf(item).click()
    await expect(answerOf(item).getByTestId('mermaid')).toHaveAttribute(
      'data-mermaid-status',
      'ready',
      { timeout: 30_000 },
    )
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  })
})
