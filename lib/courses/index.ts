/* ============================================================================
   Loading a course. SERVER ONLY.
   ----------------------------------------------------------------------------
   Reads the author's Markdown off disk, parses it once, and renders the page a
   route asks for. Every route under `app/courses` is prerendered, so all of
   this runs during `next build` and none of it runs per request — the
   filesystem read below is a build-time read, not a server dependency, and the
   deployed pages are static files.

   `lib/courses/parse.ts` and `lib/courses/render.ts` stay free of `node:fs` so
   they can be tested on a fixture; this module is the only one that touches the
   disk, and the only one a page imports.
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { courseMeta, courses, type CourseMeta } from '@/content/courses/index'
import {
  allSections,
  parseCourse,
  referenceMap,
  type Course,
  type CoursePart,
  type CourseSection,
  type SectionRef,
} from './parse'
import { pageRenderer, renderBlocks, type CourseBlock } from './render'

/** `/courses` — the section's own front door, and the base for every course. */
export const COURSES_HREF = '/courses'

export function courseHref(slug: string): string {
  return `${COURSES_HREF}/${slug}`
}

export function partHref(slug: string, partSlug: string): string {
  return `${COURSES_HREF}/${slug}/${partSlug}`
}

/**
 * The completion id for one section.
 *
 * Follows the convention every other bank uses — a short bank prefix and a
 * stable key, `crs-nn-s33` alongside `cst-networking` and `dsa-217-…` — so it
 * lands in the same `completed` map, feeds the same streak and syncs through
 * the same `learn_completion` row shape without a parallel scheme.
 *
 * Derived from the section NUMBER rather than its title, so completing §33 and
 * then renaming §33 does not silently reset it.
 */
export function sectionItemId(meta: CourseMeta, section: CourseSection): string | null {
  if (section.number === null && section.key === null) return null
  return `${meta.id}-${section.anchor}`
}

/* --- the parse, cached ---------------------------------------------------- */

export interface LoadedCourse {
  meta: CourseMeta
  course: Course
  refs: Map<string, SectionRef>
}

const cache = new Map<string, LoadedCourse>()

function read(meta: CourseMeta): LoadedCourse {
  const cached = cache.get(meta.slug)
  if (cached) return cached

  // The directory is spelled out, inline, rather than imported as a constant:
  // Turbopack only narrows its trace when it can SEE the prefix at the call
  // site. With a path it cannot read statically it includes the whole project
  // in the server bundle — every source file and all of `public/` — and warns
  // about it. `content/courses` is the only directory this can ever read.
  const markdown = readFileSync(join(process.cwd(), 'content/courses', meta.md), 'utf8')
  const course = parseCourse(markdown)
  const loaded: LoadedCourse = { meta, course, refs: referenceMap(course) }
  cache.set(meta.slug, loaded)
  return loaded
}

export function loadCourse(slug: string): LoadedCourse | undefined {
  const meta = courseMeta(slug)
  return meta ? read(meta) : undefined
}

/** Every course, parsed. The index page's list. */
export function loadCourses(): LoadedCourse[] {
  return courses.map(read)
}

/* --- rendered page models ------------------------------------------------- */

export interface RenderedSection {
  anchor: string
  /** The heading as authored, numbering included. */
  heading: string
  /** The heading without its numbering, for a title that already shows `§33`. */
  label: string
  /** The same label as plain text, for an accessible name or a tooltip. */
  labelText: string
  /**
   * The same label as inline HTML.
   *
   * Section headings are Markdown too — "a network *is* a nested function",
   * "Going professional — `nn.Module` and `torch.optim`", "(Part XXI §141)" —
   * so a heading printed as raw text shows its asterisks and backticks and
   * drops the one cross-reference that lives in a heading.
   */
  labelHtml: string
  number: number | null
  key: string | null
  /** `§33` / `E.3`, or null for an unnumbered section. */
  marker: string | null
  /** The completion id, or null when the author did not number the section. */
  itemId: string | null
  role: 'prose' | 'toc'
  blocks: CourseBlock[]
}

export interface PartPage {
  meta: CourseMeta
  courseTitle: string
  part: CoursePart
  intro: CourseBlock[]
  sections: RenderedSection[]
  /** The parts either side, for reading straight through. */
  prev: CoursePart | null
  next: CoursePart | null
}

function renderSections(
  loaded: LoadedCourse,
  partSlug: string,
  sections: CourseSection[],
): { sections: RenderedSection[]; render: (md: string) => CourseBlock[] } {
  const marked = pageRenderer({
    courseHref: courseHref(loaded.meta.slug),
    partSlug,
    refs: loaded.refs,
  })
  const render = (md: string) => (md.length === 0 ? [] : renderBlocks(md, marked))

  return {
    render,
    sections: sections.map((section) => ({
      anchor: section.anchor,
      heading: section.heading,
      label: section.label,
      labelText: section.labelText,
      labelHtml: marked.parseInline(section.label, { async: false }),
      number: section.number,
      key: section.key,
      marker:
        section.number !== null ? `§${section.number}` : section.key !== null ? section.key : null,
      itemId: sectionItemId(loaded.meta, section),
      role: section.role,
      blocks: section.role === 'toc' ? [] : render(section.markdown),
    })),
  }
}

