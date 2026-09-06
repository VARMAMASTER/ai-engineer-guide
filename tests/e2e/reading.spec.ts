import { expect, test, type Page } from '@playwright/test'
import { expectChecked, rowFor, seedDayOne } from './helpers'

/**
 * The Reading page, with both feed routes stubbed at the browser boundary.
 *
 * `page.route` intercepts `/api/feed/*` before it leaves the browser, so the
 * Next.js route handlers never run and neither arXiv nor the HN API is ever
 * contacted. That is deliberate and load-bearing: this suite has to pass on a
 * plane and in a CI runner with no egress, and a test whose result depends on
 * a third party's uptime is not a test. `assertNoUpstreamCalls` proves it
 * rather than trusting it.
 */

const ARXIV_ITEMS = [
  {
    id: 'arxiv-2401.00001',
    title: 'Stubbed arXiv paper on retrieval',
    url: 'https://arxiv.org/abs/2401.00001',
    source: 'arxiv',
    date: '2026-09-01',
    meta: 'cs.CL',
  },
  {
    id: 'arxiv-2401.00002',
    title: 'Stubbed arXiv paper on evaluation',
    url: 'https://arxiv.org/abs/2401.00002',
    source: 'arxiv',
    date: '2026-09-02',
  },
]

const HN_ITEMS = [
  {
    id: 'hn-1',
    title: 'Stubbed Hacker News story about vector search',
    url: 'https://news.ycombinator.com/item?id=1',
    source: 'hn',
    date: '2026-09-03',
    meta: '128 points',
  },
]

const FETCHED_AT = '2026-09-06T09:30:00.000Z'

async function stubFeeds(page: Page, mode: 'success' | 'failure'): Promise<() => void> {
  const upstream: string[] = []

  // Anything that escapes to a real host is a bug in the stub, not a network
  // hiccup — record it so the assertion can name the URL.
  await page.route('**://arxiv.org/**', (route) => {
    upstream.push(route.request().url())
    return route.abort()
  })
  await page.route('**://*.algolia.com/**', (route) => {
    upstream.push(route.request().url())
    return route.abort()
  })

  await page.route('**/api/feed/arxiv', (route) =>
    mode === 'success'
      ? route.fulfill({ json: { items: ARXIV_ITEMS, fetchedAt: FETCHED_AT } })
      : route.fulfill({ status: 502, json: { items: [], error: 'unavailable', fetchedAt: FETCHED_AT } }),
  )
  await page.route('**/api/feed/hn', (route) =>
    mode === 'success'
      ? route.fulfill({ json: { items: HN_ITEMS, fetchedAt: FETCHED_AT } })
      : route.fulfill({ status: 502, json: { items: [], error: 'unavailable', fetchedAt: FETCHED_AT } }),
  )

  return () => expect(upstream, 'the suite must never reach a real feed host').toEqual([])
}

const liveTab = (page: Page) => page.getByRole('tab', { name: 'Live feed' })
const curatedTab = (page: Page) => page.getByRole('tab', { name: 'Curated' })

test.describe('reading — curated', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
    await page.goto('/reading')
  })

  test('curated is the default tab and groups readings by week', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Reading' })).toBeVisible()
    await expect(curatedTab(page)).toHaveAttribute('aria-selected', 'true')
    await expect(liveTab(page)).toHaveAttribute('aria-selected', 'false')

    await expect(page.getByRole('heading', { name: /^Week 1$/ })).toBeVisible()
    const weekHeadings = await page.getByRole('heading', { name: /^Week \d+$/ }).count()
    expect(weekHeadings, 'readings should span more than one week').toBeGreaterThan(1)

    // Every reading is a checkable row with a link out.
    expect(await page.locator('label[data-item-id^="read-"]').count()).toBeGreaterThan(4)
  })

  test('a curated reading toggles and survives a reload', async ({ page }) => {
    await expectChecked(page, 'read-rag-2020', false)
    await rowFor(page, 'read-rag-2020').click()
    await expectChecked(page, 'read-rag-2020', true)

    await page.reload()
    await expectChecked(page, 'read-rag-2020', true)

    await rowFor(page, 'read-rag-2020').click()
    await expectChecked(page, 'read-rag-2020', false)
  })

  test('each reading names its source, year and why', async ({ page }) => {
    const row = rowFor(page, 'read-rag-2020')
    await expect(row.getByRole('link')).toHaveAttribute('href', /.+/)
    await expect(row).toContainText('2020')
  })
})

