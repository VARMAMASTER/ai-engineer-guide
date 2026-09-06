import { expect, test, type Page } from '@playwright/test'
import {
  contrastRatio,
  parseRgb,
  relativeLuminance,
  rgbText,
  sampleAverageColor,
  seedDayOne,
  seedProgress,
  type Rgb,
} from './helpers'

/**
 * Theme behaviour, asserted against pixels the browser actually painted.
 *
 * This project has already shipped a contrast test that passed while the page
 * rendered white: it read the CSS custom properties and checked those against
 * each other, so it was testing the palette file, not the product. Everything
 * below screenshots the running page and decodes the result, so a body that
 * paints the wrong colour — a preflight reset, a stray `background: #fff` from
 * a framework error page, a token that never got bound — fails the assertion
 * even though the variables are all still perfect.
 */

const GLASS_PANEL_TEXT = {
  url: '/system-design/caching',
  panel: 'What it solves',
}

/** Contrast between a text element's computed colour and the pixels behind it. */
async function measurePanelContrast(page: Page) {
  const section = page.locator('section.panel').filter({ hasText: GLASS_PANEL_TEXT.panel }).first()
  await expect(section).toBeVisible()
  await section.scrollIntoViewIfNeeded()

  const paragraph = section.locator('p').first()
  await expect(paragraph).toBeVisible()

  const color = parseRgb(
    await paragraph.evaluate((el) => window.getComputedStyle(el).color),
  )

  const box = (await section.boundingBox())!
  // A text-free strip inside the panel's left padding, level with the copy —
  // the same composited stack the glyphs sit on: ground, wash, glass, blur.
  const background = await sampleAverageColor(page, {
    x: box.x + 4,
    y: box.y + box.height / 2 - 4,
    width: 8,
    height: 8,
  })

  return { color, background, ratio: contrastRatio(color, background) }
}

/**
 * The bare Ground, sampled where nothing is stacked on it.
 *
 * `elementFromPoint` is asked which element owns each candidate point and the
 * first one that answers `main` is a spot with no panel, no card and no text
 * over it — so the pixel there is the page's own background and nothing else.
 */
async function sampleGround(page: Page): Promise<Rgb> {
  const point = await page.evaluate(() => {
    const main = document.querySelector('main')
    if (!main) return null
    const r = main.getBoundingClientRect()
    const x = r.left + r.width / 2
    const bottom = Math.min(r.bottom, window.innerHeight) - 6
    for (let y = Math.max(r.top, 0) + 6; y < bottom; y += 4) {
      if (document.elementFromPoint(x, y) === main) return { x, y }
    }
    return null
  })
  expect(point, 'no bare ground was visible inside <main>').not.toBeNull()
  return sampleAverageColor(page, { x: point!.x - 2, y: point!.y - 2, width: 4, height: 4 })
}

