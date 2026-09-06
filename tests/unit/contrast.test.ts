import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Contrast has to survive the blur. This reads the real token values out of
 * globals.css, composites a Panel over the busiest point of the Ground (the
 * centre of the warm radial wash, where the ground is furthest from its base),
 * and asserts the result still clears WCAG AA in both themes.
 *
 * If a fill is ever too transparent to hold this, the fix is to raise the fill.
 */
const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')

type RGB = [number, number, number]

function token(name: string): string {
  const m = CSS.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!m) throw new Error(`token --${name} not found in globals.css`)
  return m[1].trim()
}

function parseColor(value: string): { rgb: RGB; a: number } {
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: 1 }
  }
  const rgba = value.match(/^rgba?\(([^)]+)\)$/i)
  if (rgba) {
    const p = rgba[1].split(',').map((s) => Number(s.trim()))
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }
  }
  throw new Error(`cannot parse colour: ${value}`)
}

function over(top: string, bottom: RGB): RGB {
  const { rgb, a } = parseColor(top)
  return [0, 1, 2].map((i) => bottom[i] + (rgb[i] - bottom[i]) * a) as RGB
}

function luminance([r, g, b]: RGB): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

function ratio(fg: string, bg: RGB): number {
  const a = luminance(parseColor(fg).rgb)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** Panel fill over the busiest ground: base + the warm wash at full strength. */
function panelOverBusiestGround(prefix: 'd' | 'l'): RGB {
  const base = parseColor(token(`${prefix}-ground`)).rgb
  const busiest = over(token(`${prefix}-ground-wash-warm`), base)
  return over(token(`${prefix}-panel`), busiest)
}

const round = (n: number) => Math.round(n * 100) / 100

describe.each([
  ['dark', 'd'],
  ['light', 'l'],
] as const)('%s theme, text on a Panel over the busiest Ground', (_name, prefix) => {
  const panel = panelOverBusiestGround(prefix)

  it('clears 4.5:1 for body text', () => {
    expect(round(ratio(token(`${prefix}-text`), panel))).toBeGreaterThanOrEqual(4.5)
  })

  it('clears 4.5:1 for muted text', () => {
    expect(round(ratio(token(`${prefix}-text-muted`), panel))).toBeGreaterThanOrEqual(4.5)
  })

  it('clears 3:1 for the accent, which only ever carries large text and fills', () => {
    expect(round(ratio(token(`${prefix}-accent`), panel))).toBeGreaterThanOrEqual(3)
  })

  it('clears 4.5:1 for text sitting on an accent fill', () => {
    const accent = parseColor(token(`${prefix}-accent`)).rgb
    expect(round(ratio(token(`${prefix}-accent-contrast`), accent))).toBeGreaterThanOrEqual(4.5)
  })

  it('clears 4.5:1 for status colours', () => {
    for (const t of ['positive', 'warning', 'danger']) {
      expect(round(ratio(token(`${prefix}-${t}`), panel)), t).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('clears 4.5:1 for code, which is solid rather than glass', () => {
    const code = parseColor(token(`${prefix}-code`)).rgb
    expect(round(ratio(token(`${prefix}-text`), code))).toBeGreaterThanOrEqual(4.5)
    expect(round(ratio(token(`${prefix}-text-muted`), code))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the ground away from pure black and pure white', () => {
    const g = parseColor(token(`${prefix}-ground`)).rgb
    expect(g.every((c) => c > 0 && c < 255)).toBe(true)
  })
})

describe('theme separation', () => {
  it('gives each theme its own accent step', () => {
    expect(token('d-accent')).not.toBe(token('l-accent'))
  })

  it('gives the light theme a stronger panel border than the dark theme', () => {
    expect(parseColor(token('l-panel-border')).a).toBeGreaterThan(
      parseColor(token('d-panel-border')).a,
    )
  })
})

describe('faint text', () => {
  it('still clears 4.5:1 in both themes, because it carries real numbers', () => {
    for (const p of ['d', 'l'] as const) {
      const panel = panelOverBusiestGround(p)
      expect(round(ratio(token(`${p}-text-faint`), panel)), p).toBeGreaterThanOrEqual(4.5)
    }
  })
})

/**
 * The ratios above are only meaningful if the Ground token is what actually
 * paints. An earlier revision left `body` transparent, so the page rendered on
 * the user agent's white canvas while every token in this file still passed.
 * These assertions test the page, not the palette.
 */
describe('the Ground token is what paints', () => {
  /** The declaration block of the first top-level `<selector> {` rule. */
  function rule(selector: string): string {
    const lines = CSS.split('\n').map((l) => l.replace(/\r$/, ''))
    const start = lines.findIndex((l) => l.trim() === `${selector} {`)
    if (start === -1) throw new Error(`no \`${selector}\` rule in globals.css`)
    const end = lines.findIndex((l, i) => i > start && l.trim() === '}')
    return lines.slice(start + 1, end).join('\n')
  }

  it('gives <body> an explicit, opaque Ground background', () => {
    const body = rule('body')
    expect(body).toContain('background-color: var(--ground)')
    expect(body).not.toContain('background-color: transparent')
  })

  it('gives <html> the same Ground, so overscroll and the canvas match', () => {
    expect(rule('html')).toContain('background-color: var(--ground)')
  })

  it('carries the wash on the same element as the Ground, not behind it', () => {
    const body = rule('body')
    expect(body).toContain('--ground-wash-warm')
    expect(body).toContain('--ground-wash-cool')
    expect(CSS).not.toContain('body::before')
  })

  it('paints the Ground on the Shell root as well', () => {
    const shell = readFileSync(resolve(process.cwd(), 'components/Shell.tsx'), 'utf8')
    expect(shell).toContain('min-h-dvh bg-[var(--bg)]')
  })

  it('keeps the --bg alias pointing at the Ground', () => {
    expect(token('bg')).toBe('var(--ground)')
  })
})
