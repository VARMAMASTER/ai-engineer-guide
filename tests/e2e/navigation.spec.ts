import { expect, test } from '@playwright/test'
import { seedDayOne } from './helpers'

const SECONDARY = [
  { href: '/ai-ml', label: 'AI / ML' },
  { href: '/reading', label: 'Reading' },
  { href: '/settings', label: 'Settings' },
]

test.describe('navigation shell', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('desktop shows the rail and hides the tab bar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop layout')
    await page.goto('/today')

    await expect(page.getByTestId('side-nav')).toBeVisible()
    await expect(page.getByTestId('bottom-nav')).toBeHidden()

    // All eight sections are reachable from the rail, no sheet required.
    await expect(page.getByTestId('side-nav').locator('a')).toHaveCount(8)
    for (const { href } of SECONDARY) {
      await expect(page.getByTestId('side-nav').locator(`a[href="${href}"]`)).toBeVisible()
    }
  })

  test('mobile shows the tab bar and hides the rail', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile layout')
    await page.goto('/today')

    await expect(page.getByTestId('bottom-nav')).toBeVisible()
    await expect(page.getByTestId('side-nav')).toBeHidden()

    // Five primary tabs plus the More button.
    await expect(page.getByTestId('bottom-nav').locator('a')).toHaveCount(5)
    await expect(page.getByTestId('more-tab')).toBeVisible()
  })

  test('the More sheet opens and reaches all three secondary pages', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the sheet is a mobile affordance')
    await page.goto('/today')

    for (const { href, label } of SECONDARY) {
      await page.getByTestId('more-tab').click()
      const sheet = page.getByTestId('more-sheet')
      await expect(sheet).toBeVisible()
      await expect(sheet).toHaveAttribute('aria-modal', 'true')
      await expect(sheet.locator('a')).toHaveCount(3)

      await sheet.getByRole('link', { name: label }).click()
      await page.waitForURL(`**${href}`)

      // Navigating closes the sheet rather than leaving it over the new page.
      await expect(page.getByTestId('more-sheet')).toHaveCount(0)
    }
  })

  test('Escape closes the More sheet', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the sheet is a mobile affordance')
    await page.goto('/today')

    await page.getByTestId('more-tab').click()
    await expect(page.getByTestId('more-sheet')).toBeVisible()
    await expect(page.getByTestId('more-tab')).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('more-sheet')).toHaveCount(0)
    await expect(page.getByTestId('more-tab')).toHaveAttribute('aria-expanded', 'false')
  })

  test('the active section carries aria-current on the visible nav', async ({ page }, testInfo) => {
    const nav = page.getByTestId(testInfo.project.name === 'mobile' ? 'bottom-nav' : 'side-nav')

    for (const href of ['/today', '/dsa', '/system-design']) {
      await page.goto(href)
      await expect(nav.locator(`a[href="${href}"]`)).toHaveAttribute('aria-current', 'page')
      await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1)
    }
  })

  test('a child route keeps its parent section marked current', async ({ page }, testInfo) => {
    const nav = page.getByTestId(testInfo.project.name === 'mobile' ? 'bottom-nav' : 'side-nav')

    await page.goto('/dsa/arrays-hashing')
    await expect(nav.locator('a[href="/dsa"]')).toHaveAttribute('aria-current', 'page')

    await page.goto('/projects/rag')
    await expect(nav.locator('a[href="/projects"]')).toHaveAttribute('aria-current', 'page')
  })

  test('both navs are labelled for assistive technology', async ({ page }, testInfo) => {
    await page.goto('/today')
    const nav = page.getByTestId(testInfo.project.name === 'mobile' ? 'bottom-nav' : 'side-nav')
    await expect(nav).toHaveAttribute('aria-label', 'Sections')
  })
})