test.describe('theme', () => {
  test('the toggle cycles dark, light, system', async ({ page }) => {
    await seedDayOne(page)
    await page.goto('/today')

    const toggle = page.getByTestId('theme-toggle')
    const html = page.locator('html')

    await expect(toggle).toHaveAttribute('data-theme-choice', 'dark')
    await expect(html).toHaveAttribute('data-theme', 'dark')

    await toggle.click()
    await expect(toggle).toHaveAttribute('data-theme-choice', 'light')
    await expect(html).toHaveAttribute('data-theme', 'light')

    await toggle.click()
    await expect(toggle).toHaveAttribute('data-theme-choice', 'system')
    // System removes the attribute so prefers-color-scheme takes over again.
    await expect(html).not.toHaveAttribute('data-theme', /.*/)

    await toggle.click()
    await expect(toggle).toHaveAttribute('data-theme-choice', 'dark')
    await expect(html).toHaveAttribute('data-theme', 'dark')
  })

  test('the choice survives a reload', async ({ page }) => {
    await seedDayOne(page)
    await page.goto('/today')

    await page.getByTestId('theme-toggle').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByTestId('theme-toggle')).toHaveAttribute('data-theme-choice', 'light')

    // And across a different route, not just this one.
    await page.goto('/dsa')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('system follows the OS preference in both directions', async ({ page }) => {
    await seedProgress(page, { theme: 'system' })

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(GLASS_PANEL_TEXT.url)
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)
    const dark = await measurePanelContrast(page)
    expect(
      relativeLuminance(dark.background),
      `system+dark painted ${rgbText(dark.background)}, which is not a dark surface`,
    ).toBeLessThan(0.25)

    await page.emulateMedia({ colorScheme: 'light' })
    const light = await measurePanelContrast(page)
    expect(
      relativeLuminance(light.background),
      `system+light painted ${rgbText(light.background)}, which is not a light surface`,
    ).toBeGreaterThan(0.5)
  })

  test('there is no wrong-theme flash on first paint', async ({ page }) => {
    await seedProgress(page, { theme: 'light' })

    // Record every value `data-theme` ever holds, and whether a body existed at
    // the time — a value that changes before the body exists cannot have been
    // painted. The rAF entry is the frame the browser is about to present, so
    // it is the closest observable stand-in for "first paint".
    await page.addInitScript(() => {
      const log: { theme: string | null; bodyExists: boolean; why: string }[] = []
      ;(window as unknown as { __themeLog: typeof log }).__themeLog = log
      const record = (why: string) =>
        log.push({
          why,
          theme: document.documentElement?.getAttribute('data-theme') ?? null,
          bodyExists: document.body !== null,
        })

      new MutationObserver(() => record('attr')).observe(document, {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-theme'],
      })
      requestAnimationFrame(() => record('first-frame'))
    })

    await page.goto('/today')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    const log = await page.evaluate(
      () => (window as unknown as { __themeLog: { theme: string | null; bodyExists: boolean; why: string }[] }).__themeLog,
    )

    const firstFrame = log.find((e) => e.why === 'first-frame')
    expect(firstFrame, 'no frame was recorded').toBeTruthy()
    expect(firstFrame!.theme, 'the first presented frame was not the stored theme').toBe('light')

    const paintable = log.filter((e) => e.bodyExists)
    expect(
      paintable.filter((e) => e.theme !== 'light'),
      `data-theme held a non-light value while content existed: ${JSON.stringify(paintable)}`,
    ).toEqual([])

    // And the pixels agree: the ground really is the light one.
    const { background } = await measurePanelContrastOnToday(page)
    expect(
      relativeLuminance(background),
      `first paint settled on ${rgbText(background)}, which is not the light ground`,
    ).toBeGreaterThan(0.5)
  })

  for (const theme of ['dark', 'light'] as const) {
    test(`body text over a glass panel passes a rendered-pixel contrast check in ${theme}`, async ({
      page,
    }) => {
      await seedProgress(page, { theme })
      await page.goto(GLASS_PANEL_TEXT.url)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      const { color, background, ratio } = await measurePanelContrast(page)

      // The page really is in the theme it claims to be in. This is the half a
      // palette-only test cannot do, and the half that failed last time.
      const luminance = relativeLuminance(background)
      const ground = await sampleGround(page)
      if (theme === 'dark') {
        expect(luminance, `dark mode painted a panel of ${rgbText(background)}`).toBeLessThan(0.25)
        expect(
          relativeLuminance(ground),
          `dark mode painted a ground of ${rgbText(ground)}`,
        ).toBeLessThan(0.25)
      } else {
        expect(luminance, `light mode painted a panel of ${rgbText(background)}`).toBeGreaterThan(0.5)
        expect(
          relativeLuminance(ground),
          `light mode painted a ground of ${rgbText(ground)}`,
        ).toBeGreaterThan(0.5)
      }

      expect(
        ratio,
        `${theme}: ${rgbText(color)} on rendered ${rgbText(background)} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5)
    })
  }

  for (const theme of ['dark', 'light'] as const) {
    test(`muted text over a glass panel also clears 4.5:1 in ${theme}`, async ({ page }) => {
      await seedDayOne(page, { theme })
      await page.goto('/today')

      const panel = page
        .locator('section.panel')
        .filter({ hasText: 'Streak and hours' })
        .first()
      await expect(panel).toBeVisible()
      await panel.scrollIntoViewIfNeeded()

      const box = (await panel.boundingBox())!
      const background = await sampleAverageColor(page, {
        x: box.x + 4,
        y: box.y + box.height / 2 - 4,
        width: 8,
        height: 8,
      })

      // The muted meter label is the lowest-contrast body text the design uses
      // over glass; if it clears the bar, everything darker does too.
      const label = panel.getByText('Weekly hours', { exact: true })
      await expect(label).toBeVisible()
      const color = parseRgb(await label.evaluate((el) => window.getComputedStyle(el).color))

      const ratio = contrastRatio(color, background)
      expect(
        ratio,
        `${theme} muted label: ${rgbText(color)} on rendered ${rgbText(background)} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5)
    })
  }
})

/** Same measurement, taken on the first glass panel of whatever page is loaded. */
async function measurePanelContrastOnToday(page: Page): Promise<{ color: Rgb; background: Rgb }> {
  const section = page.locator('section.panel, div.panel').first()
  await expect(section).toBeVisible()
  const box = (await section.boundingBox())!
  const background = await sampleAverageColor(page, {
    x: box.x + 4,
    y: box.y + box.height / 2 - 4,
    width: 8,
    height: 8,
  })
  const color = parseRgb(await section.evaluate((el) => window.getComputedStyle(el).color))
  return { color, background }
}
