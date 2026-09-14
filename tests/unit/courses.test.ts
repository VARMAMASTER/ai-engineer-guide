import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  allSections,
  keyAnchor,
  parseCourse,
  plainText,
  referenceMap,
  scanLines,
  sectionAnchor,
  slugify,
} from '@/lib/courses/parse'
import { pageRenderer, renderBlocks, renderMath, splitMermaid } from '@/lib/courses/render'
import { buildOutline } from '@/lib/courses/outline'
import { coursePath, courses } from '@/content/courses/index'
import { courseOutlines } from '@/content/courses/outlines.generated'
import { buildCourseItems, search } from '@/lib/search/index'
import {
  OUTLINE_FILE,
  outlineModuleMatches,
  outlines,
  renderOutlineModule,
} from '@/scripts/generate-course-outlines'

/* The real document, not a fixture, wherever the assertion is about the real
   document's structure — 21 parts, 144 sections and a `§` numbering the prose
   depends on are facts worth failing a build over. Fixtures are used for the
   parsing rules themselves, where a 6,000-line input would hide the point. */

const meta = courses[0]
const markdown = readFileSync(coursePath(meta), 'utf8')
const course = parseCourse(markdown)
const refs = referenceMap(course)

describe('scanning', () => {
  it('knows which lines are inside a code fence', () => {
    const lines = scanLines(['a', '```python', '# 1. From data', '```', 'b'].join('\n'))
    expect(lines.map((l) => l.fenced)).toEqual([false, true, true, true, false])
  })

  it('does not let a different fence marker close an open one', () => {
    const lines = scanLines(['~~~', '```', 'still inside', '~~~', 'out'].join('\n'))
    expect(lines.map((l) => l.fenced)).toEqual([true, true, true, true, false])
  })
})

describe('parsing a course', () => {
  it('reads the title, blurb and note off the top of the document', () => {
    expect(course.header.title).toBe('Neural Networks, End to End')
    expect(course.header.blurb).toContain('From gradient descent to a served language model')
    expect(course.header.note).toContain('144 sections')
  })

  it('finds 21 parts and 8 appendices, and nothing else', () => {
    expect(course.parts.filter((p) => p.kind === 'part')).toHaveLength(21)
    expect(course.parts.filter((p) => p.kind === 'appendix')).toHaveLength(8)
    expect(course.parts).toHaveLength(29)
    expect(course.extras.map((e) => e.title)).toEqual(['COLOPHON'])
  })

  it('ignores the hundreds of `#` comments inside the Python blocks', () => {
    // A fence-blind scan reports 65 top-level units here instead of 30: the
    // code is full of column-zero comments like `# Setup: data following ...`.
    expect(course.parts.map((p) => p.slug)).toContain('part-xxi')
    expect(course.parts.map((p) => p.title)).not.toContain('SPLIT')
    expect(course.parts.map((p) => p.title)).not.toContain('1. From data')
  })

  it('numbers the parts and slugs them from their own numerals', () => {
    expect(course.parts[0]).toMatchObject({ slug: 'part-i', kicker: 'Part I', order: 1 })
    expect(course.parts[5]).toMatchObject({ slug: 'part-vi', title: 'LEARNING TO JUDGE' })
    expect(course.parts[21]).toMatchObject({ slug: 'appendix-a', kicker: 'Appendix A' })
  })

  it('keeps all 144 numbered sections, with no gaps and no duplicates', () => {
    const numbers = allSections(course)
      .map(({ section }) => section.number)
      .filter((n): n is number => n !== null)
    expect(numbers).toHaveLength(144)
    expect(new Set(numbers).size).toBe(144)
    expect(Math.min(...numbers)).toBe(1)
    expect(Math.max(...numbers)).toBe(144)
  })

  it('gives every section a unique anchor within its page', () => {
    for (const part of course.parts) {
      const anchors = part.sections.map((s) => s.anchor)
      expect(new Set(anchors).size, part.slug).toBe(anchors.length)
    }
  })

  it('keeps the section ranges the front matter advertises', () => {
    expect(course.parts.find((p) => p.slug === 'part-vi')?.range).toBe('§48–55')
    expect(course.parts.find((p) => p.slug === 'part-xxi')?.range).toBe('§139–144')
    expect(course.parts.find((p) => p.slug === 'appendix-c')?.range).toBeNull()
  })

  it("holds the author's TOC as a placeholder rather than prose", () => {
    const roles = course.front.map((s) => `${s.heading}:${s.role}`)
    expect(roles).toEqual([
      'How to read this:prose',
      'Table of Contents:toc',
      'Prologue — The Universal Pattern:prose',
    ])
  })

  it('leaves the Epilogue where the author put it', () => {
    // It sits at the end of Appendix B in the document AND in the author's own
    // table of contents. Moving it would be an editorial decision, not a
    // rendering one.
    const b = course.parts.find((p) => p.slug === 'appendix-b')!
    expect(b.sections.map((s) => s.label)).toEqual([
      'Epilogue — the whole thing in one paragraph',
    ])
  })

  it('drops a section-trailing rule but keeps the ones inside a section', () => {
    const parsed = parseCourse(
      ['# T', '', '---', '', '# PART I — A', '', '## 1. One', '', 'a', '', '---', '', 'b', '', '---'].join('\n'),
    )
    const body = parsed.parts[0].sections[0].markdown
    expect(body.endsWith('b')).toBe(true)
    expect(body).toContain('---')
  })

  it('strips Markdown out of a heading for its plain form only', () => {
    const six = allSections(course).find(({ section }) => section.number === 6)!.section
    expect(six.label).toBe('The key insight: a network *is* a nested function')
    expect(six.labelText).toBe('The key insight: a network is a nested function')
  })

  it('slugs and anchors deterministically', () => {
    expect(sectionAnchor(33)).toBe('s33')
    expect(keyAnchor('E.3')).toBe('se3')
    expect(slugify('Path 1: `∂f/∂x₁` — the easy one')).toBe('path-1-f-x₁-the-easy-one')
    expect(plainText('`nn.Module` and *torch.optim*')).toBe('nn.Module and torch.optim')
  })
})

