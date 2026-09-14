import Link from 'next/link'
import Checkbox from './Checkbox'
import CourseProse from './CourseProse'
import { CourseMeter } from './CourseProgress'
import Card from './ui/Card'
import Panel from './ui/Panel'
import { courseHref, type PartPage } from '@/lib/courses'
import type { CoursePart as CoursePartMeta } from '@/lib/courses/parse'

/**
 * One PART of a course: its prose, its sections, and a way onwards.
 *
 * Why a part and not a section is the page (spec decision, 2026-09-14): the
 * document has 21 parts and 144 sections. A route per section is 144 pages of
 * build output, 144 near-empty documents, and a reader who has to navigate
 * between two paragraphs. A route per part is 29 pages, and the author's own
 * `§`-numbering — which ignores part boundaries by design — works as anchors
 * inside them. `§33` is a link either way; only the page count changes.
 *
 * A section is completable, the way a DSA problem or a CS question is, and it
 * writes to the same store under `crs-<course>-s<n>`. The checkbox sits at the
 * END of the section rather than beside its heading: you tick it when you have
 * read the thing, and putting it at the top invites ticking what you skimmed.
 */

function PartLink({ part, courseSlug, direction }: { part: CoursePartMeta; courseSlug: string; direction: 'prev' | 'next' }) {
  return (
    <Card
      href={`${courseHref(courseSlug)}/${part.slug}`}
      className="flex min-h-11 min-w-0 flex-col gap-1 p-4"
    >
      <span className="eyebrow">{direction === 'prev' ? 'Previous' : 'Next'}</span>
      <span className="text-sm font-medium">
        {part.kicker}
        {part.kicker ? ' — ' : ''}
        {part.title}
      </span>
    </Card>
  )
}

export default function CoursePart({ page }: { page: PartPage }) {
  const { part, meta, courseTitle, sections } = page
  const home = courseHref(meta.slug)
  const itemIds = sections.map((s) => s.itemId).filter((id): id is string => id !== null)

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <Panel className="flex min-w-0 flex-col gap-3 p-4 md:p-6">
        <p className="eyebrow">
          {part.kicker}
          {part.range ? ` · ${part.range}` : ''}
        </p>
        <h1 className="course-title">{part.title}</h1>
        <p className="text-sm text-[var(--text-muted)]">
          <Link href={home} className="text-[var(--accent)] underline decoration-[var(--accent-line)] underline-offset-2">
            {courseTitle}
          </Link>{' '}
          by {meta.author}
        </p>
        {itemIds.length > 0 ? (
          <CourseMeter itemIds={itemIds} label={`${part.kicker} sections read`} />
        ) : null}
      </Panel>

      <CourseProse blocks={page.intro} className="course-measure" />

      {sections.length > 1 ? (
        <Panel className="flex min-w-0 flex-col gap-1 p-4 md:p-5">
          <h2 className="eyebrow">In this part</h2>
          <ul className="flex min-w-0 flex-col">
            {sections.map((section) => (
              <li key={section.anchor} className="min-w-0">
                <a
                  href={`#${section.anchor}`}
                  className="flex min-h-11 min-w-0 items-baseline gap-2.5 rounded-[var(--radius-sm)] px-1 py-2.5 text-sm transition-colors hover:bg-[var(--accent-soft)]"
                >
                  {section.marker ? (
                    <span className="readout shrink-0 text-[var(--accent)]">{section.marker}</span>
                  ) : null}
                  <span className="min-w-0">{section.labelText}</span>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {sections.map((section) => (
        <section
          key={section.anchor}
          id={section.anchor}
          className="flex min-w-0 scroll-mt-24 flex-col gap-3 border-t border-[var(--panel-border)] pt-6"
        >
          <h2 className="course-measure flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
            {section.marker ? (
              <span className="readout shrink-0 text-[var(--accent)]">{section.marker}</span>
            ) : null}
            {/* The heading is Markdown: emphasis, code spans, and in the
                appendices a `§` cross-reference. Rendered at build time. */}
            <span className="min-w-0" dangerouslySetInnerHTML={{ __html: section.labelHtml }} />
          </h2>

          <CourseProse blocks={section.blocks} className="course-measure" />

          {section.itemId !== null ? (
            <div className="course-measure mt-2 border-t border-[var(--panel-border)] pt-1">
              <Checkbox
                itemId={section.itemId}
                label={
                  <span>
                    Mark{' '}
                    <span className="readout">{section.marker ?? section.labelText}</span> as read
                  </span>
                }
                labelText={`Mark ${section.marker ?? ''} ${section.labelText} as read`.trim()}
              />
            </div>
          ) : null}
        </section>
      ))}

      <nav aria-label="Course parts" className="grid min-w-0 gap-3 md:grid-cols-2">
        {page.prev ? (
          <PartLink part={page.prev} courseSlug={meta.slug} direction="prev" />
        ) : (
          <Card href={home} className="flex min-h-11 min-w-0 flex-col gap-1 p-4">
            <span className="eyebrow">Contents</span>
            <span className="text-sm font-medium">{courseTitle}</span>
          </Card>
        )}
        {page.next ? <PartLink part={page.next} courseSlug={meta.slug} direction="next" /> : null}
      </nav>
    </div>
  )
}
