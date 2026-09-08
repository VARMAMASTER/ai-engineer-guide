import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Mermaid, { resolveDiagramTheme } from '@/components/Mermaid'

/**
 * Mermaid itself is mocked. Real Mermaid needs `SVGElement.getBBox`, which jsdom
 * does not implement, so running it here would test jsdom's gaps rather than this
 * component. What matters at this seam is the contract: parse, then render, then
 * render AGAIN with a different palette when the theme flips.
 */
const mermaid = vi.hoisted(() => {
  const initialize = vi.fn()
  const parse = vi.fn(async (source: string) => !source.includes('NOT-A-DIAGRAM'))
  const render = vi.fn(async (id: string) => ({ svg: `<svg data-id="${id}"><g /></svg>` }))
  return { initialize, parse, render }
})

vi.mock('mermaid', () => ({ default: mermaid }))

const VALID = 'flowchart TD\n  A[Client] --> B[Limiter]\n  B --> C[(Redis)]'
const INVALID = 'NOT-A-DIAGRAM ((('

/** The `background` themeVariable of the most recent `initialize` call. */
function lastPaletteBackground(): string | undefined {
  const calls = mermaid.initialize.mock.calls
  const last = calls.at(-1)?.[0] as { themeVariables?: { background?: string } } | undefined
  return last?.themeVariables?.background
}

// Mermaid.tsx paints its diagram surface with the `code` token (a solid fill,
// since mermaid bakes colours into the SVG rather than reading CSS vars) — so
// pull the two theme's values straight from globals.css rather than pasting
// them, the way tests/unit/contrast.test.ts does.
const CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')

function cssHex(name: string): string {
  const m = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, 'i'))
  if (!m) throw new Error(`token --${name} not found in globals.css`)
  return m[1]
}

const DARK_BG = cssHex('d-code')
const LIGHT_BG = cssHex('l-code')

beforeEach(() => {
  vi.clearAllMocks()
  document.documentElement.removeAttribute('data-theme')
})

describe('resolveDiagramTheme', () => {
  it('reads an explicit data-theme off <html>', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    expect(resolveDiagramTheme()).toBe('light')
    document.documentElement.setAttribute('data-theme', 'dark')
    expect(resolveDiagramTheme()).toBe('dark')
  })

  it('falls back to dark when the attribute is absent, matching the server render', () => {
    // `system` removes the attribute entirely (lib/theme.applyTheme), and jsdom
    // provides no matchMedia, so the DEFAULT_THEME fallback is what is left.
    expect(resolveDiagramTheme()).toBe('dark')
  })
})

describe('Mermaid', () => {
  it('renders a valid diagram as inline svg', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    render(<Mermaid source={VALID} caption="Rate limiter architecture" />)

    const box = await screen.findByTestId('mermaid')
    await waitFor(() => expect(box.dataset.mermaidStatus).toBe('ready'))

    expect(mermaid.parse).toHaveBeenCalledWith(VALID, { suppressErrors: true })
    expect(box.querySelector('svg')).not.toBeNull()
    expect(box.querySelector('pre')).toBeNull()
  })

  it('gives the rendered diagram a role and the caption as its accessible name', async () => {
    render(<Mermaid source={VALID} caption="Rate limiter architecture" />)
    const img = await screen.findByRole('img', { name: 'Rate limiter architecture' })
    expect(img.dataset.mermaidStatus).toBe('ready')
    expect(screen.getByText('Rate limiter architecture').tagName).toBe('FIGCAPTION')
  })

  it('names an uncaptioned diagram rather than announcing an unlabelled blob', async () => {
    render(<Mermaid source={VALID} />)
    expect(await screen.findByRole('img', { name: 'Diagram' })).toBeDefined()
  })

  it('uses a unique mermaid id per instance, not a shared counter', async () => {
    render(
      <>
        <Mermaid source={VALID} caption="One" />
        <Mermaid source={VALID} caption="Two" />
      </>,
    )
    await waitFor(() => expect(mermaid.render).toHaveBeenCalledTimes(2))
    const ids = mermaid.render.mock.calls.map((c) => c[0] as string)
    expect(new Set(ids).size).toBe(2)
    for (const id of ids) {
      // Must be selector-safe: mermaid does `document.querySelector('#' + id)`.
      expect(id).toMatch(/^mermaid-[A-Za-z0-9_-]+$/)
    }
  })

  it('falls back to a pre with the raw source when the source does not parse', async () => {
    render(<Mermaid source={INVALID} caption="Broken" />)

    const box = await screen.findByTestId('mermaid')
    await waitFor(() => expect(box.dataset.mermaidStatus).toBe('error'))

    const pre = box.querySelector('pre')
    expect(pre).not.toBeNull()
    expect(pre?.textContent).toBe(INVALID)
    expect(pre?.className).toContain('code-block')
    expect(box.querySelector('svg')).toBeNull()
    expect(mermaid.render).not.toHaveBeenCalled()
  })

  it('falls back to a pre when the mermaid module itself fails to load', async () => {
    mermaid.parse.mockRejectedValueOnce(new Error('chunk load failed'))
    render(<Mermaid source={VALID} caption="Broken" />)

    const box = await screen.findByTestId('mermaid')
    await waitFor(() => expect(box.dataset.mermaidStatus).toBe('error'))
    expect(box.querySelector('pre')?.textContent).toBe(VALID)
  })

  it('re-renders with a new palette when data-theme flips', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    render(<Mermaid source={VALID} caption="Rate limiter architecture" />)

    const box = await screen.findByTestId('mermaid')
    await waitFor(() => expect(box.dataset.mermaidStatus).toBe('ready'))
    expect(box.dataset.mermaidTheme).toBe('dark')
    expect(lastPaletteBackground()).toBe(DARK_BG)
    const rendersInDark = mermaid.render.mock.calls.length

    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'light')
    })

    // Mermaid bakes colours in at render time, so a restyle is not enough:
    // the diagram has to be rendered again against the light palette.
    await waitFor(() => expect(box.dataset.mermaidTheme).toBe('light'))
    await waitFor(() => expect(lastPaletteBackground()).toBe(LIGHT_BG))
    expect(mermaid.render.mock.calls.length).toBeGreaterThan(rendersInDark)
    await waitFor(() => expect(box.dataset.mermaidStatus).toBe('ready'))
  })

  it('does not re-render when an unrelated attribute changes on <html>', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    render(<Mermaid source={VALID} />)
    await waitFor(() => expect(mermaid.render).toHaveBeenCalledTimes(1))

    await act(async () => {
      document.documentElement.setAttribute('lang', 'en-GB')
    })
    await Promise.resolve()
    expect(mermaid.render).toHaveBeenCalledTimes(1)
  })

  it('sits on a solid surface with its own horizontal scroll container', async () => {
    render(<Mermaid source={VALID} caption="Rate limiter architecture" />)
    const box = await screen.findByTestId('mermaid')
    expect(box.className).toContain('surface-solid')
    expect(box.className).toContain('overflow-x-auto')
    expect(box.className).toContain('max-w-full')
    // Glass is the `panel` class; spec 13.3 forbids it behind a diagram.
    expect(box.className).not.toContain('panel')
  })
})
