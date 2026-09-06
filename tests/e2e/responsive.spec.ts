import { expect, test } from '@playwright/test'
import { ALL_ROUTES, seedDayOne } from './helpers'

/**
 * Mobile integrity at 390x844, across every route rather than one sample page.
 *
 * Horizontal overflow is the failure this guards: it never throws, it never
 * shows up in a unit test, and one long id or one un-wrapped code block is
 * enough to cause it. When it fails, the assertion names the offending element
 * so the fix is `overflow-x: auto` or `min-width: 0` on a known selector
 * rather than a hunt.
 */

test.describe('responsive integrity at 390px', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'this area is explicitly viewport-specific; the desktop sweep lives in routes.spec.ts',
    )
    await seedDayOne(page)
  })

  test('the viewport really is the one spec 11.2 pins', async ({ page }) => {
    await page.goto('/today')
    expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
  })

  for (const route of ALL_ROUTES) {
    test(`${route} does not scroll horizontally`, async ({ page }) => {
      await page.goto(route)
      // Let the client components hydrate; a skeleton cannot overflow.
      await expect(page.locator('h1')).toBeVisible()

      const report = await page.evaluate(() => {
        const root = document.documentElement
        const limit = root.clientWidth
        const offenders: string[] = []

        for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) continue
          const style = window.getComputedStyle(el)
          if (style.position === 'fixed') continue

          const overflowsSelf = el.scrollWidth > el.clientWidth + 1 && style.overflowX === 'visible'
          const pokesOut = rect.right > limit + 1
          if (!overflowsSelf && !pokesOut) continue

          const id = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${
            el.className && typeof el.className === 'string'
              ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
              : ''
          }`
          offenders.push(
            `${id} [right=${Math.round(rect.right)} scrollW=${el.scrollWidth} clientW=${el.clientWidth} overflowX=${style.overflowX}]`,
          )
          if (offenders.length >= 6) break
        }

        return {
          documentScrollWidth: root.scrollWidth,
          clientWidth: limit,
          bodyScrollWidth: document.body.scrollWidth,
          offenders,
        }
      })

      expect(
        report.documentScrollWidth,
        `${route} overflows by ${report.documentScrollWidth - report.clientWidth}px. Offenders: ${
          report.offenders.join(' | ') || 'none identified'
        }`,
      ).toBeLessThanOrEqual(report.clientWidth + 1)

      expect(report.bodyScrollWidth).toBeLessThanOrEqual(report.clientWidth + 1)
    })
  }

  for (const route of ALL_ROUTES) {
    test(`${route} keeps every tap target at 44px`, async ({ page }) => {
      await page.goto(route)
      await expect(page.locator('h1')).toBeVisible()

      const small = await page.evaluate(() => {
        const SELECTOR =
          'a[href], button, input, select, textarea, summary, [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"])'
        const MIN = 44
        const results: string[] = []

        for (const el of Array.from(document.querySelectorAll<HTMLElement>(SELECTOR))) {
          const style = window.getComputedStyle(el)
          if (style.visibility === 'hidden' || style.display === 'none') continue
          if ((el as HTMLInputElement).disabled) continue

          // WCAG 2.5.8 inline exception: a link inside a run of prose is sized
          // by the line box around it, and enlarging it would break the
          // paragraph. Everything laid out as its own block must meet the bar.
          if (style.display === 'inline') continue

          // A checkbox is deliberately small; the whole row is the hit target,
          // so measure the label that wraps it. Same idea for anything else
          // wrapped in a label.
          const target = el.closest('label') ?? el
          const rect = target.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) continue

          const smallest = Math.min(rect.width, rect.height)
          if (smallest < MIN - 0.5) {
            const id = `${el.tagName.toLowerCase()}${
              el.getAttribute('href') ? `[href=${el.getAttribute('href')}]` : ''
            }"${(el.textContent ?? '').trim().slice(0, 24)}"`
            results.push(`${id} → ${Math.round(rect.width)}x${Math.round(rect.height)}`)
          }
        }
        return results
      })

      expect(small, `${route} has tap targets under 44px: ${small.join(' | ')}`).toEqual([])
    })
  }

  test('the DSA problem rows stack rather than forcing a table scroll', async ({ page }) => {
    await page.goto('/dsa/arrays-hashing')
    const row = page.locator('li').filter({ has: page.locator('label[data-item-id]') }).first()
    const box = (await row.boundingBox())!
    expect(box.width).toBeLessThanOrEqual(390)

    // Stacked, not side by side: the row is taller than a single 44px line.
    expect(box.height).toBeGreaterThan(44)
  })

  test('the code template scrolls inside its own box, not the page', async ({ page }) => {
    await page.goto('/dsa/arrays-hashing')
    const pre = page.locator('pre.code-block')
    await expect(pre).toBeVisible()

    const info = await pre.evaluate((el) => ({
      overflowX: window.getComputedStyle(el).overflowX,
      width: el.getBoundingClientRect().width,
    }))
    expect(info.overflowX).toBe('auto')
    expect(info.width).toBeLessThanOrEqual(390)
  })
})
