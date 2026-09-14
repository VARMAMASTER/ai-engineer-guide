import { notFound } from 'next/navigation'
import CourseContents from '@/components/CourseContents'
import { coursePage, courseParams } from '@/lib/courses'

export async function generateStaticParams() {
  return courseParams()
}

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params
  const page = coursePage(course)
  return {
    title: page ? `${page.header.title} | Unyfide` : 'Courses | Unyfide',
    description: page ? page.header.blurb : undefined,
  }
}

export default async function CoursePageRoute({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params
  const page = coursePage(course)
  if (!page) notFound()

  return <CourseContents page={page} />
}
