import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import { slugOf, idFromSlug } from '@/lib/content/ids'
import Checkbox from '@/components/Checkbox'

export async function generateStaticParams() {
  return content.topics.map((t) => ({ topic: slugOf(t.id) }))
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params
  const topic = content.topics.find((t) => t.id === idFromSlug('topic', slug))
  return { title: topic ? `${topic.name} | AI Engineer Practice Guide` : 'Topic' }
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params
  const topic = content.topics.find((t) => t.id === idFromSlug('topic', slug))
  if (!topic) notFound()

  const questions = content.topicQuestions.filter((q) => q.topicId === topic.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>{topic.name}</h1>
        <p className="text-sm text-[var(--text-muted)]">{topic.summary}</p>
      </div>

      <div className="panel flex flex-col gap-0.5 p-2">
        {questions.map((q) => (
          <Checkbox key={q.id} itemId={q.id} label={q.text} meta={`${q.minutes}m`} />
        ))}
      </div>
    </div>
  )
}
