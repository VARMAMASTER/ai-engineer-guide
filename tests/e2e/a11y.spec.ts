import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { seedDayOne, type ThemeChoice } from './helpers'

const PAGES = [
  { name: 'Today', url: '/today' },
  { name: 'DSA pattern', url: '/dsa/arrays-hashing' },
  { name: 'Reading', url: '/reading' },
]

const THEMES: ThemeChoice[] = ['dark', 'light']

function summarise(violations: { id: string; impact?: string | null; nodes: unknown[] }[]): string {
  return violations
    .map((v) => `${v.impact ?? 'unknown'} · ${v.id} (${v.nodes.length} node(s))`)
    .join('\n')
}

for (const theme of THEMES) {
  for (const { name, url } of PAGES) {
    test(`axe finds no critical violations on ${name} in ${theme}`, async ({ page }, testInfo) => {
      await seedDayOne(page, { theme })
      await page.goto(url)
      await expect(page.locator('h1')).toBeVisible()

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      // Anything short of critical is still reported into the run artifacts, so
      // a regression is visible even when it does not fail the build.
      const noteworthy = results.violations.filter((v) => v.impact !== 'minor')
      if (noteworthy.length > 0) {
        await testInfo.attach(`axe-${name}-${theme}.txt`, {
          body: JSON.stringify(results.violations, null, 2),
          contentType: 'application/json',
        })
      }

      const critical = results.violations.filter((v) => v.impact === 'critical')
      expect(critical, `critical violations on ${name} (${theme}):\n${summarise(critical)}`).toEqual(
        [],
      )

      const serious = results.violations.filter((v) => v.impact === 'serious')
      expect(serious, `serious violations on ${name} (${theme}):\n${summarise(serious)}`).toEqual([])
    })
  }
}

test('axe is clean on the More sheet, the one modal surface', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the sheet only exists below 768px')
  await seedDayOne(page)
  await page.goto('/today')

  await page.getByTestId('more-tab').click()
  await expect(page.getByTestId('more-sheet')).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  expect(blocking, summarise(blocking)).toEqual([])
})

/* -------------------------------------------------------------------------
 * Keyboard-only traversal
 *
 * "Reaches every control" is asserted as a set comparison, not a click count:
 * the page is asked which controls it believes it has, then Tab is pressed
 * until focus cycles, and the two sets must match. A control that is present
 * but unreachable — a `tabindex="-1"`, a div with a click handler, something
 * behind an overlay — shows up as a missing member rather than as a test that
 * quietly stops early.
 * ----------------------------------------------------------------------- */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

async function visibleControls(page: Page): Promise<string[]> {
  return page.evaluate((selector) => {
    const key = (el: Element) => {
      const e = el as HTMLElement
      const name =
        e.getAttribute('aria-label') ??
        e.getAttribute('href') ??
        (e.textContent ?? '').trim().slice(0, 40) ??
        ''
      return `${e.tagName.toLowerCase()}:${name}`
    }
    return Array.from(document.querySelectorAll(selector))
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) return false
        const style = window.getComputedStyle(el)
        return style.visibility !== 'hidden' && style.display !== 'none'
      })
      .map(key)
  }, FOCUSABLE)
}

async function tabThrough(page: Page, steps: number): Promise<string[]> {
  const reached: string[] = []
  await page.evaluate(() => document.body.focus())
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press('Tab')
    const id = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null
      if (!e || e === document.body) return null
      const name =
        e.getAttribute('aria-label') ??
        e.getAttribute('href') ??
        (e.textContent ?? '').trim().slice(0, 40) ??
        ''
      return `${e.tagName.toLowerCase()}:${name}`
    })
    if (id) reached.push(id)
  }
  return reached
}

for (const { name, url } of [
  { name: 'Today', url: '/today' },
  { name: 'Settings', url: '/settings' },
]) {
  test(`keyboard-only traversal reaches every control on ${name}`, async ({ page }) => {
    await seedDayOne(page)
    await page.goto(url)
    await expect(page.locator('h1')).toBeVisible()

    const expected = await visibleControls(page)
    expect(expected.length, `${name} should have controls to traverse`).toBeGreaterThan(3)

    // Generous headroom: browser chrome and the address bar each consume a stop.
    const reached = new Set(await tabThrough(page, expected.length + 6))

    const missed = expected.filter((c) => !reached.has(c))
    expect(missed, `${name}: unreachable by keyboard — ${missed.join(' | ')}`).toEqual([])
  })
}

test('focus is always visible where it lands', async ({ page }) => {
  await seedDayOne(page)
  await page.goto('/settings')

  await page.keyboard.press('Tab')
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    const style = window.getComputedStyle(el)
    return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor }
  })
  expect(outline.style).not.toBe('none')
  expect(parseFloat(outline.width)).toBeGreaterThan(0)
})

test('every checkbox has its own accessible name', async ({ page }) => {
  await seedDayOne(page)
  await page.goto('/dsa/arrays-hashing')

  const names = await page
    .locator('input[type="checkbox"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''))

  expect(names.length).toBeGreaterThan(0)
  expect(names.filter((n) => n === '')).toEqual([])
  expect(new Set(names).size, 'checkbox names must be unique to be useful').toBe(names.length)
})
