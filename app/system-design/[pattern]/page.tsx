import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import { slugOf, idFromSlug } from '@/lib/content/ids'
import QuestionFramework from '@/components/QuestionFramework'

function resolvePattern(slug: string) {
  const generalId = idFromSlug('sdp', slug)
  const mlId = idFromSlug('mlp', slug)
  return content.sdPatterns.find((p) => p.id === generalId || p.id === mlId)
}

export async function generateStaticParams() {
  return content.sdPatterns.map((p) => ({ pattern: slugOf(p.id) }))
}

export async function generateMetadata({
  params,
}: PageProps<'/system-design/[pattern]'>): Promise<Metadata> {
  const { pattern: slug } = await params
  const pattern = resolvePattern(slug)
  if (!pattern) return {}
  return { title: `${pattern.name} | System Design | AI Engineer Practice Guide` }
}

export default async function SystemDesignPatternPage({
  params,
}: PageProps<'/system-design/[pattern]'>) {
  const { pattern: slug } = await params
  const pattern = resolvePattern(slug)
  if (!pattern) notFound()

  const questions = content.sdQuestions
    .filter((q) => q.patternId === pattern.id)
    .sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow">{pattern.group === 'ml' ? 'ML & LLM' : 'General'}</p>
        <h1 className="mt-1">{pattern.name}</h1>
      </div>

      <section className="panel flex min-w-0 flex-col gap-2 rounded-[var(--radius)] p-4">
        <h2 className="eyebrow">What it solves</h2>
        <p className="text-sm">{pattern.solves}</p>
      </section>

      <section className="panel flex min-w-0 flex-col gap-2 rounded-[var(--radius)] p-4">
        <h2 className="eyebrow">Trade-offs</h2>
        <ul className="flex flex-col gap-1.5 pl-4 text-sm">
          {pattern.tradeoffs.map((t) => (
            <li key={t} className="list-disc marker:text-[var(--text-faint)]">
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2>
            Questions
          </h2>
          {/* Said once per page rather than once per question: the reveal is the
              rule of the bank, not a per-question affordance to re-explain. */}
          <p className="text-sm text-[var(--text-muted)]">
            Expanding a question gives you the pacing budget, the opening sentence and the
            prompts. Attempt it first — the reference answer, the estimates and the architecture
            diagram stay hidden until you ask for them.
          </p>
        </div>
        <ul className="flex min-w-0 flex-col gap-3">
          {questions.map((q) => (
            <QuestionFramework key={q.id} question={q} />
          ))}
        </ul>
      </section>
    </div>
  )
}
