import { expect, test } from '@playwright/test'
import { seedDayOne } from './helpers'
import { LEARN_SECTIONS, NAV_APPS, SETTINGS_ITEM } from '../../lib/nav'

/**
 * The nav has two levels: five apps that never move, and the sections of
 * whichever app you are in.
 *
 * Every count below is derived from the nav model, never written out. The
 * literals that used to live here went stale three times as sections were
 * added — deriving is the fix that holds, and it is worth more now that the
 * model has a shape rather than a length.
 */
const LEARN = NAV_APPS.find((a) => a.sections.length > 0)!
const APPS_WITHOUT_SECTIONS = NAV_APPS.filter((a) => a.sections.length === 0)

test.describe('navigation shell', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('desktop shows the rail and hides the tab bar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop layout')
    await page.goto('/today')

    const rail = page.getByTestId('side-nav')
    await expect(rail).toBeVisible()
    await expect(page.getByTestId('bottom-nav')).toBeHidden()

    // Outside Learn, the rail is exactly the five apps.
    await expect(rail.locator('a')).toHaveCount(NAV_APPS.length)
    for (const app of NAV_APPS) {
      await expect(rail.locator(`a[href="${app.href}"]`)).toBeVisible()
    }
    await expect(page.getByTestId('side-nav-sections')).toHaveCount(0)
  })

  test('the desktop rail opens the current app and lists every section in it', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop layout')
    await page.goto('/dsa')

    const sections = page.getByTestId('side-nav-sections')
    await expect(sections).toBeVisible()
    await expect(sections.locator('a')).toHaveCount(LEARN.sections.length)
    for (const { href, label } of LEARN.sections) {
      await expect(sections.getByRole('link', { name: label })).toHaveAttribute('href', href)
    }

    // The open app is a heading, not a link — which is what keeps /roadmap from
    // appearing twice in one nav and taking aria-current with it.
    const rail = page.getByTestId('side-nav')
    await expect(rail.locator('a')).toHaveCount(
      APPS_WITHOUT_SECTIONS.length + LEARN.sections.length,
    )
  })

  test('mobile shows the tab bar and hides the rail', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile layout')
    await page.goto('/today')

    const bar = page.getByTestId('bottom-nav')
    await expect(bar).toBeVisible()
    await expect(page.getByTestId('side-nav')).toBeHidden()

    // Five apps, permanently. No More button, no overflow.
    await expect(bar.locator('a')).toHaveCount(NAV_APPS.length)
    for (const app of NAV_APPS) {
      await expect(bar.locator(`a[href="${app.href}"]`)).toBeVisible()
    }
    await expect(page.getByTestId('more-tab')).toHaveCount(0)
    await expect(page.getByTestId('more-sheet')).toHaveCount(0)
  })

  test('the section strip reaches every section of the app it belongs to', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the strip is the phone expression of level two')

    await page.goto(LEARN.href)
    const strip = page.getByTestId('section-tabs')
    await expect(strip).toBeVisible()
    await expect(strip.locator('a')).toHaveCount(LEARN.sections.length)

    for (const { href, label } of LEARN.sections) {
      await strip.getByRole('link', { name: label }).click()
      await page.waitForURL(`**${href}`)
      // The strip survives the navigation and follows it.
      await expect(strip.locator(`a[href="${href}"]`)).toHaveAttribute('aria-current', 'page')
      await expect(strip.locator('a[aria-current="page"]')).toHaveCount(1)
    }
  })

  test('an app with no sections shows no strip at all', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the strip is a phone affordance')

    for (const app of APPS_WITHOUT_SECTIONS) {
      await page.goto(app.href)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.getByTestId('section-tabs')).toHaveCount(0)
    }
  })

  test('the section strip scrolls sideways without the page moving', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the strip only scrolls where it overflows')
    await page.goto('/dsa')

    const scroller = page.getByTestId('section-tabs').locator('div').first()
    const before = await scroller.evaluate((el) => ({
      overflowX: window.getComputedStyle(el).overflowX,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
    }))

    // Fourteen sections cannot fit 390px, so the strip must genuinely overflow.
    expect(before.overflowX).toBe('auto')
    expect(before.scrollWidth).toBeGreaterThan(before.clientWidth)
    // ...and the page must not have grown to accommodate them.
    expect(before.documentScrollWidth).toBeLessThanOrEqual(before.documentClientWidth + 1)

    const scrolled = await scroller.evaluate((el) => {
      el.scrollLeft = el.scrollWidth
      return { left: el.scrollLeft, pageLeft: window.scrollX }
    })
    expect(scrolled.left).toBeGreaterThan(0)
    expect(scrolled.pageLeft).toBe(0)
  })

  test('the active app carries aria-current on the visible nav', async ({ page }, testInfo) => {
    const mobile = testInfo.project.name === 'mobile'
    const nav = page.getByTestId(mobile ? 'bottom-nav' : 'side-nav')

    for (const app of NAV_APPS) {
      await page.goto(app.href)
      await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1)
      if (mobile || app.sections.length === 0) {
        // Phone: the tab bar marks the app. Desktop: an app with no sections is
        // itself the leaf, so the rail marks it directly.
        await expect(nav.locator(`a[href="${app.href}"]`)).toHaveAttribute('aria-current', 'page')
      }
    }
  })

  test('a child route keeps its section marked current, and its app too', async ({
    page,
  }, testInfo) => {
    const mobile = testInfo.project.name === 'mobile'

    for (const [route, section] of [
      ['/dsa/arrays-hashing', '/dsa'],
      ['/projects/rag', '/projects'],
      ['/revise/sheets', '/revise'],
    ] as const) {
      await page.goto(route)
      const sections = page.getByTestId(mobile ? 'section-tabs' : 'side-nav-sections')
      await expect(sections.locator(`a[href="${section}"]`)).toHaveAttribute(
        'aria-current',
        'page',
      )
      await expect(sections.locator('a[aria-current="page"]')).toHaveCount(1)

      if (mobile) {
        const bar = page.getByTestId('bottom-nav')
        await expect(bar.locator(`a[href="${LEARN.href}"]`)).toHaveAttribute(
          'aria-current',
          'page',
        )
        await expect(bar.locator('a[aria-current="page"]')).toHaveCount(1)
      }
    }
  })

  test('Settings hangs off the top bar at both widths', async ({ page }) => {
    await page.goto('/today')
    const link = page.getByTestId('settings-link')
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', SETTINGS_ITEM.href)

    await link.click()
    await page.waitForURL(`**${SETTINGS_ITEM.href}`)
    await expect(link).toHaveAttribute('aria-current', 'page')

    // It belongs to no app, so nothing in the app nav claims to be current.
    await expect(page.getByTestId('section-tabs')).toHaveCount(0)
  })

  test('every nav is labelled for assistive technology', async ({ page }, testInfo) => {
    await page.goto('/dsa')
    const mobile = testInfo.project.name === 'mobile'

    await expect(page.getByTestId(mobile ? 'bottom-nav' : 'side-nav')).toHaveAttribute(
      'aria-label',
      'Apps',
    )
    if (mobile) {
      await expect(page.getByTestId('section-tabs')).toHaveAttribute(
        'aria-label',
        `${LEARN.label} sections`,
      )
    }
  })

  test('the nav model reaches every section listed in it', () => {
    expect(LEARN.sections).toBe(LEARN_SECTIONS)
    expect(new Set(LEARN_SECTIONS.map((s) => s.href)).size).toBe(LEARN_SECTIONS.length)
  })
})