describe('cross-references', () => {
  it('resolves every section the prose can name, across part boundaries', () => {
    expect(refs.size).toBe(162)
    expect(refs.get('33')).toMatchObject({ partSlug: 'part-iv', anchor: 's33' })
    expect(refs.get('144')).toMatchObject({ partSlug: 'part-xxi', anchor: 's144' })
    expect(refs.get('E.3')).toMatchObject({ partSlug: 'appendix-e', anchor: 'se3' })
  })

  it('links a §, keeps a same-page one on the page, and never touches a code span', () => {
    const marked = pageRenderer({ courseHref: '/courses/c', partSlug: 'part-iv', refs })
    const [block] = renderBlocks('See §33, §48, `§N` and §900.', marked)
    expect(block.kind).toBe('html')
    const html = block.kind === 'html' ? block.html : ''
    // Same part: an in-page anchor. Another part: the full route.
    expect(html).toContain('href="#s33"')
    expect(html).toContain('href="/courses/c/part-vi#s48"')
    // The conventions table writes `§N` as code. It stays code.
    expect(html).toContain('<code>§N</code>')
    // A number with no section behind it stays the text it was.
    expect(html).toContain('§900.')
    expect(html).not.toContain('href="#s900"')
  })

  it('turns 148 references in the parts into real links', () => {
    let links = 0
    for (const part of course.parts) {
      const marked = pageRenderer({ courseHref: '/courses/c', partSlug: part.slug, refs })
      for (const md of [part.intro, ...part.sections.map((s) => s.markdown)]) {
        if (md.length === 0) continue
        for (const block of renderBlocks(md, marked)) {
          if (block.kind === 'html') links += (block.html.match(/class="course-ref"/g) ?? []).length
        }
      }
    }
    expect(links).toBe(148)
  })
})

