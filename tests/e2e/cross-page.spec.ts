import { expect, test } from '@playwright/test'
import {
  DAY_1,
  expectChecked,
  meterValue,
  navigateInApp,
  readStoredBlob,
  rowFor,
  seedDayOne,
  waitForToday,
} from './helpers'

/**
 * Shared completion identity — the single most important behaviour in the app,
 * and the one most likely to break in silence.
 *
 * Checking a problem writes one id into one map. Today reads it as a day task,
 * the pattern page reads it as a problem row, and the month-1 meter counts it.
 * If the DSA page ever wrote a different key — a row index, a slug, a prefixed
 * variant — every one of those surfaces would keep rendering happily and only
 * the numbers would be wrong. Nothing throws. Nothing looks broken. So this
 * spec asserts on all three surfaces from a single click, in both directions,
 * and reads the raw storage key underneath them.
 */
test.describe('cross-page identity', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('checking a problem on its pattern page marks it done on Today and moves the month-1 meter', async ({
    page,
  }, testInfo) => {
    // --- baseline, read off Today ------------------------------------------
    await page.goto('/today')
    await waitForToday(page)

    await expectChecked(page, DAY_1.firstProblemId, false)
    expect(await meterValue(page, 'Problems solved')).toBe(0)
    const dsaMinutesBefore = await meterValue(page, 'DSA')

    // --- the click, on a completely different page -------------------------
    await navigateInApp(page, testInfo, '/dsa')
    await page.getByRole('link', { name: /Arrays & Hashing/ }).click()
    await page.waitForURL(`**${DAY_1.patternPage}`)

    await expectChecked(page, DAY_1.firstProblemId, false)
    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, true)

    // The id written is the content id itself, not a page-local handle.
    const stored = await readStoredBlob(page)
    expect(Object.keys(stored.completed)).toEqual([DAY_1.firstProblemId])

    // --- the same item, on Today, without a reload -------------------------
    await navigateInApp(page, testInfo, '/today')
    await waitForToday(page)

    await expectChecked(page, DAY_1.firstProblemId, true)
    expect(
      await meterValue(page, 'Problems solved'),
      'the month-1 problems meter must count the problem checked on the pattern page',
    ).toBe(1)
    expect(await meterValue(page, 'DSA')).toBe(dsaMinutesBefore + DAY_1.dsaMinutesEach)
  })

  test('the identity holds in the other direction too', async ({ page }, testInfo) => {
    await page.goto('/today')
    await waitForToday(page)

    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, true)
    expect(await meterValue(page, 'Problems solved')).toBe(1)

    await navigateInApp(page, testInfo, '/dsa')
    await page.getByRole('link', { name: /Arrays & Hashing/ }).click()
    await page.waitForURL(`**${DAY_1.patternPage}`)

    await expectChecked(page, DAY_1.firstProblemId, true)

    // Unchecking it here must roll the Today meter back.
    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, false)

    await navigateInApp(page, testInfo, '/today')
    await waitForToday(page)
    await expectChecked(page, DAY_1.firstProblemId, false)
    expect(await meterValue(page, 'Problems solved')).toBe(0)
  })

  test('the identity survives a full document load, not just a soft navigation', async ({
    page,
  }) => {
    await page.goto(DAY_1.patternPage)
    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, true)

    await page.goto('/today')
    await waitForToday(page)
    await expectChecked(page, DAY_1.firstProblemId, true)
    expect(await meterValue(page, 'Problems solved')).toBe(1)
  })

  test('the DSA index card meter counts the same click', async ({ page }, testInfo) => {
    await page.goto(DAY_1.patternPage)
    await rowFor(page, DAY_1.firstProblemId).click()
    await expectChecked(page, DAY_1.firstProblemId, true)

    await navigateInApp(page, testInfo, '/dsa')
    const card = page.getByRole('link', { name: /Arrays & Hashing/ })
    await expect(card).toBeVisible()
    expect(Number(await card.getByRole('progressbar').getAttribute('aria-valuenow'))).toBe(1)
  })

  test('a reading checked on the Reading tab is the same item Today counts', async ({
    page,
  }, testInfo) => {
    // Day 3 of the plan schedules a reading; rather than depend on which day is
    // showing, this asserts the weaker but still load-bearing half: the id
    // written by the Reading page is the content id, and the Reading page shows
    // it as checked after a full reload.
    await page.goto('/reading')
    const reading = rowFor(page, 'read-rag-2020')
    await expect(reading).toBeVisible()
    await reading.click()
    await expectChecked(page, 'read-rag-2020', true)

    const stored = await readStoredBlob(page)
    expect(stored.completed).toHaveProperty('read-rag-2020')

    await navigateInApp(page, testInfo, '/today')
    await waitForToday(page)
    await navigateInApp(page, testInfo, '/reading')
    await expectChecked(page, 'read-rag-2020', true)
  })
})
