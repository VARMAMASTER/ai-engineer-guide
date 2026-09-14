import { notFound } from 'next/navigation'
import CoursePart from '@/components/CoursePart'
import { partPage, partParams } from '@/lib/courses'

/**
 * One page per PART — 29 of them for this course, not 144 for its sections.
 *
 * Every section inside is an anchor derived from its own number, so the
 * author's `§33` is a real link and a deep link into the middle of a part
 * still lands on the right paragraph.
 */
export async function generateStaticParams() {
  return partParams()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; part: string }>
}) {
  const { course, part } = await params
  const page = partPage(course, part)
  if (!page) return { title: 'Courses | Unyfide' }

  const name = page.part.kicker ? `${page.part.kicker} — ${page.part.title}` : page.part.title
  return {
    title: `${name} | ${page.courseTitle} | Unyfide`,
    description: page.part.range
      ? `${name}. Sections ${page.part.range}.`
      : name,
  }
}

export default async function CoursePartRoute({
  params,
}: {
  params: Promise<{ course: string; part: string }>
}) {
  const { course, part } = await params
  const page = partPage(course, part)
  if (!page) notFound()

  return <CoursePart page={page} />
}
