import { promises as fs } from 'node:fs'
import { expect, test } from '@playwright/test'
import {
  DAY_1,
  expectChecked,
  meterValue,
  navigateInApp,
  readStoredBlob,
  seedProgress,
  todayIso,
  waitForToday,
} from './helpers'

const SECOND_ID = 'dsa-242-valid-anagram'

test.describe('export, import and reset', () => {
  test.beforeEach(async ({ page }) => {
    await seedProgress(page, {
      startDate: todayIso(),
      completed: { [DAY_1.firstProblemId]: todayIso(), [SECOND_ID]: todayIso() },
    })
  })

  test('export downloads a file named for today, holding everything checked', async ({
    page,
  }, testInfo) => {
    await page.goto('/settings')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export progress' }).click(),
    ])

    expect(download.suggestedFilename()).toBe(`ai-engineer-guide-progress-${todayIso()}.json`)

    const file = testInfo.outputPath('exported.json')
    await download.saveAs(file)
    const blob = JSON.parse(await fs.readFile(file, 'utf8'))

    // Blob version 2 added the `revision` map (revision mode's confidence).
    expect(blob.version).toBe(2)
    expect(blob.startDate).toBe(todayIso())
    expect(Object.keys(blob.completed).sort()).toEqual([DAY_1.firstProblemId, SECOND_ID].sort())
    expect(blob.settings.theme).toBe('dark')
  })

  test('reset clears everything, and re-importing the export restores it', async ({
    page,
  }, testInfo) => {
    await page.goto('/settings');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export progress' }).click(),
    ])
    const file = testInfo.outputPath('roundtrip.json')
    await download.saveAs(file)

    // --- reset -------------------------------------------------------------
    await page.getByRole('button', { name: 'Reset progress' }).click()
    await expect(page.getByText('Are you sure?')).toBeVisible()
    await page.getByRole('button', { name: 'Yes, erase everything' }).click()

    await expect(page.getByText('Are you sure?')).toHaveCount(0)
    expect((await readStoredBlob(page)).startDate).toBeNull()

    await navigateInApp(page, testInfo, '/today')
    await expect(page.getByRole('heading', { level: 2, name: 'Set your start date' })).toBeVisible()

    // --- import ------------------------------------------------------------
    await navigateInApp(page, testInfo, '/settings')
    await page.getByLabel('Import progress file').setInputFiles(file)
    await expect(page.locator('p[role="status"]')).toHaveText('Progress imported.')

    const restored = await readStoredBlob(page)
    expect(restored.startDate).toBe(todayIso())
    expect(Object.keys(restored.completed).sort()).toEqual([DAY_1.firstProblemId, SECOND_ID].sort())

    await navigateInApp(page, testInfo, '/today')
    await waitForToday(page)
    await expectChecked(page, DAY_1.firstProblemId, true)
    await expectChecked(page, SECOND_ID, true)
    expect(await meterValue(page, 'Problems solved')).toBe(2)
  })

  test('a malformed file shows an alert and changes nothing', async ({ page }, testInfo) => {
    await page.goto('/settings')
    const before = await readStoredBlob(page)

    const broken = testInfo.outputPath('broken.json')
    await fs.writeFile(broken, '{"version": 1, "completed": ', 'utf8')

    await page.getByLabel('Import progress file').setInputFiles(broken)
    await expect(page.locator('p[role="alert"]')).toBeVisible()
    await expect(page.locator('p[role="status"]')).toHaveCount(0)

    expect(await readStoredBlob(page)).toEqual(before)

    await navigateInApp(page, testInfo, '/today')
    await waitForToday(page)
    await expectChecked(page, DAY_1.firstProblemId, true)
    expect(await meterValue(page, 'Problems solved')).toBe(2)
  })

  test('a well-formed file that fails the schema is rejected by name', async ({
    page,
  }, testInfo) => {
    await page.goto('/settings')
    const before = await readStoredBlob(page)

    const bad = testInfo.outputPath('bad-schema.json')
    await fs.writeFile(
      bad,
      JSON.stringify({ version: 1, startDate: 'last monday', completed: {}, hours: {}, settings: { theme: 'dark' } }),
      'utf8',
    )

    await page.getByLabel('Import progress file').setInputFiles(bad)
    await expect(page.locator('p[role="alert"]')).toContainText('startDate')

    expect(await readStoredBlob(page)).toEqual(before)
  })

  test('a file from a newer app version is refused rather than half-applied', async ({
    page,
  }, testInfo) => {
    await page.goto('/settings')
    const before = await readStoredBlob(page)

    const future = testInfo.outputPath('future.json')
    await fs.writeFile(
      future,
      JSON.stringify({ version: 99, startDate: null, completed: {}, hours: {}, settings: { theme: 'dark' } }),
      'utf8',
    )

    await page.getByLabel('Import progress file').setInputFiles(future)
    await expect(page.locator('p[role="alert"]')).toContainText('newer version')

    expect(await readStoredBlob(page)).toEqual(before)
  })
})
