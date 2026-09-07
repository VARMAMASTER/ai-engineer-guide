import { expect, test, type Page } from '@playwright/test'

/**
 * Timed mock mode (spec 6.8).
 *
 * The unit suite proves the arithmetic. What only a real browser can prove is
 * the part the arithmetic is there to serve: that a drill survives an actual
 * reload of an actual page, that the answer is genuinely absent from the
 * document rather than merely hidden, and that the phase indicator advances
 * when you tell it you have moved on.
 */

const DRILLS = ['/mock/coding', '/mock/design', '/mock/behavioural'] as const

/** Seconds left in the box, read off the running clock. Negative once blown. */
async function remainingSeconds(page: Page, testId = 'mock-timer'): Promise<number> {
  const text = (await page.getByTestId(testId).textContent()) ?? ''
  const m = text.match(/(\+?)(\d{2}):(\d{2})/)
  expect(m, `no clock found in "${text}"`).not.toBeNull()
  const seconds = Number(m![2]) * 60 + Number(m![3])
  return m![1] === '+' ? -seconds : seconds
}

test.describe('mock mode', () => {
  test('the index offers the three drills and needs no JavaScript to do it', async ({
    page, request,
  }) => {
    await page.goto('/mock')
    await expect(page.getByRole('heading', { level: 1, name: 'Mock' })).toBeVisible()
    for (const href of DRILLS) {
      await expect(page.locator(`a[href="${href}"]`)).toBeVisible()
    }

    // The same view a crawler or a visitor whose script failed to load gets.
    const html = await (await request.get('/mock')).text()
    expect(html).toMatch(/<h1[\s>]/)
    for (const href of DRILLS) expect(html).toContain(href)
  })

  test('every drill route answers 200 with a server-rendered h1', async ({ page, request }) => {
    for (const href of DRILLS) {
      const response = await request.get(href)
      expect(response.status(), `${href} should answer 200`).toBe(200)
      expect(await response.text(), `${href} needs an h1 before hydration`).toMatch(/<h1[\s>]/)

      await page.goto(href)
      const h1 = page.locator('h1')
      await expect(h1).toHaveCount(1)
      await expect(h1).toBeVisible()
    }
  })

  test('an unknown drill is a 404, not a blank runner', async ({ request }) => {
    expect((await request.get('/mock/sql')).status()).toBe(404)
  })

  /* ------------------------------------------------------------------ */

  test('coding: the clock runs, the answer is absent, and ending reveals it', async ({ page }) => {
    await page.goto('/mock/coding')
    await page.getByTestId('mock-draw').click()

    await expect(page.getByTestId('mock-drill')).toBeVisible()
    const problem = await page.getByTestId('mock-heading').textContent()
    expect(problem?.trim()).toBeTruthy()

    // 25 minutes, give or take the second it took to click.
    expect(await remainingSeconds(page)).toBeGreaterThan(24 * 60)
    await expect(page.getByTestId('coding-script')).toBeVisible()
    await expect(page.getByRole('link', { name: /LeetCode/ })).toBeVisible()

    // Absent from the document, not hidden in it.
    await expect(page.getByTestId('mock-reveal')).toHaveCount(0)

    await page.getByRole('checkbox', { name: 'Restate the problem' }).check()
    await expect(page.getByTestId('script-progress')).toHaveText('1/8')

    await page.getByTestId('mock-end').click()
    await expect(page.getByTestId('mock-reveal')).toBeVisible()
    await expect(page.getByTestId('mock-result')).toContainText('Real elapsed')
    await expect(page.getByTestId('mock-result')).toContainText('1 of 8')
    await expect(page.getByTestId('mock-history')).toContainText(problem!.trim())
  })

  test('the clock survives a reload — it is a wall clock, not a tick counter', async ({ page }) => {
    await page.goto('/mock/coding')
    await page.getByTestId('mock-draw').click()
    await expect(page.getByTestId('mock-drill')).toBeVisible()

    const problem = await page.getByTestId('mock-heading').textContent()
    const before = await remainingSeconds(page)

    await page.waitForTimeout(3_000)
    await page.reload()

    await expect(page.getByTestId('mock-drill')).toBeVisible()
    await expect(
      page.getByTestId('mock-heading'),
      'the same drill, not a fresh draw',
    ).toHaveText(problem!.trim())

    const after = await remainingSeconds(page)
    expect(after, 'the clock kept running while the page was gone').toBeLessThanOrEqual(before - 2)
    expect(after, 'and it did not reset to a full box').toBeLessThan(25 * 60)
  })

  test('pausing is allowed and is written down', async ({ page }) => {
    await page.goto('/mock/coding')
    await page.getByTestId('mock-draw').click()

    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(page.getByTestId('mock-timer')).toHaveAttribute('data-state', 'paused')
    const frozen = await remainingSeconds(page)
    await page.waitForTimeout(1_500)
    expect(await remainingSeconds(page), 'a paused clock does not move').toBe(frozen)

    await page.getByRole('button', { name: 'Resume' }).click()
    await expect(page.getByTestId('mock-timer')).toHaveAttribute('data-state', 'running')

    await page.getByTestId('mock-end').click()
    await expect(page.getByTestId('mock-result')).toContainText('1 time')
    await expect(page.getByTestId('mock-history')).toContainText('1 pause')
  })

  /* ------------------------------------------------------------------ */

  test('design: the opening comes before the clock, the phase budget after it', async ({ page }) => {
    await page.goto('/mock/design')
    await page.getByTestId('mock-draw').click()

    const pre = page.getByTestId('mock-prestart')
    await expect(pre).toBeVisible()
    await expect(pre).toContainText('Open with this')
    await expect(pre).toContainText('Phase budget')
    await expect(page.getByTestId('mock-timer'), 'nothing is ticking yet').toHaveCount(0)
    await expect(page.getByTestId('mock-reveal')).toHaveCount(0)

    await page.getByTestId('mock-start').click()

    const board = page.getByTestId('mock-phases')
    await expect(board).toBeVisible()
    await expect(page.getByTestId('mock-phase-timer')).toContainText('Phase 1 of 6')
    await expect(page.getByTestId('mock-phase-timer')).toContainText('Requirements')
    await expect(
      board.locator('[data-phase="requirements"]'),
    ).toHaveAttribute('data-phase-state', 'current')

    // The phase clock is its own budget, not the round's.
    const phaseLeft = await remainingSeconds(page, 'mock-phase-timer')
    const roundLeft = await remainingSeconds(page)
    expect(phaseLeft).toBeLessThan(roundLeft)

    await page.getByTestId('mock-advance').click()
    await expect(page.getByTestId('mock-phase-timer')).toContainText('Phase 2 of 6')
    await expect(
      board.locator('[data-phase="requirements"]'),
    ).toHaveAttribute('data-phase-state', 'done')
    await expect(
      board.locator('[data-phase="estimates"]'),
    ).toHaveAttribute('data-phase-state', 'current')

    await expect(page.getByTestId('mock-reveal'), 'still nothing revealed').toHaveCount(0)

    await page.getByTestId('mock-end').click()
    await expect(page.getByTestId('mock-reveal')).toBeVisible()
    await expect(page.getByTestId('mock-phase-result')).toContainText('Requirements')
  })

  /* ------------------------------------------------------------------ */

  test('behavioural: two minutes, then the probes', async ({ page }) => {
    await page.goto('/mock/behavioural')
    await page.getByTestId('mock-draw').click()

    await expect(page.getByTestId('mock-drill')).toBeVisible()
    const left = await remainingSeconds(page)
    expect(left).toBeGreaterThan(110)
    expect(left).toBeLessThanOrEqual(120)

    await expect(page.getByTestId('coding-script'), 'no coding script here').toHaveCount(0)
    await expect(page.getByTestId('mock-phases'), 'and no phase board').toHaveCount(0)
    await expect(page.getByTestId('mock-reveal')).toHaveCount(0)

    await page.getByTestId('mock-end').click()
    const reveal = page.getByTestId('mock-reveal')
    await expect(reveal).toBeVisible()
    await expect(reveal).toContainText('The probes that follow your answer')
    await expect(reveal).toContainText('Traps on this question')
  })

  /* ------------------------------------------------------------------ */

  test('a drill left open on another kind is pointed at, not clobbered', async ({ page }) => {
    await page.goto('/mock/behavioural')
    await page.getByTestId('mock-draw').click()
    await expect(page.getByTestId('mock-drill')).toBeVisible()

    await page.goto('/mock/coding')
    const note = page.getByTestId('mock-elsewhere')
    await expect(note).toBeVisible()
    await expect(note.locator('a')).toHaveAttribute('href', '/mock/behavioural')
  })

  test('no mock route scrolls horizontally, revealed answer included', async ({
    page,
  }, testInfo) => {
    const width = testInfo.project.use.viewport?.width
    const check = async (where: string) => {
      const box = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(box.scrollWidth, `${where} overflows at ${width}px`).toBeLessThanOrEqual(
        box.clientWidth + 1,
      )
    }

    await page.goto('/mock')
    await check('/mock')

    for (const href of DRILLS) {
      await page.goto(href)

      const draw = page.getByTestId('mock-draw')
      if (await draw.count()) await draw.click()
      const start = page.getByTestId('mock-start')
      if (await start.count()) await start.click()
      await expect(page.getByTestId('mock-drill')).toBeVisible()
      await check(`${href} running`)

      // The revealed state is the widest the page ever gets: code blocks,
      // long prose and, on design, a Mermaid diagram.
      await page.getByTestId('mock-end').click()
      await expect(page.getByTestId('mock-reveal')).toBeVisible()
      await check(`${href} revealed`)
    }
  })
})
