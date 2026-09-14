import Link from 'next/link'
import CourseProse from './CourseProse'
import { CourseMeter, SectionCount } from './CourseProgress'
import Panel from './ui/Panel'
import type { CoursePage } from '@/lib/courses'

/**
 * A course's front page: the author's own preface, then his table of contents.
 *
 * "This is a reference, not a linear course. Nobody reads 144 sections in
 * order." — the author, in the preface this page renders in full. So there is
 * no lesson 1, no next-unlocks-when-you-finish, no percentage gate. The
 * preface comes first because it tells you which five sections carry the
 * argument and which appendix to read before trusting a number; the contents
 * come second because looking something up is what he expects you to do.
 *
 * The one piece of his document this page does NOT render verbatim is the
 * Markdown table of contents itself: 370 lines of `&nbsp;`-indented links to
 * in-document anchors, which stop existing the moment one document becomes 30
 * pages, and which read as a single wrapped paragraph of 307 links on a phone.
 * It is replaced in place — same position, same order, same entries — by the
 * contents below, generated from the document's own headings, where every
 * entry is a real 44px destination and no link can rot.
 */
export default function CourseContents({ page }: { page: CoursePage }) {
  const { header, meta, parts } = page
  const start = parts[0]

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex min-w-0 flex-col gap-3">
        <p className="eyebrow">Course</p>
        <h1>{header.title}</h1>
        {header.blurb ? (
          <p className="course-measure text-base text-[var(--text-muted)]">{header.blurb}</p>
        ) : null}
        <p className="text-sm">
          by <span className="font-medium">{meta.author}</span>
        </p>
        {header.note ? (
          <p className="course-measure text-sm italic text-[var(--text-faint)]">{header.note}</p>
        ) : null}
      </header>

      <Panel className="flex min-w-0 flex-col gap-4 p-4 md:p-6">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="readout text-[var(--text-muted)]">{page.parts.length} parts</span>
          <span className="readout text-[var(--text-muted)]">
            {page.sectionCount} sections
          </span>
        </div>
        <CourseMeter itemIds={page.itemIds} label={`${header.title} sections read`} />
        {/* A navigation, so a real link wearing the button's own classes —
            `ui/Button` is a `<button>` by design and this is not an action. */}
        {start ? (
          <Link href={start.href} className="btn btn-accent self-start">
            Start reading
          </Link>
        ) : null}
      </Panel>

      {page.front.map((section) =>
        section.role === 'toc' ? (
          <section key={section.anchor} id="contents" className="flex min-w-0 scroll-mt-24 flex-col gap-3">
            <h2>Contents</h2>
            <p className="course-measure text-sm text-[var(--text-muted)]">
              Sections are self-contained and numbered across the whole book, so
              <span className="readout"> §33</span> means section 33 wherever it lives.
            </p>
            <ol className="flex min-w-0 flex-col gap-3">
              {parts.map((part) => (
                <li key={part.slug} className="min-w-0">
                  <Panel tier="solid" className="flex min-w-0 flex-col gap-1 p-3 md:p-4">
                    <div className="flex min-w-0 items-baseline justify-between gap-3">
                      <h3 className="min-w-0">
                        <Link
                          href={part.href}
                          className="course-title flex min-h-11 min-w-0 items-center hover:text-[var(--accent)]"
                        >
                          {part.kicker ? `${part.kicker} — ` : ''}
                          {part.title}
                        </Link>
                      </h3>
                      <SectionCount
                        itemIds={part.sections
                          .map((s) => s.itemId)
                          .filter((id): id is string => id !== null)}
                        label={`${part.kicker} sections read`}
                      />
                    </div>
                    {part.range ? (
                      <p className="readout text-[var(--text-muted)]">{part.range}</p>
                    ) : null}
                    {part.sections.length > 0 ? (
                      <ul className="flex min-w-0 flex-col">
                        {part.sections.map((entry) => (
                          <li key={entry.anchor} className="min-w-0">
                            <Link
                              href={entry.href}
                              className="flex min-h-11 min-w-0 items-baseline gap-2.5 rounded-[var(--radius-sm)] px-1 py-2.5 text-sm transition-colors hover:bg-[var(--accent-soft)]"
                            >
                              {entry.marker ? (
                                <span className="readout shrink-0 text-[var(--accent)]">
                                  {entry.marker}
                                </span>
                              ) : null}
                              <span className="min-w-0">{entry.labelText}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Panel>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section
            key={section.anchor}
            id={section.anchor}
            className="flex min-w-0 scroll-mt-24 flex-col gap-3"
          >
            <h2 className="course-measure">
              <span dangerouslySetInnerHTML={{ __html: section.labelHtml }} />
            </h2>
            <CourseProse blocks={section.blocks} className="course-measure" />
          </section>
        ),
      )}

      {page.extras.map((extra) => (
        <section
          key={extra.anchor}
          id={extra.anchor}
          className="flex min-w-0 scroll-mt-24 flex-col gap-3 border-t border-[var(--panel-border)] pt-6"
        >
          <h2 className="course-measure course-title">{extra.label}</h2>
          <CourseProse blocks={extra.blocks} className="course-measure" />
        </section>
      ))}
    </div>
  )
}
