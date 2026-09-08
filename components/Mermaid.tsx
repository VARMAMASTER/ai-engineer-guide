'use client'

import { useEffect, useId, useRef, useState } from 'react'

/**
 * Lazily-rendered Mermaid diagram (spec 6.10).
 *
 * Three things this component exists to get right, each of which is a real
 * failure mode rather than a nicety:
 *
 * 1. Mermaid is roughly a megabyte. It is pulled in with a dynamic `import()`
 *    inside an effect, so it never lands in the initial bundle for Today or
 *    Roadmap, which ship no diagrams at all.
 * 2. Mermaid bakes its colours into the SVG at render time. A diagram rendered
 *    in dark mode keeps dark text after the reader switches to light and
 *    becomes unreadable, so the resolved theme is watched with a
 *    `MutationObserver` on `<html>` and the diagram is rendered AGAIN, not
 *    recoloured, whenever it changes.
 * 3. If the module fails to load or the source fails to parse, the raw Mermaid
 *    source is shown in a code block. A reader looking at the source still
 *    learns the shape of the thing; an empty box is a bug they cannot report.
 */

type Resolved = 'dark' | 'light'
type Status = 'pending' | 'ready' | 'error'

/**
 * Mermaid's own themes do not know about this palette, so the `base` theme is
 * driven from the same values `app/globals.css` uses. Literals rather than
 * `getComputedStyle` reads: the diagram must render identically under jsdom,
 * where custom properties do not resolve, and a silently blank palette would
 * mean invisible edges rather than a loud failure.
 */
const PALETTE: Record<Resolved, Record<string, string>> = {
  dark: {
    darkMode: 'true',
    background: '#11131c',
    mainBkg: '#222634',
    primaryColor: '#222634',
    primaryTextColor: '#e8e9f2',
    primaryBorderColor: '#7f86a0',
    secondaryColor: '#191c26',
    secondaryTextColor: '#e8e9f2',
    secondaryBorderColor: '#7f86a0',
    tertiaryColor: '#262a38',
    tertiaryTextColor: '#e8e9f2',
    tertiaryBorderColor: '#7f86a0',
    nodeBorder: '#7f86a0',
    nodeTextColor: '#e8e9f2',
    textColor: '#e8e9f2',
    classText: '#e8e9f2',
    lineColor: '#a2a8bd',
    titleColor: '#a79cff',
    clusterBkg: '#191c26',
    clusterBorder: '#454b60',
    edgeLabelBackground: '#11131c',
    labelBoxBkgColor: '#222634',
    labelBoxBorderColor: '#7f86a0',
    labelTextColor: '#e8e9f2',
  },
  light: {
    darkMode: 'false',
    background: '#eeeef6',
    mainBkg: '#fdfdff',
    primaryColor: '#fdfdff',
    primaryTextColor: '#16171f',
    primaryBorderColor: '#575d70',
    secondaryColor: '#f7f7fb',
    secondaryTextColor: '#16171f',
    secondaryBorderColor: '#575d70',
    tertiaryColor: '#e7e7f0',
    tertiaryTextColor: '#16171f',
    tertiaryBorderColor: '#575d70',
    nodeBorder: '#575d70',
    nodeTextColor: '#16171f',
    textColor: '#16171f',
    classText: '#16171f',
    lineColor: '#575d70',
    titleColor: '#5b4bd6',
    clusterBkg: '#f7f7fb',
    clusterBorder: '#b9b9cc',
    edgeLabelBackground: '#eeeef6',
    labelBoxBkgColor: '#fdfdff',
    labelBoxBorderColor: '#575d70',
    labelTextColor: '#16171f',
  },
}

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'

type MermaidApi = (typeof import('mermaid'))['default']

/**
 * One shared import promise for the whole page.
 *
 * The dynamic `import()` is what keeps the ~1MB library out of the initial
 * bundle, but a System Design page renders several diagrams at once and each
 * one firing its own `import()` is wasted work. A rejected load is not cached,
 * so a diagram mounted after a transient chunk failure gets a fresh attempt.
 */
let pending: Promise<MermaidApi> | null = null

function loadMermaid(): Promise<MermaidApi> {
  pending ??= import('mermaid')
    .then((m) => m.default)
    .catch((err: unknown) => {
      pending = null
      throw err
    })
  return pending
}

