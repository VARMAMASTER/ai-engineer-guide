/* ============================================================================
   Markdown and maths to finished HTML — at BUILD time.
   ----------------------------------------------------------------------------
   Nothing in this file reaches a browser. It is imported only by the server
   components under `app/courses`, every one of which is prerendered, so the
   pages that ship carry finished HTML and the client downloads neither `marked`
   (~40KB) nor `katex` (~280KB) nor a line of markdown. That is not a
   micro-optimisation: 29 pages of this course are precached by the service
   worker for offline reading, and a client-rendered course would mean 365KB of
   Markdown plus a parser and a maths typesetter before the first word appears.

   What is deliberately NOT here:

   - INLINE `$…$` MATH. The document has 56 display expressions, every one of
     them alone on its line, and zero inline ones — but Part XVI quotes GPU
     rental prices (`$3.29–4.33`, `$0.69`, `$500`), and two prices in one table
     row is indistinguishable from one inline expression. Enabling inline maths
     would typeset the gap between two dollar amounts as algebra. Block `$$`
     only, therefore, which is exactly what the author wrote.

   - A SECOND MERMAID PATH. The 13 diagrams are lifted out as `mermaid` blocks
     and handed to `components/Mermaid.tsx`, which already lazy-loads the
     library, re-renders on a theme flip and degrades to showing its source.
     This file never touches mermaid itself.
   ========================================================================== */

import katex from 'katex'
import { Marked, type Tokens } from 'marked'
import type { SectionRef } from './parse'

/**
 * One run of rendered content.
 *
 * A section is a list of these rather than one HTML string because a Mermaid
 * diagram is a React component with an effect, not markup — so the prose has
 * to be handed over in the pieces between the diagrams.
 */
export type CourseBlock =
  | { kind: 'html'; html: string }
  | { kind: 'mermaid'; source: string }

export interface RenderContext {
  /** `/courses/<slug>` — the base a cross-reference links against. */
  courseHref: string
  /** The part being rendered, so a same-page `§` stays a same-page anchor. */
  partSlug: string
  /** Every `§` destination in the course. */
  refs: Map<string, SectionRef>
}

/* --- escaping ------------------------------------------------------------- */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c])
}

/* --- maths ---------------------------------------------------------------- */

/**
 * One display expression, typeset now.
 *
 * `throwOnError: false` renders a malformed expression in the error colour
 * instead of failing the build — a single bad brace should not take the whole
 * site down — and `tests/unit/courses.test.ts` asserts that no page actually
 * contains a `katex-error`, so a silent one cannot ship either.
 *
 * The default `htmlAndMathml` output is kept rather than trimmed to `html`:
 * the MathML half is what a screen reader reads, and dropping it would make
 * every equation in the course announce as a run of loose glyphs.
 */
export function renderMath(tex: string): string {
  const html = katex.renderToString(tex, {
    displayMode: true,
    throwOnError: false,
    strict: false,
    trust: false,
  })
  return `<div class="course-math">${html}</div>`
}

/* --- markdown ------------------------------------------------------------- */

const ALIGN: Record<string, string> = {
  left: ' style="text-align:left"',
  right: ' style="text-align:right"',
  center: ' style="text-align:center"',
}

function align(value: string | null): string {
  return value ? (ALIGN[value] ?? '') : ''
}

/**
 * A Markdown renderer for one PAGE.
 *
 * Per page, not per call and not per module: heading ids are deduplicated
 * against everything already emitted on the same page ("Architecture" is a
 * `###` in four different sections), and an id has to be unique within the
 * document it lands in, not within the course.
 */
