import { expect, test } from '@playwright/test'
import {
  DAY_1,
  expectChecked,
  meterValue,
  navigateInApp,
  readStoredBlob,
  rowFor,
  seedDayOne,
  todayIso,
  waitForToday,
} from './helpers'

test.describe('progress persistence', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('a checked task survives a reload and lights the streak', async ({ page }) => {
    await page.goto('/today')
    await waitForToday(page)

    await expectChecked(page, DAY_1.firstProblemId, false)
    await expect(page.getByText('0 day streak')).toBeVisible()

    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, true)

    await page.reload()
    await waitForToday(page)

    await expectChecked(page, DAY_1.firstProblemId, true)
    await expect(page.getByText('1 day streak')).toBeVisible()

    // The top bar carries the same streak, zero-padded.
    await expect(page.locator('header').getByText('01d')).toBeVisible()

    const stored = await readStoredBlob(page)
    expect(stored.completed[DAY_1.firstProblemId]).toBe(todayIso())
  })

  test('unchecking removes the item from storage', async ({ page }) => {
    await page.goto('/today')
    await waitForToday(page)

    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, true)

    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, false)

    await page.reload()
    await waitForToday(page)
    await expectChecked(page, DAY_1.firstProblemId, false)

    const stored = await readStoredBlob(page)
    expect(stored.completed).not.toHaveProperty(DAY_1.firstProblemId)
  })

  test('a task checked on another page moves the Today meters', async ({ page }, testInfo) => {
    await page.goto('/today')
    await waitForToday(page)

    const dsaBefore = await meterValue(page, 'DSA')
    const allBefore = await meterValue(page, 'All tracks')

    await navigateInApp(page, testInfo, '/dsa')
    await page.getByRole('link', { name: /Arrays & Hashing/ }).click()
    await page.waitForURL('**/dsa/arrays-hashing')

    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, true)

    await navigateInApp(page, testInfo, '/today')
    await waitForToday(page)

    expect(await meterValue(page, 'DSA')).toBe(dsaBefore + DAY_1.dsaMinutesEach)
    expect(await meterValue(page, 'All tracks')).toBe(allBefore + DAY_1.dsaMinutesEach)
    await expectChecked(page, DAY_1.firstProblemId, true)
  })

  test('progress written in one tab is read by a fresh page load', async ({ page, context }) => {
    await page.goto('/today')
    await waitForToday(page)
    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, true)

    const second = await context.newPage()
    await second.goto('/today')
    await waitForToday(second)
    await expectChecked(second, DAY_1.firstProblemId, true)
    await second.close()
  })
})