/**
 * The resolved theme, not the stored choice.
 *
 * `lib/theme` removes `data-theme` entirely for the `system` choice so the
 * `prefers-color-scheme` media query takes over, which means the attribute
 * being absent is the common case rather than an error. Dark is the fallback
 * because dark is what the server renders (`DEFAULT_THEME`).
 */
export function resolveDiagramTheme(): Resolved {
  if (typeof document === 'undefined') return 'dark'
  const attr = document.documentElement.dataset.theme
  if (attr === 'dark' || attr === 'light') return attr
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

interface Props {
  /** Mermaid source, e.g. a `flowchart TD` or a `classDiagram`. */
  source: string
  /** Short description of what the diagram shows. Becomes the accessible name. */
  caption?: string
}

export default function Mermaid({ source, caption }: Props) {
  // `useId` rather than a module-level counter: a counter is bumped twice per
  // mount under React strict mode's double render, so two diagrams on a page
  // can end up racing for the same DOM id. The raw value contains characters
  // that are not valid in a CSS selector, and Mermaid selects on this id.
  const base = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const seq = useRef(0)

  const [theme, setTheme] = useState<Resolved | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('pending')

  // Watch the resolved theme. Holding it in state rather than reading it at
  // render time keeps the render effect's dependency honest: a theme flip is a
  // new render, not a restyle of the SVG already in the DOM.
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setTheme(resolveDiagramTheme())
    sync()

    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })

    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null
    mq?.addEventListener?.('change', sync)

    return () => {
      observer.disconnect()
      mq?.removeEventListener?.('change', sync)
    }
  }, [])

  useEffect(() => {
    if (theme === null) return
    let cancelled = false

    void (async () => {
      try {
        const mermaid = await loadMermaid()
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: { ...PALETTE[theme], fontFamily: FONT, fontSize: '14px' },
          // `useMaxWidth: false` on purpose. Scaling a 900px class diagram down
          // to fit a 390px viewport makes it unreadable; letting it keep its
          // natural width and scroll inside the container below keeps it
          // legible and keeps the page itself from scrolling sideways.
          flowchart: { useMaxWidth: false, htmlLabels: false, curve: 'basis' },
          class: { useMaxWidth: false },
          // Not a typo and not belt-and-braces: mermaid 11's unified class
          // renderer destructures `state` out of the config, not `class`
          // (chunk-TICWLB2K.mjs, `const { securityLevel, state: conf }`), so a
          // classDiagram reads its useMaxWidth from here. Verified in a browser
          // at 390px: without it every class diagram is squeezed to ~280px and
          // stops being readable.
          state: { useMaxWidth: false },
          sequence: { useMaxWidth: false },
        })

        // `parse` with `suppressErrors` returns false instead of throwing and,
        // unlike `render`, does not leave an error diagram behind in the body.
        const ok = await mermaid.parse(source, { suppressErrors: true })
        if (cancelled) return
        if (!ok) throw new Error('mermaid source failed to parse')

        const out = await mermaid.render(`${base}-${seq.current++}`, source)
        if (cancelled) return
        setSvg(out.svg)
        setStatus('ready')
      } catch {
        if (cancelled) return
        setSvg(null)
        setStatus('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [source, theme, base])

  const label = caption ?? 'Diagram'

  return (
    <figure className="my-3 min-w-0 max-w-full">
      <div
        data-testid="mermaid"
        data-mermaid-status={status}
        data-mermaid-theme={theme ?? ''}
        // `img` once there is an SVG, so a screen reader announces the caption
        // and not a tree of unlabelled shapes. Before that, and on failure,
        // `group` instead - the source in the code block is worth reaching.
        role={status === 'ready' ? 'img' : 'group'}
        aria-label={label}
        aria-busy={status === 'pending' ? true : undefined}
        // Solid surface, never glass (spec 13.3), and its own scroll container.
        className="surface-solid min-w-0 max-w-full overflow-x-auto bg-[var(--code-bg)] p-3"
      >
        {status === 'ready' && svg !== null ? (
          <div className="mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : null}
        {status === 'error' ? (
          <pre className="code-block border-0 bg-transparent p-0">{source}</pre>
        ) : null}
        {status === 'pending' ? (
          <p className="readout text-[var(--text-muted)]">Rendering diagram&hellip;</p>
        ) : null}
      </div>
      {caption !== undefined ? (
        <figcaption className="mt-1.5 text-xs text-[var(--text-muted)]">{caption}</figcaption>
      ) : null}
    </figure>
  )
}