describe('rendering', () => {
  const marked = pageRenderer({ courseHref: '/courses/c', partSlug: 'part-vi', refs })

  function html(md: string): string {
    return renderBlocks(md, marked)
      .map((b) => (b.kind === 'html' ? b.html : `[mermaid]${b.source}`))
      .join('\n')
  }

  it('typesets display maths as real KaTeX, not a code block', () => {
    const out = renderMath('\\mathcal{L}_{\\text{DPO}} = -\\log \\sigma(\\beta)')
    expect(out).toContain('class="course-math"')
    expect(out).toContain('katex')
    // MathML for a screen reader, HTML for the eye.
    expect(out).toContain('<math')
    expect(out).not.toContain('katex-error')
  })

  it('renders every equation in the course without a single error', () => {
    let equations = 0
    let errors = 0
    for (const part of course.parts) {
      const m = pageRenderer({ courseHref: '/courses/c', partSlug: part.slug, refs })
      for (const md of [part.intro, ...part.sections.map((s) => s.markdown)]) {
        if (md.length === 0) continue
        for (const block of renderBlocks(md, m)) {
          if (block.kind !== 'html') continue
          equations += (block.html.match(/class="course-math"/g) ?? []).length
          errors += (block.html.match(/katex-error/g) ?? []).length
        }
      }
    }
    expect(equations).toBe(56)
    expect(errors).toBe(0)
  })

  it('never reads a dollar sign in prose as maths', () => {
    // Part XVI quotes GPU rental prices. Two of them in one table row is what
    // an inline-maths rule would typeset as algebra.
    const out = html('| Tier | Rent |\n|---|---|\n| H100 | $3.29–4.33 |\n| 3090 | $0.69 |')
    expect(out).toContain('$3.29–4.33')
    expect(out).toContain('$0.69')
    expect(out).not.toContain('katex')
  })

  it('gives every table its own scroll container, keyboard-reachable', () => {
    const out = html('| a | b |\n|---|---|\n| 1 | 2 |')
    // tabindex+role+aria-label were added after axe caught the plain
    // `overflow-x: auto` div as a serious WCAG 2.1.1 violation on a real
    // wide table (`§55`'s hyperparameter table) — a scrollable region a mouse
    // can drag but a keyboard cannot reach at all.
    expect(out).toContain(
      '<div class="course-scroll" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="course-table">',
    )
    expect(out).toContain('<th>a</th>')
    expect(out).toContain('<td>1</td>')
  })

  it('renders code as a solid, scrollable, keyboard-reachable block', () => {
    const out = html('```python\nx = 1  # <b>not html</b>\n```')
    // Same reasoning as the table above: this course has genuinely long
    // Python lines, so `.code-block`'s overflow is load-bearing here in a way
    // it rarely was for the app's shorter snippets, and needs the same fix.
    expect(out).toContain(
      '<pre class="code-block" tabindex="0" role="region" aria-label="python code, scrolls sideways" data-lang="python">',
    )
    expect(out).toContain('&lt;b&gt;not html&lt;/b&gt;')
  })

  it('gives headings inside the prose unique ids', () => {
    const m = pageRenderer({ courseHref: '/courses/c', partSlug: 'x', refs })
    const out = renderBlocks('### Architecture\n\ntext\n\n### Architecture\n', m)
      .map((b) => (b.kind === 'html' ? b.html : ''))
      .join('')
    expect(out).toContain('<h3 id="architecture"')
    expect(out).toContain('<h3 id="architecture-2"')
  })

  it("keeps the author's collapsible answers as real HTML", () => {
    const out = html('<details>\n<summary><b>Part I</b></summary>\n\n1. Right.\n\n</details>')
    expect(out).toContain('<details>')
    expect(out).toContain('<summary>')
  })

  it('hands mermaid to the diagram component and never to the parser', () => {
    const chunks = splitMermaid('before\n\n```mermaid\nflowchart TD\n  A-->B\n```\n\nafter')
    expect(chunks.map((c) => c.kind)).toEqual(['prose', 'mermaid', 'prose'])
    expect(chunks[1].text).toBe('flowchart TD\n  A-->B')
  })

  it('does not mistake a mermaid word inside another fence for a diagram', () => {
    const chunks = splitMermaid('```\n```mermaid\n```\n')
    expect(chunks.filter((c) => c.kind === 'mermaid')).toHaveLength(0)
  })

  it('lifts all 13 of the course diagrams out as diagrams', () => {
    const count = course.parts
      .flatMap((p) => [p.intro, ...p.sections.map((s) => s.markdown)])
      .flatMap((md) => splitMermaid(md))
      .filter((c) => c.kind === 'mermaid').length
    expect(count).toBe(13)
  })
})

describe('the generated outline', () => {
  it('is in step with the document it was generated from', () => {
    // The palette indexes the outline, not the document — the document is
    // 365KB and read with `node:fs`. This is the check that keeps the two the
    // same thing; `pnpm validate` runs it again before every build.
    // Line endings normalised: git checks this file out with CRLF on Windows
    // and the generator writes LF, so a byte comparison fails on a fresh clone
    // — and `pnpm validate` would fail the build over a file nobody edited.
    const current = readFileSync(OUTLINE_FILE, 'utf8')
    expect(outlineModuleMatches(current, renderOutlineModule(outlines()))).toBe(true)
  })

  it('carries every part and every section, and no prose', () => {
    const [built] = courseOutlines
    expect(built.slug).toBe(meta.slug)
    expect(built.author).toBe('Sai Kiran Varma')
    expect(built.parts).toHaveLength(29)
    expect(built.parts.flatMap((p) => p.sections)).toHaveLength(163)
    expect(JSON.stringify(built)).not.toContain('Everything else is notation')
    // A tenth of the document's size, and none of its prose.
    expect(JSON.stringify(built).length).toBeLessThan(markdown.length / 10)
  })

  it('matches what the parser would build right now', () => {
    expect(buildOutline(meta, course)).toEqual(courseOutlines[0])
  })
})

describe('the search index', () => {
  const items = buildCourseItems({ courseOutlines })

  it('indexes the course, its 29 parts and all 163 sections', () => {
    expect(items.filter((i) => i.kind === 'course')).toHaveLength(1)
    expect(items.filter((i) => i.kind === 'course-part')).toHaveLength(29)
    expect(items.filter((i) => i.kind === 'course-section')).toHaveLength(163)
  })

  it('points every section row at its own anchor', () => {
    const s33 = items.find((i) => i.id.endsWith(':s33'))!
    expect(s33.href).toBe('/courses/neural-networks-end-to-end/part-iv#s33')
    expect(s33.subtitle).toBe('Part IV · §33')
  })

  it('finds a section by its title, and a part by what is inside it', () => {
    const top = search(items, 'causal mask')[0]
    expect(top.item.href).toContain('#s33')

    const rope = search(items, 'rope').map((r) => r.item.href)
    expect(rope.some((h) => h.endsWith('/part-x'))).toBe(true)
  })

  it('finds a section by the number the prose calls it', () => {
    const hits = search(items, '§144').map((r) => r.item.href)
    expect(hits.some((h) => h.endsWith('#s144'))).toBe(true)
  })

  it('gives every row a unique id', () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
  })
})
