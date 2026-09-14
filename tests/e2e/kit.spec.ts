import { expect, test, type Page } from '@playwright/test'

/**
 * The component gallery, exercised in a real browser.
 *
 * This file exists because of what the unit suite honestly cannot reach. The
 * primitives are covered by 725 jsdom tests, but jsdom has no layout engine, no
 * media queries, and no implementation of `inert` — it parses the attribute and
 * ignores it. So the unit tests assert that `inert` is *present*, which is not
 * the same as asserting that focus cannot escape, and they assert a `min-w-11`
 * class rather than a box that is actually 44 pixels wide.
 *
 * Every check below is one of those gaps, run against the rendered page where
 * the answer is real. `/kit` is the fixture: it already puts every primitive on
 * one page in its interesting states, so it is the cheapest place to ask.
 */

const KIT = '/kit'

/** Elements a finger or a keyboard can land on. */
const INTERACTIVE = 'button, a[href], input, select, textarea, [role="switch"], [role="tab"]'

async function openDialog(page: Page) {
  const trigger = page.getByRole('button', { name: 'Open dialog' })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Delete this log?' })).toBeVisible()
  return trigger
}

test.describe('component kit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(KIT)
  })

  test('every tap target is a real 44px box, not just a class that claims to be', async ({
    page,
  }) => {
    const small = await page.evaluate((sel) => {
      return [...document.querySelectorAll(sel)]
        .map((el) => {
          const r = el.getBoundingClientRect()
          const text = (el.textContent ?? '').trim().slice(0, 24)
          return { tag: el.tagName.toLowerCase(), text, w: Math.round(r.width), h: Math.round(r.height) }
        })
        // Zero-sized elements are inside a closed overlay, not on screen.
        .filter((b) => b.w > 0 && b.h > 0)
        .filter((b) => b.w < 44 || b.h < 44)
    }, INTERACTIVE)

    expect(small, `tap targets under 44px: ${JSON.stringify(small)}`).toEqual([])
  })

  test('nothing scrolls sideways', async ({ page }) => {
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })

  test('no blurred layer sits inside another blurred layer', async ({ page }) => {
    // The blur budget, measured rather than reasoned about. jsdom evaluates no
    // `backdrop-filter` at all, so this can only be asked of a real engine.
    const nested = await page.evaluate(() => {
      const blurred = [...document.querySelectorAll<HTMLElement>('*')].filter((el) => {
        const b = getComputedStyle(el).backdropFilter
        return Boolean(b) && b !== 'none'
      })
      return blurred
        .filter((el) => blurred.some((other) => other !== el && other.contains(el)))
        .map((el) => el.className)
    })
    expect(nested, `nested blurred layers: ${nested.join(' | ')}`).toEqual([])
  })

  test.describe('dialog', () => {
    test('takes focus on open and hands it back to the trigger on close', async ({ page }) => {
      // The handing-back half is the one implementations forget, and a keyboard
      // user who closes a dialog and lands at the top of the document notices
      // immediately.
      const trigger = await openDialog(page)

      const insideDialog = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement))
      })
      expect(insideDialog, 'focus should move into the dialog').toBe(true)

      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(trigger).toBeFocused()
    })

    test('really makes the page behind unfocusable, not merely hidden', async ({ page }) => {
      // jsdom parses `inert` and does nothing with it, so its unit test asserts
      // the attribute exists. Only a real browser can answer the question the
      // attribute is there to settle: can focus still reach the page behind?
      await openDialog(page)

      const escaped = await page.evaluate(() => {
        const outside = [...document.querySelectorAll<HTMLElement>('button')].find(
          (b) => b.textContent?.trim() === 'Show toast',
        )
        if (!outside) return 'missing'
        outside.focus()
        const dialog = document.querySelector('[role="dialog"]')
        return document.activeElement === outside
          ? 'focus escaped to the inert page'
          : dialog?.contains(document.activeElement)
            ? 'held inside the dialog'
            : 'went to body'
      })
      expect(escaped).not.toBe('focus escaped to the inert page')
      expect(escaped).not.toBe('missing')
    })

    test('traps Tab at both ends rather than only forwards', async ({ page }) => {
      await openDialog(page)
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab')
        const stillInside = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]')
          return Boolean(dialog?.contains(document.activeElement))
        })
        expect(stillInside, `focus left the dialog after ${i + 1} forward tabs`).toBe(true)
      }
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Shift+Tab')
        const stillInside = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]')
          return Boolean(dialog?.contains(document.activeElement))
        })
        expect(stillInside, `focus left the dialog after ${i + 1} backward tabs`).toBe(true)
      }
    })
  })

  test('an open sheet is the only blurred layer on screen', async ({ page }) => {
    await page.getByRole('button', { name: 'Open sheet' }).click()
    await expect(page.getByRole('dialog', { name: 'Add a meal' })).toBeVisible()

    await expect(page.locator('html')).toHaveAttribute('data-sheet', 'open')

    // The mechanism exists to keep at most two stacked blurs. Assert the effect,
    // not the attribute: panels and cards must have dropped their blur.
    const blurredOutside = await page.evaluate(() => {
      const sheet = document.querySelector('[role="dialog"]')
      return [...document.querySelectorAll<HTMLElement>('.panel, .card')]
        .filter((el) => !sheet?.contains(el))
        .filter((el) => {
          const b = getComputedStyle(el).backdropFilter
          return Boolean(b) && b !== 'none'
        }).length
    })
    expect(blurredOutside, 'glass behind the sheet should be solid while it is open').toBe(0)
  })

  test('tabs move with the arrow keys and keep a single stop in the tab order', async ({
    page,
  }) => {
    const tablist = page.getByRole('tablist', { name: 'Nutrition breakdown' })
    const tabs = tablist.getByRole('tab')

    await tabs.first().focus()
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(1)).toBeFocused()

    // Roving tabindex: exactly one tab is reachable with Tab, the rest are -1.
    const tabindexes = await tablist
      .getByRole('tab')
      .evaluateAll((els) => els.map((el) => el.getAttribute('tabindex')))
    expect(tabindexes.filter((t) => t !== '-1')).toHaveLength(1)
  })

  test('a toast announces in a live region without stealing focus', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Show toast' })
    await trigger.focus()
    await trigger.click()

    const status = page.getByRole('status').filter({ hasText: 'Meal logged.' })
    await expect(status).toBeVisible()
    // Focus must stay where the user put it — a toast that grabs focus
    // interrupts whatever they were doing.
    await expect(trigger).toBeFocused()
  })

  test('a tooltip opens on keyboard focus, not only on hover, and Escape dismisses it', async ({
    page,
  }) => {
    const trigger = page.getByRole('button', { name: 'What is BMI?' })
    await trigger.focus()
    await expect(page.getByText('Body mass index', { exact: false })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByText('Body mass index', { exact: false })).toBeHidden()
  })

  test('decoration stops under prefers-reduced-motion', async ({ page }) => {
    // jsdom has no media queries, so the reduced-motion branch of the stylesheet
    // is unreachable from the unit suite entirely.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(KIT)

    const animations = await page.evaluate(() =>
      [...document.querySelectorAll('.skeleton')].map((el) => getComputedStyle(el).animationName),
    )
    expect(animations.length).toBeGreaterThan(0)
    expect(animations.every((a) => a === 'none')).toBe(true)
  })
})
