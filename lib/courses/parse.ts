/* ============================================================================
   Reading a course document's own structure.
   ----------------------------------------------------------------------------
   Pure and synchronous: Markdown string in, outline out. No filesystem, no
   `marked`, no React — `lib/courses/index.ts` does the reading and
   `lib/courses/render.ts` does the HTML, so this file can be unit-tested
   against a fixture that fits on a screen.

   The document is the source of truth for its own shape. It carries 21 parts,
   8 appendices and 144 numbered sections, and it cross-references those
   sections BY NUMBER — "`§33` means section 33 regardless of which part it
   lives in", in the author's own words. That numbering is load-bearing: it is
   what the anchors are built from, so `§33` resolves to one place forever even
   if a part is renamed or a section moves between parts.

   Two things here are less obvious than they look:

   1. HEADING DETECTION IS FENCE-AWARE. The Python in this document is full of
      comments that start at column zero — `# 1. From data`, `# SPLIT`,
      `# Setup: data following y = 2x + 1 with noise`. A naive `/^# /` scan
      finds 44 of those and reports 65 "parts". Every scan below tracks the
      open fence and ignores anything inside one.

   2. THE TABLE OF CONTENTS IS A UNIT, NOT PROSE. The author's TOC is 370 lines
      of `&nbsp;`-indented links to in-document anchors that no longer exist
      once one document becomes 30 pages. It is kept as a marked-up hole in the
      front matter (`role: 'toc'`) which the page fills with a generated
      contents built from this same outline — the author's ordering, rendered
      as real tap targets rather than a wrapped paragraph of 307 links.
   ========================================================================== */

/** What a top-level `#` unit is. */
export type PartKind = 'part' | 'appendix' | 'extra'

export interface CourseSection {
  /** `12` for "## 12. Tensors — the only data structure". Null when unnumbered. */
  number: number | null
  /** `'E.3'` for an appendix subsection. Null otherwise. */
  key: string | null
  /** The heading exactly as authored, leading number included. */
  heading: string
  /** The heading with its own numbering removed, for a contents row. */
  label: string
  /**
   * The same label with its Markdown stripped.
   *
   * Headings are Markdown: "a network *is* a nested function", "`nn.Module`
   * and `torch.optim`". That renders as emphasis on a page, but a search
   * result, a `title` attribute and a checkbox's accessible name are plain
   * text, and asterisks in them are just noise a screen reader reads out.
   */
  labelText: string
  /**
   * The id this section is reachable at, derived from its number so a
   * cross-reference is stable: `s33`, `se3`, or a slug for the unnumbered ones.
   */
  anchor: string
  /** The body, heading line excluded. */
  markdown: string
  /** Prose, or the placeholder the generated contents replaces. */
  role: 'prose' | 'toc'
}

export interface CoursePart {
  kind: PartKind
  /** URL segment: `part-vi`, `appendix-c`. */
  slug: string
  /** `'VI'`, `'C'`, or `''` for a one-off like the colophon. */
  designation: string
  /** `'PART VI'`, `'APPENDIX C'`, `'COLOPHON'` — the eyebrow above the title. */
  kicker: string
  /** `'LEARNING TO JUDGE'` — the heading with its `PART VI —` prefix removed. */
  title: string
  /** The `#` heading exactly as authored. */
  heading: string
  /** 1-based position among the part-level pages. */
  order: number
  /** Anything between the part heading and its first section. */
  intro: string
  sections: CourseSection[]
  /** `'§48–55'`, or null when the part has no numbered sections. */
  range: string | null
}

export interface CourseHeader {
  /** The document's `#` title. */
  title: string
  /** The `###` line under it. */
  blurb: string
  /** The italic note under that. */
  note: string
}

export interface Course {
  header: CourseHeader
  /** The front matter's own `##` units, in order, TOC placeholder included. */
  front: CourseSection[]
  /** The 21 parts and 8 appendices, in document order. */
  parts: CoursePart[]
  /** Top-level units that are not a part or an appendix — the colophon. */
  extras: CoursePart[]
}

/* --- line scanning -------------------------------------------------------- */

