/* ============================================================================
   The course outline — the half of a course that is small enough to ship.
   ----------------------------------------------------------------------------
   The command palette has to reach all 144 sections plus the parts and the
   appendices, and it builds its index in the BROWSER. The course itself is a
   365KB Markdown document read off disk with `node:fs`, so neither the document
   nor the parser can be part of that build.

   What the palette actually needs is 190 titles and 190 anchors — about 12KB.
   So the outline is extracted at author time into
   `content/courses/outlines.generated.ts` by `scripts/generate-course-outlines.ts`,
   committed, and pulled in through the same lazy `import()` the rest of the
   search index already uses. `pnpm validate` re-parses the document and fails
   the build if the committed outline no longer matches it, which is the part
   that keeps a generated file honest.

   Everything here is pure: no filesystem, no `marked`, no `katex`. It is shared
   by the generator, the drift check and the search index.
   ========================================================================== */

import type { CourseMeta } from '@/content/courses/index'
import type { Course } from './parse'

export interface OutlineSection {
  /** The anchor on its part's page: `s33`, `se3`. */
  anchor: string
  /** How the prose refers to it — `§33`, `E.3` — or null if it does not. */
  marker: string | null
  /** The heading, its numbering removed and its Markdown stripped. */
  label: string
}

export interface OutlinePart {
  /** URL segment under the course. */
  slug: string
  /** `Part VI`, `Appendix C`. */
  kicker: string
  /** The part heading, as the author cased it. */
  title: string
  /** `§48–55`, or null for an appendix. */
  range: string | null
  sections: OutlineSection[]
}

export interface CourseOutline {
  slug: string
  title: string
  author: string
  parts: OutlinePart[]
}

/** The shippable outline of a parsed course. Pure. */
export function buildOutline(meta: CourseMeta, course: Course): CourseOutline {
  return {
    slug: meta.slug,
    title: course.header.title,
    author: meta.author,
    parts: course.parts.map((part) => ({
      slug: part.slug,
      kicker: part.kicker,
      title: part.title,
      range: part.range,
      sections: part.sections.map((section) => ({
        anchor: section.anchor,
        marker:
          section.number !== null
            ? `§${section.number}`
            : section.key !== null
              ? section.key
              : null,
        label: section.labelText,
      })),
    })),
  }
}