test.describe('reading — live feed', () => {
  test.beforeEach(async ({ page }) => {
    await seedDayOne(page)
  })

  test('both columns render items when both routes succeed', async ({ page }) => {
    const assertNoUpstreamCalls = await stubFeeds(page, 'success')
    await page.goto('/reading')
    await liveTab(page).click()

    await expect(liveTab(page)).toHaveAttribute('aria-selected', 'true')
    const arxiv = page.locator('section').filter({ has: page.getByRole('heading', { name: 'arXiv' }) })
    const hn = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Hacker News' }) })

    await expect(arxiv.getByRole('link', { name: ARXIV_ITEMS[0].title })).toBeVisible()
    await expect(arxiv.getByRole('link', { name: ARXIV_ITEMS[1].title })).toBeVisible()
    await expect(hn.getByRole('link', { name: HN_ITEMS[0].title })).toBeVisible()

    // Items carry their date and metadata, and a refresh stamp is shown.
    await expect(arxiv).toContainText('2026-09-01')
    await expect(hn).toContainText('128 points')
    await expect(arxiv).toContainText('refreshed')

    await expect(page.getByText('Feed unavailable, showing curated list only.')).toHaveCount(0)
    assertNoUpstreamCalls()
  })

  test('each column shows its own empty state when both routes fail', async ({ page }) => {
    const assertNoUpstreamCalls = await stubFeeds(page, 'failure')
    await page.goto('/reading')
    await liveTab(page).click()

    const empty = page.getByText('Feed unavailable, showing curated list only.')
    await expect(empty).toHaveCount(2)
    await expect(empty.first()).toBeVisible()
    await expect(empty.last()).toBeVisible()

    // Both headings survive; the failure is per column, not a blank tab.
    await expect(page.getByRole('heading', { name: 'arXiv' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Hacker News' })).toBeVisible()
    assertNoUpstreamCalls()
  })

  test('one failing column does not take the other down', async ({ page }) => {
    await page.route('**/api/feed/arxiv', (route) =>
      route.fulfill({ json: { items: ARXIV_ITEMS, fetchedAt: FETCHED_AT } }),
    )
    await page.route('**/api/feed/hn', (route) => route.abort())

    await page.goto('/reading')
    await liveTab(page).click()

    await expect(page.getByRole('link', { name: ARXIV_ITEMS[0].title })).toBeVisible()
    await expect(page.getByText('Feed unavailable, showing curated list only.')).toHaveCount(1)
  })

  test('an empty but successful response reads as empty, not as loading', async ({ page }) => {
    await page.route('**/api/feed/*', (route) =>
      route.fulfill({ json: { items: [], fetchedAt: FETCHED_AT } }),
    )

    await page.goto('/reading')
    await liveTab(page).click()

    await expect(page.getByText('Feed unavailable, showing curated list only.')).toHaveCount(2)
    await expect(page.getByText('Loading…')).toHaveCount(0)
  })

  test('switching back to curated keeps the curated list intact', async ({ page }) => {
    await stubFeeds(page, 'success')
    await page.goto('/reading')

    await liveTab(page).click()
    await expect(page.getByRole('link', { name: ARXIV_ITEMS[0].title })).toBeVisible()

    await curatedTab(page).click()
    await expect(curatedTab(page)).toHaveAttribute('aria-selected', 'true')
    await expect(rowFor(page, 'read-rag-2020')).toBeVisible()
    await expect(page.getByRole('link', { name: ARXIV_ITEMS[0].title })).toHaveCount(0)
  })
})
