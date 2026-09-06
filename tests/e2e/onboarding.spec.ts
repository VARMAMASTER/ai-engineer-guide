import { expect, test } from '@playwright/test'
import { DAY_1, isMonday, readStoredBlob, waitForToday } from './helpers'

/**
 * First run. No storage is seeded here on purpose: this is the only spec that
 * exercises the app exactly as a stranger meets it.
 */
test.describe('onboarding', () => {
  test('no start date shows the setup card and the top bar prompt', async ({ page }) => {
    await page.goto('/today')

    await expect(page.getByRole('heading', { level: 1, name: 'Set your start date' })).toBeVisible()
    await expect(page.getByText('Day 1 must be a Monday so the weekly rhythm lines up.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'SET START DATE' })).toBeVisible()

    // Nothing is scheduled yet, so no task rows exist at all.
    await expect(page.locator('label[data-item-id]')).toHaveCount(0)
  })

  test('both offered dates are Mondays, a week apart', async ({ page }) => {
    await page.goto('/today')

    const thisWeek = page.getByRole('button', { name: /This week/ })
    const nextWeek = page.getByRole('button', { name: /Next week/ })
    await expect(thisWeek).toBeVisible()
    await expect(nextWeek).toBeVisible()

    const readIso = async (label: string) => {
      const text = await page.getByRole('button', { name: new RegExp(label) }).innerText()
      const iso = text.match(/\d{4}-\d{2}-\d{2}/)?.[0]
      expect(iso, `${label} button should show an ISO date`).toBeTruthy()
      return iso!
    }

    const a = await readIso('This week')
    const b = await readIso('Next week')

    expect(isMonday(a), `${a} should be a Monday`).toBe(true)
    expect(isMonday(b), `${b} should be a Monday`).toBe(true)
    expect(Date.parse(b) - Date.parse(a)).toBe(7 * 86_400_000)
  })

  test('picking a start date snaps to Monday and renders day 1', async ({ page }) => {
    await page.goto('/today')

    // The next Monday is always in the future, so the day counter lands on 1
    // whatever weekday the suite happens to run on.
    await page.getByRole('button', { name: /Next week/ }).click()

    await waitForToday(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Day 1 of 180' })).toBeVisible()
    await expect(page.getByText(/^Week 1/)).toBeVisible()

    for (const name of DAY_1.problems) {
      await expect(page.locator('label[data-item-id]').filter({ hasText: name })).toBeVisible()
    }
    await expect(page.getByRole('heading', { name: 'DSA', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'System design' })).toBeVisible()

    const stored = await readStoredBlob(page)
    expect(stored.startDate).not.toBeNull()
    expect(isMonday(stored.startDate!), `${stored.startDate} should be a Monday`).toBe(true)
  })

  test('the setup card does not come back after a reload', async ({ page }) => {
    await page.goto('/today')
    await page.getByRole('button', { name: /Next week/ }).click()
    await waitForToday(page)

    await page.reload()
    await waitForToday(page)

    await expect(page.getByRole('heading', { level: 1, name: 'Set your start date' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: 'Day 1 of 180' })).toBeVisible()
  })
})
