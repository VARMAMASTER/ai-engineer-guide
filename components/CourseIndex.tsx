import Link from 'next/link'
import { CourseMeter } from './CourseProgress'
import Panel from './ui/Panel'
import { courseCards } from '@/lib/courses'

/**
 * The Courses section of Learn: long-form books, read in the app.
 *
 * A section of Learn rather than a fifth app, because that is what it is —
 * study material, sitting beside DSA and AI/ML, feeding the same progress and
 * the same streak. Public and login-free like the rest of the study half.
 */
export default function CourseIndex() {
  const cards = courseCards()

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h1>Courses</h1>
        <p className="course-measure text-sm text-[var(--text-muted)]">
          Long-form material, written to be read rather than skimmed. Sections
          are numbered across a whole book and cross-referenced by number, so
          you can start anywhere and follow the references.
        </p>
      </div>

      <ul className="flex min-w-0 flex-col gap-4">
        {cards.map((card) => (
          <li key={card.slug} className="min-w-0">
            <Panel className="flex min-w-0 flex-col gap-4 p-4 md:p-6">
              <div className="flex min-w-0 flex-col gap-2">
                <h2 className="min-w-0">
                  <Link href={card.href} className="hover:text-[var(--accent)]">
                    {card.title}
                  </Link>
                </h2>
                <p className="course-measure text-sm text-[var(--text-muted)]">{card.blurb}</p>
                <p className="text-sm">
                  by <span className="font-medium">{card.author}</span>
                </p>
              </div>

              <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="readout text-[var(--text-muted)]">{card.partCount} parts</span>
                <span className="readout text-[var(--text-muted)]">
                  {card.appendixCount} appendices
                </span>
                <span className="readout text-[var(--text-muted)]">
                  {card.sectionCount} sections
                </span>
              </div>

              <CourseMeter itemIds={card.itemIds} label={`${card.title} sections read`} />

              <div className="flex min-w-0 flex-wrap gap-3">
                <Link href={card.href} className="btn btn-accent">
                  Contents
                </Link>
                <Link href={card.startHref} className="btn btn-quiet">
                  Start reading
                </Link>
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  )
}
