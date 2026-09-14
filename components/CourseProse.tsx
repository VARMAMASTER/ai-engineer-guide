import Mermaid from './Mermaid'
import type { CourseBlock } from '@/lib/courses/render'
import { cx } from './ui/cx'

/**
 * A run of course content, already rendered.
 *
 * The HTML arrives finished from `lib/courses/render.ts` — parsed and typeset
 * during `next build` — so this component injects it and adds no client
 * JavaScript of its own. That is the whole reason the reader works offline and
 * paints in one pass: there is no Markdown parser, no maths typesetter and no
 * hydration step between the bytes and the words.
 *
 * `dangerouslySetInnerHTML` with no sanitiser is a deliberate, narrow choice.
 * The input is not user content and never touches a request: it is one
 * Markdown file in this repository, written by the app's owner, read from disk
 * at build time. Sanitising it would also strip the `<details>` blocks the
 * author uses for his self-check answers, which are part of how the book works.
 *
 * Mermaid is the exception that cannot be HTML: it is a diagram that has to be
 * drawn in the browser and redrawn when the theme changes, so those blocks are
 * handed to `components/Mermaid.tsx` — the app's single mermaid path, already
 * lazy-loaded and theme-aware — instead.
 */
export default function CourseProse({
  blocks,
  className,
}: {
  blocks: CourseBlock[]
  className?: string
}) {
  if (blocks.length === 0) return null

  return (
    <div className={cx('course-prose min-w-0', className)}>
      {blocks.map((block, i) =>
        block.kind === 'mermaid' ? (
          <Mermaid key={i} source={block.source} />
        ) : (
          <div key={i} className="min-w-0" dangerouslySetInnerHTML={{ __html: block.html }} />
        ),
      )}
    </div>
  )
}
