import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

/** The raw key the zustand persist middleware writes under. */
export const STORAGE_KEY = 'aeg.progress.v1'

/**
 * Every URL the app serves a page at: the nine static routes plus one concrete
 * example of each of the four dynamic segments. Thirteen in total, which is the
 * set spec section 11.2 requires the route and responsive specs to walk.
 */
export const STATIC_ROUTES = [
  '/',
  '/today',
  '/roadmap',
  '/dsa',
  '/system-design',
  '/ai-ml',
  '/projects',
  '/reading',
  '/settings',
] as const

export const DYNAMIC_ROUTES = [
  '/dsa/arrays-hashing',
  '/system-design/caching',
  '/ai-ml/transformers',
  '/projects/rag',
] as const

export const ALL_ROUTES = [...STATIC_ROUTES, ...DYNAMIC_ROUTES]

/** Day 1 of the plan, straight out of `content/plan.ts`. */
export const DAY_1 = {
  problems: ['Contains Duplicate', 'Valid Anagram'],
  firstProblemId: 'dsa-217-contains-duplicate',
  firstProblemUrl: 'https://leetcode.com/problems/contains-duplicate/',
  patternPage: '/dsa/arrays-hashing',
  studyLabel: 'Load balancing and API gateways',
  dsaMinutesEach: 30,
}

export type ThemeChoice = 'dark' | 'light' | 'system'

export interface Seed {
  startDate?: string | null
  completed?: Record<string, string>
  hours?: Record<string, number>
  theme?: ThemeChoice
}

/** Local calendar date, matching `lib/date.ts` — the test process and the browser share a clock. */
export function todayIso(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

export function isMonday(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1
}

/**
 * The exact envelope zustand's persist middleware writes: the partialized blob
 * under `state`, with the middleware's own migration version alongside it. The
 * blocking theme script in `<head>` reads this shape directly, so the tests
 * have to produce it verbatim rather than driving the UI to build it.
 */
export function envelope(seed: Seed = {}): string {
  return JSON.stringify({
    state: {
      version: 1,
      startDate: seed.startDate ?? null,
      completed: seed.completed ?? {},
      hours: seed.hours ?? {},
      settings: { theme: seed.theme ?? 'dark' },
    },
    version: 0,
  })
}

/**
 * Install progress state before a single line of app script runs.
 *
 * Init scripts re-run on every document, so this seeds exactly once per tab and
 * then gets out of the way — otherwise a `reload()` would quietly restore the
 * starting blob and every persistence assertion would be testing the seed
 * rather than the store. The latch lives in sessionStorage, which survives a
 * reload and dies with the tab.
 */
export async function seedProgress(page: Page, seed: Seed = {}): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      const latch = '__aeg_e2e_seeded__'
      if (window.sessionStorage.getItem(latch)) return
      window.sessionStorage.setItem(latch, '1')
      window.localStorage.setItem(key, value)
    },
    [STORAGE_KEY, envelope(seed)] as const,
  )
}

/** Seed a start date of today, so Today renders day 1 of the plan. */
export async function seedDayOne(page: Page, extra: Seed = {}): Promise<void> {
  await seedProgress(page, { startDate: todayIso(), ...extra })
}

export async function readStoredBlob(page: Page): Promise<{
  startDate: string | null
  completed: Record<string, string>
  settings: { theme: ThemeChoice }
}> {
  const raw = await page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY)
  expect(raw, 'progress blob should exist in localStorage').not.toBeNull()
  return JSON.parse(raw!).state
}

/** True when the current project is the 390x844 phone. */
export function isMobile(testInfo: TestInfo): boolean {
  return testInfo.project.name === 'mobile'
}

/**
 * Navigate the way a user does — through the shell — rather than with a fresh
 * document load. Cross-page state sharing is only interesting if it survives a
 * client-side transition, and a `goto` would hide a store that only agrees
 * because it re-read storage.
 */
export const SECONDARY_HREFS = ['/ai-ml', '/reading', '/settings']

export async function navigateInApp(page: Page, testInfo: TestInfo, href: string): Promise<void> {
  if (isMobile(testInfo)) {
    // The three secondary sections have no tab-bar slot; they live in the sheet.
    if (SECONDARY_HREFS.includes(href)) {
      await page.getByTestId('more-tab').click()
      await expect(page.getByTestId('more-sheet')).toBeVisible()
      await page.getByTestId('more-sheet').locator(`a[href="${href}"]`).click()
    } else {
      await page.getByTestId('bottom-nav').locator(`a[href="${href}"]`).click()
    }
  } else {
    await page.getByTestId('side-nav').locator(`a[href="${href}"]`).click()
  }
  await page.waitForURL(`**${href}`)
}

/** The Today page is hydrated once its heading (or the setup card) is on screen. */
export async function waitForToday(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1, name: /Day \d+ of 180|Set your start date/ }),
  ).toBeVisible()
}

/** A meter's completed value, read from the progressbar the label names. */
export async function meterValue(page: Page, label: string): Promise<number> {
  const bar = page.getByRole('progressbar', { name: label })
  await expect(bar).toBeVisible()
  return Number(await bar.getAttribute('aria-valuenow'))
}

/** The completion row for a given content id, wherever it is rendered. */
export function rowFor(page: Page, itemId: string): Locator {
  return page.locator(`label[data-item-id="${itemId}"]`)
}

export async function expectChecked(page: Page, itemId: string, checked: boolean): Promise<void> {
  const row = rowFor(page, itemId)
  await expect(row).toHaveAttribute('data-completed', checked ? 'true' : 'false')
  await expect(row.locator('input[type="checkbox"]')).toBeChecked({ checked })
}

/* ---------------------------------------------------------------------------
 * Rendered-pixel colour sampling
 *
 * The palette is not the page. A previous contrast test in this project passed
 * while the app rendered white, because it read CSS variables instead of what
 * the browser actually painted. Everything below works from a screenshot: the
 * PNG is decoded inside the browser onto a canvas and averaged, so the value
 * returned is composited glass, ground wash, backdrop blur and all.
 * ------------------------------------------------------------------------- */

export type Rgb = [number, number, number]

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export async function sampleAverageColor(page: Page, box: Box): Promise<Rgb> {
  const clip = {
    x: Math.max(0, Math.round(box.x)),
    y: Math.max(0, Math.round(box.y)),
    width: Math.max(1, Math.round(box.width)),
    height: Math.max(1, Math.round(box.height)),
  }
  const png = await page.screenshot({ clip, animations: 'disabled', scale: 'device' })
  return page.evaluate(async (b64) => {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    let r = 0
    let g = 0
    let bl = 0
    const n = data.length / 4
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]
      g += data[i + 1]
      bl += data[i + 2]
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)] as [number, number, number]
  }, png.toString('base64'))
}

export function parseRgb(value: string): Rgb {
  const m = value.match(/-?[\d.]+/g)
  if (!m || m.length < 3) throw new Error(`Cannot parse colour: ${value}`)
  return [Number(m[0]), Number(m[1]), Number(m[2])]
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export const rgbText = (c: Rgb) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`
