import { expect, test, type Page } from '@playwright/test'
import { NAV_APPS, SETTINGS_ITEM } from '../../lib/nav'
import { isMobile, seedDayOne } from './helpers'

/**
 * The app switcher, in a real engine.
 *
 * Everything here is a claim jsdom cannot settle honestly. It has no layout, so
 * "44px tap target" is a class name there; no media queries, so "a sheet below
 * 768px and a dropdown above it" is a stubbed boolean; no `inert`, so "focus
 * cannot escape" is an attribute that exists; and no `backdrop-filter`, so the
 * blur budget is unmeasurable. The unit suite covers roles, wiring and the
 * keyboard model. This covers the parts that only a browser knows.
 *
 * It runs in both projects. The mobile one is 390x844 — the phone the owner has
 * this installed on, where `display: standalone` means there is no browser back
 * button and this control is the only way out of a page.
 */

const SWITCHER = '[data-testid="app-switcher"]'
const PANEL = '[data-testid="app-switcher-panel"]'
const ITEM = '[data-testid="app-switcher-item"]'

/** A page deep inside an app, so "get me out of here" is a real question. */
const DEEP = '/dsa/arrays-hashing'

function trigger(page: Page) {
  return page.locator(SWITCHER)
}

async function openSwitcher(page: Page) {
  await trigger(page).click()
  await expect(page.getByRole('menu', { name: 'Apps' })).toBeVisible()
}