export function pageRenderer(ctx: RenderContext) {
  const used = new Map<string, number>()

  const uniqueId = (base: string): string => {
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base}-${seen + 1}`
  }

  const hrefFor = (ref: SectionRef): string =>
    ref.partSlug === ctx.partSlug
      ? `#${ref.anchor}`
      : `${ctx.courseHref}/${ref.partSlug}#${ref.anchor}`

  const marked = new Marked({ gfm: true, breaks: false })

  marked.use({
    extensions: [
      {
        name: 'mathBlock',
        level: 'block',
        start(src: string) {
          const at = src.indexOf('$$')
          return at === -1 ? undefined : at
        },
        tokenizer(src: string) {
          const match = /^\$\$([^\n]+?)\$\$[ \t]*(?:\n+|$)/.exec(src)
          if (!match) return undefined
          return { type: 'mathBlock', raw: match[0], text: match[1] }
        },
        renderer(token) {
          return renderMath((token as Tokens.Generic & { text: string }).text)
        },
      },
      {
        /**
         * `§33`, `§E.3` — a real link to the section the author means.
         *
         * An INLINE extension rather than a pass over the rendered HTML, which
         * is what makes it safe: marked never re-tokenises the inside of a code
         * span, so the `` `§N` `` row in the author's own conventions table
         * stays literal text, and no regex ever runs over an href or a class
         * attribute. A number with no section behind it renders as the plain
         * text it always was.
         */
        name: 'sectionRef',
        level: 'inline',
        start(src: string) {
          const at = src.indexOf('§')
          return at === -1 ? undefined : at
        },
        tokenizer(src: string) {
          const match = /^§([A-H]\.\d{1,2}|\d{1,3})/.exec(src)
          if (!match) return undefined
          return { type: 'sectionRef', raw: match[0], text: match[1] }
        },
        renderer(token) {
          const key = (token as Tokens.Generic & { text: string }).text
          const plain = `§${key}`
          const ref = ctx.refs.get(key)
          if (!ref) return plain
          return `<a class="course-ref" href="${hrefFor(ref)}" title="${escapeHtml(ref.label)}">${plain}</a>`
        },
      },
    ],
    renderer: {
      /**
       * Every heading inside the prose gets a stable id so the contents, the
       * command palette and a `§` can all land on it.
       */
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Heading) {
        const depth = Math.min(Math.max(token.depth, 3), 6)
        const text = this.parser.parseInline(token.tokens)
        const id = uniqueId(slugFromTokens(text))
        return `<h${depth} id="${id}" class="course-head">${text}</h${depth}>\n`
      },

      /**
       * Tables get their OWN scroll container, every one of them.
       *
       * There are roughly 910 rows in this course and several tables are six
       * columns of prose wide. At 390px a bare `<table>` is what makes the
       * whole document scroll sideways, which `tests/e2e/responsive.spec.ts`
       * fails the build over — correctly, because a page that slides under your
       * thumb while you read is unusable.
       */
      table(
        this: { parser: { parseInline: (t: Tokens.Generic[]) => string } },
        token: Tokens.Table,
      ) {
        const head = token.header
          .map((cell, i) => `<th${align(token.align[i])}>${this.parser.parseInline(cell.tokens)}</th>`)
          .join('')
        const body = token.rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell, i) => `<td${align(token.align[i])}>${this.parser.parseInline(cell.tokens)}</td>`)
                .join('')}</tr>`,
          )
          .join('')
        return `<div class="course-scroll"><table class="course-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`
      },

      /** Code is solid and scrolls inside itself — `.code-block`, spec 13.3. */
      code(token: Tokens.Code) {
        const text = token.escaped ? token.text : escapeHtml(token.text)
        const lang = token.lang?.trim().split(/\s+/)[0] ?? ''
        const attr = lang ? ` data-lang="${escapeHtml(lang)}"` : ''
        const cls = lang ? ` class="language-${escapeHtml(lang)}"` : ''
        return `<pre class="code-block"${attr}><code${cls}>${text}</code></pre>\n`
      },
    },
  })

  return marked
}

/** A heading id from already-rendered inline HTML: tags out, words hyphenated. */
function slugFromTokens(html: string): string {
  const text = html.replace(/<[^>]*>/g, '')
  const slug = text
    .toLowerCase()
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : 'section'
}

/* --- mermaid ------------------------------------------------------------- */

const MERMAID_OPEN = /^ {0,3}(`{3,}|~{3,})\s*mermaid\s*$/
const FENCE = /^ {0,3}(`{3,}|~{3,})/

/**
 * Split markdown into prose runs and Mermaid sources.
 *
 * Fence-aware in both directions: a `mermaid` fence is only recognised when no
 * other fence is open, and it closes on its own marker, so a ```` ``` ```` in a
 * diagram's label cannot end it early.
 */
export function splitMermaid(markdown: string): { kind: 'prose' | 'mermaid'; text: string }[] {
  const out: { kind: 'prose' | 'mermaid'; text: string }[] = []
  let prose: string[] = []
  let diagram: string[] | null = null
  let marker = ''

  const flushProse = () => {
    const text = prose.join('\n').trim()
    if (text.length > 0) out.push({ kind: 'prose', text })
    prose = []
  }

  for (const line of markdown.split('\n')) {
    if (diagram !== null) {
      const fence = FENCE.exec(line)
      if (fence && fence[1][0] === marker[0] && fence[1].length >= marker.length) {
        out.push({ kind: 'mermaid', text: diagram.join('\n').trim() })
        diagram = null
        continue
      }
      diagram.push(line)
      continue
    }

    const open = MERMAID_OPEN.exec(line)
    if (open && !insideFence(prose)) {
      flushProse()
      diagram = []
      marker = open[1]
      continue
    }
    prose.push(line)
  }

  // An unterminated diagram fence: keep the source rather than losing it.
  if (diagram !== null) out.push({ kind: 'mermaid', text: diagram.join('\n').trim() })
  flushProse()
  return out
}

/** True when the lines gathered so far leave a code fence open. */
function insideFence(lines: string[]): boolean {
  let open: string | null = null
  for (const line of lines) {
    const fence = FENCE.exec(line)
    if (!fence) continue
    if (open === null) open = fence[1]
    else if (fence[1][0] === open[0] && fence[1].length >= open.length) open = null
  }
  return open !== null
}

/* --- the one function the pages call -------------------------------------- */

/**
 * Render a run of course Markdown into blocks.
 *
 * `marked` is passed in rather than created here so a whole page shares one
 * renderer, and with it one set of heading ids.
 */
export function renderBlocks(markdown: string, marked: Marked): CourseBlock[] {
  return splitMermaid(markdown).map((chunk) =>
    chunk.kind === 'mermaid'
      ? { kind: 'mermaid' as const, source: chunk.text }
      : { kind: 'html' as const, html: marked.parse(chunk.text, { async: false }) },
  )
}
