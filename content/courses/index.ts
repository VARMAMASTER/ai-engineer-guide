/**
 * The course bank.
 *
 * Unlike every other bank in `content/`, a course is not a TypeScript array of
 * records — it is one long Markdown document written by a human, and it stays
 * that way. `lib/courses/parse.ts` reads the document's own structure (parts,
 * numbered sections, the `§N` cross-references) rather than asking an author to
 * restate it as data, so the file on disk is still the thing you would hand
 * somebody to read.
 *
 * This module therefore holds only what the document cannot say about itself:
 * where it lives, who wrote it, and the id prefix its completions are stored
 * under. Title, tagline and every heading are parsed out of the Markdown, so
 * they can never drift from the prose.
 */

export interface CourseMeta {
  /**
   * Stable id, and the prefix for every completion this course writes:
   * `crs-nn-s33` is section 33 of this course. Short on purpose — it is stored
   * once per completed section, in localStorage and in `learn_completion`.
   */
  id: string
  /** URL segment under `/courses`. */
  slug: string
  /** Credited in the UI on every page of the course. */
  author: string
  /**
   * The Markdown file's NAME, not its path.
   *
   * A name rather than a path so the only filesystem read in the feature
   * (`lib/courses/index.ts`) can join it onto a literal directory. Turbopack
   * traces a `readFileSync` whose path it cannot see statically by including
   * the ENTIRE project — every source file and all of `public/` — in the
   * server bundle, which it warns about by name. A constant prefix plus this
   * name keeps the trace to `content/courses`.
   */
  md: string
}

/** The one directory courses live in. Statically known; see `CourseMeta.md`. */
export const COURSE_DIR = 'content/courses'

export const courses: CourseMeta[] = [
  {
    id: 'crs-nn',
    slug: 'neural-networks-end-to-end',
    author: 'Sai Kiran Varma',
    md: 'neural-networks-end-to-end.md',
  },
]

export function courseMeta(slug: string): CourseMeta | undefined {
  return courses.find((c) => c.slug === slug)
}

/** The course's Markdown, relative to the repository root. */
export function coursePath(meta: CourseMeta): string {
  return `${COURSE_DIR}/${meta.md}`
}