test.describe('app switcher', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
    await page.goto(DEEP)
    await expect(trigger(page)).toBeVisible()
  })

  test('is a real 44px target that names the app you are in', async ({ page }) => {
    // `/dsa/arrays-hashing` is a page, inside the DSA section, inside Learn.
    // The switcher is level one, so it says Learn.
    await expect(trigger(page)).toHaveAttribute('data-app', 'learn')
    await expect(trigger(page)).toContainText('Learn')

    const box = (await trigger(page).boundingBox())!
    expect(box.height, 'trigger height').toBeGreaterThanOrEqual(44)
    expect(box.width, 'trigger width').toBeGreaterThanOrEqual(44)
  })

  test('every row in the open menu is a real 44px target', async ({ page }) => {
    await openSwitcher(page)
    const boxes = await page.locator(ITEM).evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        return { app: el.getAttribute('data-app'), h: Math.round(r.height), w: Math.round(r.width) }
      }),
    )
    expect(boxes).toHaveLength(NAV_APPS.length + 1)
    const small = boxes.filter((b) => b.h < 44 || b.w < 44)
    expect(small, `rows under 44px: ${JSON.stringify(small)}`).toEqual([])
  })

  test('opens the surface the viewport calls for', async ({ page }, testInfo) => {
    await openSwitcher(page)
    const panel = (await page.locator(PANEL).boundingBox())!
    const viewport = page.viewportSize()!

    if (isMobile(testInfo)) {
      // A bottom sheet: a menu hanging off the top bar is at the wrong end of
      // the phone from the thumb holding it.
      await expect(page.getByRole('dialog', { name: 'Switch app' })).toBeVisible()
      expect(panel.y + panel.height, 'sheet should sit on the bottom edge').toBeGreaterThan(
        viewport.height - 24,
      )
      expect(panel.width, 'sheet should be nearly full width').toBeGreaterThan(viewport.width - 40)
    } else {
      // A dropdown anchored to the trigger. A pointer has no reach problem, and
      // a sheet crossing 800px of window to answer a click at the top is travel
      // for its own sake.
      await expect(page.getByRole('dialog')).toHaveCount(0)
      const anchor = (await trigger(page).boundingBox())!
      expect(Math.abs(panel.x - anchor.x), 'left-aligned to the trigger').toBeLessThan(2)
      expect(panel.y, 'hangs just below the trigger').toBeGreaterThanOrEqual(anchor.y + anchor.height)
      expect(panel.y - (anchor.y + anchor.height), 'and close under it').toBeLessThan(16)
    }
  })

  test('the open menu is the only blurred layer on screen', async ({ page }) => {
    await openSwitcher(page)
    await expect(page.locator('html')).toHaveAttribute('data-sheet', 'open')

    const blur = await page.evaluate((panelSel) => {
      const isBlurred = (el: Element) => {
        const b = getComputedStyle(el).backdropFilter
        return Boolean(b) && b !== 'none'
      }
      const blurred = [...document.querySelectorAll('*')].filter(isBlurred)
      const panel = document.querySelector(panelSel)
      return {
        total: blurred.length,
        nested: blurred.filter((el) => blurred.some((o) => o !== el && o.contains(el))).length,
        outside: blurred.filter((el) => !panel?.contains(el) && el !== panel).length,
        chrome: [...document.querySelectorAll('.panel, .card')].filter(isBlurred).length,
      }
    }, PANEL)

    // The budget is two stacked layers; an overlay is allowed exactly one, and
    // `:root[data-sheet="open"]` is the mechanism that drops the rest to solid.
    expect(blur.total, 'blurred layers while the menu is open').toBe(1)
    expect(blur.nested, 'blur inside blur').toBe(0)
    expect(blur.outside, 'blurred layers outside the menu').toBe(0)
    expect(blur.chrome, 'top bar / rail / tab bar should be solid').toBe(0)
  })

  test('really makes the page behind unfocusable, not merely hidden', async ({ page }) => {
    // jsdom parses `inert` and ignores it, so its unit test can only assert the
    // attribute is applied. This asks the question the attribute exists for.
    await openSwitcher(page)

    const outcome = await page.evaluate((panelSel) => {
      const outside = document.querySelector<HTMLElement>('main a[href], main button')
      if (!outside) return 'missing'
      outside.focus()
      if (document.activeElement === outside) return 'focus escaped to the inert page'
      return document.querySelector(panelSel)?.contains(document.activeElement)
        ? 'held inside the menu'
        : 'went to body'
    }, PANEL)

    expect(outcome).not.toBe('missing')
    expect(outcome).not.toBe('focus escaped to the inert page')
  })

  test('is openable, walkable and dismissible from the keyboard alone', async ({ page }) => {
    await trigger(page).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu', { name: 'Apps' })).toBeVisible()

    // Focus starts on the app you are in, so the first arrow is a real move.
    const focused = () =>
      page.evaluate(() => document.activeElement?.getAttribute('data-app') ?? null)
    expect(await focused()).toBe('learn')

    await page.keyboard.press('ArrowDown')
    expect(await focused()).toBe('diet')
    await page.keyboard.press('ArrowUp')
    expect(await focused()).toBe('learn')

    await page.keyboard.press('End')
    expect(await focused()).toBe(SETTINGS_ITEM.href)
    await page.keyboard.press('ArrowDown') // wraps
    expect(await focused()).toBe(NAV_APPS[0].id)
    await page.keyboard.press('Home')
    expect(await focused()).toBe(NAV_APPS[0].id)

    // The half that gets forgotten: Escape has to hand focus BACK, or a
    // keyboard user lands on the body at the top of the document.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(trigger(page)).toBeFocused()
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('leaves no tab stop behind once it is closed', async ({ page }) => {
    await openSwitcher(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(page.locator(ITEM)).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-sheet', 'open')
  })

  test('switches app, and the trigger renames itself', async ({ page }) => {
    await openSwitcher(page)
    await page.locator(`${ITEM}[data-app="ops"]`).click()
    await page.waitForURL('**/ops')

    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(trigger(page)).toHaveAttribute('data-app', 'ops')
    await expect(trigger(page)).toContainText('Ops')

    // And back out again from the app it just landed in — the round trip is the
    // thing a standalone PWA has no browser button for.
    await openSwitcher(page)
    await page.locator(`${ITEM}[data-app="today"]`).click()
    await page.waitForURL('**/today')
    await expect(trigger(page)).toContainText('Today')
  })

  test('reaches Settings, which belongs to no app', async ({ page }) => {
    await openSwitcher(page)
    await page.locator(`${ITEM}[href="${SETTINGS_ITEM.href}"]`).click()
    await page.waitForURL(`**${SETTINGS_ITEM.href}`)

    await openSwitcher(page)
    await expect(page.locator(`${ITEM}[aria-current="true"]`)).toHaveAttribute(
      'href',
      SETTINGS_ITEM.href,
    )
  })

  test('does not push the page sideways at 390px, open or closed', async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), 'horizontal overflow is the phone question')

    const overflow = async () =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

    let m = await overflow()
    expect(m.scrollWidth, 'closed').toBeLessThanOrEqual(m.clientWidth + 1)

    await openSwitcher(page)
    m = await overflow()
    expect(m.scrollWidth, 'open').toBeLessThanOrEqual(m.clientWidth + 1)

    // And the whole menu fits without becoming a scroll: six rows, not twenty.
    // This is the reason sections are not listed in it.
    const fits = await page.evaluate((sel) => {
      const panel = document.querySelector<HTMLElement>(sel)!
      const body = panel.querySelector<HTMLElement>('.overflow-y-auto')!
      return body.scrollHeight <= body.clientHeight + 1
    }, PANEL)
    expect(fits, 'the sheet should not need scrolling on a phone').toBe(true)
  })

  test('holds still under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(DEEP)
    await openSwitcher(page)

    // `globals.css` clamps every transition to 0.001ms under the preference.
    // Read the numbers rather than matching a string: a computed
    // `transition-duration` for several properties is a comma-separated list.
    const moving = await page.evaluate((sel) => {
      const ms = (value: string) =>
        value
          .split(',')
          .map((part) => part.trim())
          .map((part) => (part.endsWith('ms') ? parseFloat(part) : parseFloat(part) * 1000))
          .filter((n) => Number.isFinite(n))
      return [...document.querySelectorAll<HTMLElement>(`${sel} *`)]
        .filter((el) => ms(getComputedStyle(el).transitionDuration).some((n) => n > 1))
        .map((el) => `${el.tagName}.${el.className}`)
    }, PANEL)
    expect(moving, `animated under reduced motion: ${moving.join(' | ')}`).toEqual([])
  })
})
