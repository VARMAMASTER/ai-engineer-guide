import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import { slugOf, idFromSlug } from '@/lib/content/ids'
import CsFundamentalsTopic from '@/components/CsFundamentalsTopic'

export async function generateStaticParams() {
  return content.csTopics.map((t) => ({ topic: slugOf(t.id) }))
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params
  const topic = content.csTopics.find((t) => t.id === idFromSlug('cst', slug))
  return { title: topic ? `${topic.name} | AI Engineer Practice Guide` : 'CS Fundamentals' }
}

export default async function CsTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params
  const topic = content.csTopics.find((t) => t.id === idFromSlug('cst', slug))
  if (!topic) notFound()

  const questions = content.csQuestions.filter((q) => q.topicId === topic.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>{topic.name}</h1>
        <p className="text-sm text-[var(--text-muted)]">{topic.summary}</p>
      </div>

      <CsFundamentalsTopic questions={questions} />
    </div>
  )
}
