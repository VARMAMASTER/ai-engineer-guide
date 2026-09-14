/**
 * Extract the shippable outline of every course.
 *
 * Writes `content/courses/outlines.generated.ts`, which is the only piece of a
 * course that reaches the browser bundle — the titles and anchors the command
 * palette indexes. See `lib/courses/outline.ts` for why it is generated rather
 * than read at runtime.
 *
 *   pnpm tsx scripts/generate-course-outlines.ts          # write
 *   pnpm tsx scripts/generate-course-outlines.ts --check   # verify only
 *
 * `--check` is what `pnpm validate` runs, so a course edited without
 * regenerating fails the build instead of shipping a stale palette.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { courses, coursePath } from '../content/courses/index'
import { parseCourse } from '../lib/courses/parse'
import { buildOutline, type CourseOutline } from '../lib/courses/outline'

export const OUTLINE_FILE = 'content/courses/outlines.generated.ts'

const HEADER = `/* GENERATED FILE — do not edit.
 *
 * Written by \`scripts/generate-course-outlines.ts\` from the Markdown in
 * \`content/courses/\`. Regenerate with:
 *
 *   pnpm tsx scripts/generate-course-outlines.ts
 *
 * \`pnpm validate\` re-parses the source documents and fails if this file has
 * drifted from them, so it can never quietly go stale.
 */
import type { CourseOutline } from '@/lib/courses/outline'

export const courseOutlines: CourseOutline[] = `

export function outlines(root = process.cwd()): CourseOutline[] {
  return courses.map((meta) =>
    buildOutline(meta, parseCourse(readFileSync(join(root, coursePath(meta)), 'utf8'))),
  )
}

export function renderOutlineModule(built: CourseOutline[]): string {
  return `${HEADER}${JSON.stringify(built, null, 2)}\n`
}

/**
 * Is the committed module still the one this document produces?
 *
 * Compared with line endings normalised, because git checks this file out with
 * CRLF on Windows while the generator writes LF. A byte comparison fails on a
 * fresh clone — and since `pnpm validate` runs this check, it would fail the
 * BUILD, over a file nobody had touched. Found exactly that way: the first run
 * of the drift check in a clean worktree failed for this and nothing else.
 */
export function outlineModuleMatches(current: string, next: string): boolean {
  return current.replace(/\r\n/g, '\n') === next.replace(/\r\n/g, '\n')
}

function main(): void {
  const root = process.cwd()
  const next = renderOutlineModule(outlines(root))
  const path = join(root, OUTLINE_FILE)

  if (process.argv.includes('--check')) {
    let current = ''
    try {
      current = readFileSync(path, 'utf8')
    } catch {
      current = ''
    }
    if (!outlineModuleMatches(current, next)) {
      console.error(
        `${OUTLINE_FILE} is out of date. Run: pnpm tsx scripts/generate-course-outlines.ts`,
      )
      process.exit(1)
    }
    console.log(`${OUTLINE_FILE} is up to date`)
    return
  }

  writeFileSync(path, next, 'utf8')
  const sections = outlines(root).reduce(
    (n, c) => n + c.parts.reduce((m, p) => m + p.sections.length, 0),
    0,
  )
  console.log(`wrote ${OUTLINE_FILE}: ${courses.length} course(s), ${sections} sections`)
}

if (process.argv[1]?.includes('generate-course-outlines')) main()
