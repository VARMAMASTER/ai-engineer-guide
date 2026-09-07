import { expect, test } from '@playwright/test'
import { seedDayOne } from './helpers'

/** The story-draft store's own localStorage key, separate from the progress blob. */
const STORY_KEY = 'aeg.stories.v1'

test.describe('behavioural', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
    await page.goto('/behavioural')
    await expect(page.getByRole('heading', { level: 1, name: 'Behavioural' })).toBeVisible()
  })

  test('opens on the principles bank with every weak answer on screen', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Principles/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByTestId('weak-answer')).toHaveCount(29)
  })

  test('a question hides its probes until the reveal is pressed', async ({ page }) => {
    await page.getByRole('tab', { name: /Questions/ }).click()

    const first = page.getByRole('button', { name: /Reveal the follow-ups/ }).first()
    await expect(first).toHaveAttribute('aria-expanded', 'false')
    await expect(
      page.getByText('this is where the round is decided', { exact: false }),
    ).toHaveCount(0)

    await first.click()
    await expect(page.getByText('this is where the round is decided', { exact: false })).toHaveCount(
      1,
    )
  })

  /**
   * The one thing a drafting pad has to do. A story the user cannot get back
   * after a reload is worse than no drafting pad at all, so this drives the
   * real textarea and then reloads the document rather than asserting on the
   * store.
   */
  test('a story draft survives a reload', async ({ page }) => {
    await page.getByRole('tab', { name: /Stories/ }).click()

    const card = page.locator('[data-story-id]').first()
    const storyId = await card.getAttribute('data-story-id')
    await card.getByRole('button', { name: /Draft this story/ }).click()

    const situation = card.locator('textarea[data-field="situation"]')
    await situation.fill('The nightly index rebuild silently dropped 4% of documents.')

    await expect(card).toHaveAttribute('data-drafted', 'true')

    await page.reload()
    await page.getByRole('tab', { name: /Stories/ }).click()

    const again = page.locator(`[data-story-id="${storyId}"]`)
    await expect(again).toHaveAttribute('data-drafted', 'true')
    await again.getByRole('button', { name: /Continue this draft/ }).click()
    await expect(again.locator('textarea[data-field="situation"]')).toHaveValue(
      'The nightly index rebuild silently dropped 4% of documents.',
    )
  })

  test('story drafts are stored under their own key, never inside the progress blob', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: /Stories/ }).click()
    const card = page.locator('[data-story-id]').first()
    await card.getByRole('button', { name: /Draft this story/ }).click()
    await card.locator('textarea[data-field="task"]').fill('Find where the documents went.')

    const stored = await page.evaluate((k) => window.localStorage.getItem(k), STORY_KEY)
    expect(stored, 'drafts should be persisted').not.toBeNull()
    expect(JSON.parse(stored!).state.drafts).toBeTruthy()

    const progress = await page.evaluate(
      (k) => window.localStorage.getItem(k),
      'aeg.progress.v1',
    )
    expect(JSON.parse(progress!).state.drafts).toBeUndefined()
  })

  test('drafting a story closes the coverage gap it was written for', async ({ page }) => {
    const readout = page.getByTestId('uncovered-count')
    await expect(readout).toHaveText('29 of 29')

    await page.getByRole('tab', { name: /Stories/ }).click()
    const card = page.locator('[data-story-id]').first()
    await card.getByRole('button', { name: /Draft this story/ }).click()
    await card.locator('textarea[data-field="situation"]').fill('A real thing that happened.')

    await expect(readout).not.toHaveText('29 of 29')
  })

  test('the coverage view stays on screen whichever bank is open', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Which principles can you actually answer?' })
    await expect(heading).toBeVisible()
    await page.getByRole('tab', { name: /Questions/ }).click()
    await expect(heading).toBeVisible()
  })
})