const FENCE = /^ {0,3}(`{3,}|~{3,})/

/**
 * Split into lines, flagging the ones inside a fenced code block.
 *
 * A fence closes only on the same marker character, at the same length or
 * longer, which is what keeps a ```` ``` ```` inside a ```` ~~~~ ```` block
 * from ending it early.
 */
export function scanLines(markdown: string): { text: string; fenced: boolean }[] {
  const out: { text: string; fenced: boolean }[] = []
  let open: string | null = null

  for (const text of markdown.split('\n')) {
    const match = FENCE.exec(text)
    if (match) {
      const marker = match[1]
      if (open === null) {
        open = marker
        out.push({ text, fenced: true })
        continue
      }
      if (marker[0] === open[0] && marker.length >= open.length) {
        open = null
        out.push({ text, fenced: true })
        continue
      }
    }
    out.push({ text, fenced: open !== null })
  }
  return out
}

interface HeadingHit {
  depth: number
  text: string
  index: number
}

/** Every real ATX heading, code fences excluded. */
function headings(lines: { text: string; fenced: boolean }[], maxDepth = 2): HeadingHit[] {
  const out: HeadingHit[] = []
  lines.forEach((line, index) => {
    if (line.fenced) return
    const match = /^(#{1,6})\s+(.*?)\s*$/.exec(line.text)
    if (!match || match[1].length > maxDepth) return
    out.push({ depth: match[1].length, text: match[2], index })
  })
  return out
}

/**
 * The lines of one range, as Markdown.
 *
 * A TRAILING thematic break is dropped. The document separates its sections
 * with `---`, which is exactly right in one long file and wrong here: each
 * section becomes its own block on the page with its own boundary, so the
 * inherited rule would draw a second line under the first. Interior rules —
 * the ones the author uses inside a section — are untouched.
 */
function block(lines: { text: string }[], from: number, to: number): string {
  return lines
    .slice(from, to)
    .map((l) => l.text)
    .join('\n')
    .trim()
    .replace(/\n\s*(?:-{3,}|\*{3,}|_{3,})\s*$/, '')
    .trim()
}

/* --- slugs and anchors ---------------------------------------------------- */

/**
 * A heading slug: lower-case, punctuation dropped, spaces hyphenated.
 *
 * Not GitHub-compatible and not trying to be — the anchors this produces are
 * consumed only by this app, and the numbered sections (which is everything a
 * cross-reference can name) use their number instead. Accented and non-Latin
 * letters are kept; everything that is not a letter, digit or space goes.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/** A heading with its inline Markdown removed: emphasis, code ticks, links. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The anchor for section `n`: `§33` is `#s33`, for the life of the document. */
export function sectionAnchor(n: number): string {
  return `s${n}`
}

/** The anchor for an appendix subsection: `§E.3` is `#se3`. */
export function keyAnchor(key: string): string {
  return `s${key.toLowerCase().replace(/[^a-z0-9]/g, '')}`
}

/* --- headings that carry numbering ---------------------------------------- */

const NUMBERED = /^(\d{1,3})\.\s+(.*)$/
const APPENDIX_SUB = /^([A-H])\.(\d{1,2})\s+(.*)$/
const PART_HEADING = /^PART\s+([IVXLCDM]+)\s*[—–-]?\s*(.*)$/
const APPENDIX_HEADING = /^APPENDIX\s+([A-H])\s*[—–-]?\s*(.*)$/

function sectionFrom(heading: string, markdown: string): CourseSection {
  const numbered = NUMBERED.exec(heading)
  if (numbered) {
    const number = Number(numbered[1])
    return {
      number,
      key: null,
      heading,
      label: numbered[2],
      labelText: plainText(numbered[2]),
      anchor: sectionAnchor(number),
      markdown,
      role: 'prose',
    }
  }

  const sub = APPENDIX_SUB.exec(heading)
  if (sub) {
    const key = `${sub[1]}.${sub[2]}`
    return {
      number: null,
      key,
      heading,
      label: sub[3],
      labelText: plainText(sub[3]),
      anchor: keyAnchor(key),
      markdown,
      role: 'prose',
    }
  }

  return {
    number: null,
    key: null,
    heading,
    label: heading,
    labelText: plainText(heading),
    anchor: slugify(heading),
    markdown,
    role: /^table of contents$/i.test(heading) ? 'toc' : 'prose',
  }
}

function partFrom(heading: string, order: number): Omit<CoursePart, 'intro' | 'sections' | 'range'> {
  const part = PART_HEADING.exec(heading)
  if (part) {
    return {
      kind: 'part',
      slug: `part-${part[1].toLowerCase()}`,
      designation: part[1],
      kicker: `Part ${part[1]}`,
      title: part[2],
      heading,
      order,
    }
  }

  const appendix = APPENDIX_HEADING.exec(heading)
  if (appendix) {
    return {
      kind: 'appendix',
      slug: `appendix-${appendix[1].toLowerCase()}`,
      designation: appendix[1],
      kicker: `Appendix ${appendix[1]}`,
      title: appendix[2],
      heading,
      order,
    }
  }

  return {
    kind: 'extra',
    slug: slugify(heading),
    designation: '',
    kicker: '',
    title: heading,
    heading,
    order,
  }
}

function rangeOf(sections: CourseSection[]): string | null {
  const numbers = sections.map((s) => s.number).filter((n): n is number => n !== null)
  if (numbers.length === 0) return null
  const lo = Math.min(...numbers)
  const hi = Math.max(...numbers)
  return lo === hi ? `§${lo}` : `§${lo}–${hi}`
}

/** Split one top-level unit's body into its `##` sections. */
function sectionsIn(lines: { text: string; fenced: boolean }[], from: number, to: number) {
  const marks = headings(lines.slice(from, to), 2)
    .filter((h) => h.depth === 2)
    .map((h) => ({ ...h, index: h.index + from }))

  const intro = block(lines, from, marks[0]?.index ?? to)
  const sections = marks.map((mark, i) =>
    sectionFrom(mark.text, block(lines, mark.index + 1, marks[i + 1]?.index ?? to)),
  )
  return { intro, sections }
}

/* --- the parse ------------------------------------------------------------ */

/**
 * Read a course document.
 *
 * The first `#` is the course title; the `###` and the italic line under it are
 * its blurb and note. Everything from there to the second `#` is front matter,
 * split into its own `##` units. Every subsequent `#` starts a part-level page.
 */
export function parseCourse(markdown: string): Course {
  const lines = scanLines(markdown)
  const tops = headings(lines, 1).filter((h) => h.depth === 1)

  if (tops.length === 0 || tops[0].index !== 0) {
    throw new Error('a course document must open with its `# Title`')
  }

  // The header block runs to the first thematic break, which is where the
  // author's own front matter starts.
  const firstUnit = tops[1]?.index ?? lines.length
  let headerEnd = firstUnit
  for (let i = 1; i < firstUnit; i += 1) {
    if (!lines[i].fenced && /^\s*-{3,}\s*$/.test(lines[i].text)) {
      headerEnd = i
      break
    }
  }

  const headerLines = lines.slice(1, headerEnd).filter((l) => l.text.trim().length > 0)
  const blurbLine = headerLines.find((l) => l.text.startsWith('### '))
  const noteLines = headerLines.filter((l) => !l.text.startsWith('#'))

  const header: CourseHeader = {
    title: tops[0].text,
    blurb: blurbLine ? blurbLine.text.replace(/^###\s+/, '') : '',
    note: noteLines
      .map((l) => l.text.trim())
      .join(' ')
      .replace(/^\*|\*$/g, '')
      .trim(),
  }

  const front = sectionsIn(lines, headerEnd, firstUnit).sections

  const parts: CoursePart[] = []
  const extras: CoursePart[] = []

  tops.slice(1).forEach((top, i) => {
    const end = tops[i + 2]?.index ?? lines.length
    const { intro, sections } = sectionsIn(lines, top.index + 1, end)
    const base = partFrom(top.text, 0)
    const unit: CoursePart = { ...base, order: 0, intro, sections, range: rangeOf(sections) }
    if (unit.kind === 'extra') extras.push(unit)
    else parts.push(unit)
  })

  parts.forEach((part, i) => {
    part.order = i + 1
  })

  return { header, front, parts, extras }
}

/* --- cross-references ----------------------------------------------------- */

export interface SectionRef {
  /** `'33'` or `'E.3'` — how the prose spells it. */
  key: string
  /** The part page the section lives on. */
  partSlug: string
  anchor: string
  /** For a link title: "§33 — Why attention is communication". */
  label: string
}

/**
 * Every destination a `§` in the prose can name, keyed the way it is written.
 *
 * Built across the WHOLE course rather than per page, because the whole point
 * of the author's numbering is that it ignores part boundaries.
 */
export function referenceMap(course: Course): Map<string, SectionRef> {
  const refs = new Map<string, SectionRef>()
  for (const part of course.parts) {
    for (const section of part.sections) {
      const key = section.number !== null ? String(section.number) : section.key
      if (key === null) continue
      refs.set(key, { key, partSlug: part.slug, anchor: section.anchor, label: section.labelText })
    }
  }
  return refs
}

/** Every completable section, flattened. The order is the document's. */
export function allSections(course: Course): { part: CoursePart; section: CourseSection }[] {
  return course.parts.flatMap((part) => part.sections.map((section) => ({ part, section })))
}