export function partPage(slug: string, partSlug: string): PartPage | undefined {
  const loaded = loadCourse(slug)
  if (!loaded) return undefined

  const index = loaded.course.parts.findIndex((p) => p.slug === partSlug)
  if (index === -1) return undefined
  const part = loaded.course.parts[index]

  const { sections, render } = renderSections(loaded, partSlug, part.sections)

  return {
    meta: loaded.meta,
    courseTitle: loaded.course.header.title,
    part,
    intro: render(part.intro),
    sections,
    prev: loaded.course.parts[index - 1] ?? null,
    next: loaded.course.parts[index + 1] ?? null,
  }
}

/** One row of the generated contents. */
export interface ContentsSection {
  anchor: string
  marker: string | null
  label: string
  labelText: string
  labelHtml: string
  href: string
  itemId: string | null
}

export interface ContentsPart {
  slug: string
  kicker: string
  title: string
  range: string | null
  href: string
  sections: ContentsSection[]
}

export interface CoursePage {
  meta: CourseMeta
  header: Course['header']
  /** The author's own front matter, with a hole where his TOC was. */
  front: RenderedSection[]
  /** The closing colophon and anything else outside the parts. */
  extras: RenderedSection[]
  /** The contents, in the author's own order. */
  parts: ContentsPart[]
  /** How many sections the author numbered — the completable ones. */
  sectionCount: number
  /** Every completion id this course can write, for the progress readout. */
  itemIds: string[]
}

export function coursePage(slug: string): CoursePage | undefined {
  const loaded = loadCourse(slug)
  if (!loaded) return undefined

  // The front matter and the closing notes share one page, so they share one
  // renderer and one pool of heading ids.
  const marked = pageRenderer({
    courseHref: courseHref(loaded.meta.slug),
    // Not a real part: every `§` from the front matter points at a part page.
    partSlug: '',
    refs: loaded.refs,
  })

  const asSection = (section: CourseSection): RenderedSection => ({
    anchor: section.anchor,
    heading: section.heading,
    label: section.label,
    labelText: section.labelText,
    labelHtml: marked.parseInline(section.label, { async: false }),
    number: section.number,
    key: section.key,
    marker: null,
    itemId: null,
    role: section.role,
    blocks: section.role === 'toc' ? [] : renderBlocks(section.markdown, marked),
  })

  const contents: ContentsPart[] = loaded.course.parts.map((part) => ({
    slug: part.slug,
    kicker: part.kicker,
    title: part.title,
    range: part.range,
    href: partHref(loaded.meta.slug, part.slug),
    sections: part.sections.map((section) => ({
      anchor: section.anchor,
      marker:
        section.number !== null
          ? `§${section.number}`
          : section.key !== null
            ? section.key
            : null,
      label: section.label,
      labelText: section.labelText,
      labelHtml: marked.parseInline(section.label, { async: false }),
      href: `${partHref(loaded.meta.slug, part.slug)}#${section.anchor}`,
      itemId: sectionItemId(loaded.meta, section),
    })),
  }))

  return {
    meta: loaded.meta,
    header: loaded.course.header,
    front: loaded.course.front.map(asSection),
    extras: loaded.course.extras.map((extra) => ({
      anchor: extra.slug,
      heading: extra.heading,
      label: extra.title,
      labelText: extra.title,
      labelHtml: extra.title,
      number: null,
      key: null,
      marker: null,
      itemId: null,
      role: 'prose' as const,
      blocks: renderBlocks(extra.intro, marked),
    })),
    parts: contents,
    sectionCount: allSections(loaded.course).filter((s) => s.section.number !== null).length,
    itemIds: contents.flatMap((p) => p.sections.map((s) => s.itemId).filter((id): id is string => id !== null)),
  }
}

/* --- the section's own index ---------------------------------------------- */

export interface CourseCard {
  slug: string
  title: string
  blurb: string
  note: string
  author: string
  href: string
  /** Where "start reading" lands: the first part. */
  startHref: string
  partCount: number
  appendixCount: number
  sectionCount: number
  itemIds: string[]
}

/** One card per course, for `/courses`. */
export function courseCards(): CourseCard[] {
  return loadCourses().map(({ meta, course }) => {
    const parts = course.parts.filter((p) => p.kind === 'part')
    return {
      slug: meta.slug,
      title: course.header.title,
      blurb: course.header.blurb,
      note: course.header.note,
      author: meta.author,
      href: courseHref(meta.slug),
      startHref: partHref(meta.slug, course.parts[0].slug),
      partCount: parts.length,
      appendixCount: course.parts.length - parts.length,
      sectionCount: allSections(course).filter((s) => s.section.number !== null).length,
      itemIds: allSections(course)
        .map(({ section }) => sectionItemId(meta, section))
        .filter((id): id is string => id !== null),
    }
  })
}

/* --- static params -------------------------------------------------------- */

export function courseParams(): { course: string }[] {
  return courses.map((c) => ({ course: c.slug }))
}

export function partParams(): { course: string; part: string }[] {
  return loadCourses().flatMap(({ meta, course }) =>
    course.parts.map((part) => ({ course: meta.slug, part: part.slug })),
  )
}
