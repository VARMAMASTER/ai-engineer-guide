import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import HardwareTopic from '@/components/HardwareTopic'
import type { HwTopic } from '@/lib/content/schema'

/**
 * Same rule as `hwSlug` in `components/HardwareIndex.tsx`, spelled out again
 * rather than imported: that module is `'use client'`, and a function exported
 * from a client module cannot be *called* on the server. The unit test pins the
 * two to the same seven slugs.
 */
function resolve(slug: string): HwTopic | undefined {
  return content.hwTopics.find((t) => t.id === `hwt-${slug}`)
}

/** All seven, prerendered — the bank is fixed and tiny. */
export function generateStaticParams() {
  return content.hwTopics.map((t) => ({ topic: t.id.replace(/^hwt-/, '') }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>
}): Promise<Metadata> {
  const { topic: slug } = await params
  const topic = resolve(slug)
  if (!topic) return {}
  return { title: `${topic.name} | GPU / Hardware | AI Engineer Practice Guide` }
}

export default async function HardwareTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic: slug } = await params
  const topic = resolve(slug)
  if (!topic) notFound()

  const questions = content.hwQuestions.filter((q) => q.topicId === topic.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>{topic.name}</h1>
        <p className="text-sm text-[var(--text-muted)]">{topic.summary}</p>
      </div>

      <HardwareTopic questions={questions} />
    </div>
  )
}
