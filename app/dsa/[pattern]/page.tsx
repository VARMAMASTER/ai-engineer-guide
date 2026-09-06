import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import { slugOf, idFromSlug } from '@/lib/content/ids'
import ProblemList from '@/components/ProblemList'

function resolvePattern(slug: string) {
  return content.dsaPatterns.find((p) => p.id === idFromSlug('dsap', slug))
}

export function generateStaticParams() {
  return content.dsaPatterns.map((p) => ({ pattern: slugOf(p.id) }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pattern: string }>
}): Promise<Metadata> {
  const { pattern: slug } = await params
  const pattern = resolvePattern(slug)
  if (!pattern) return {}
  return { title: `${pattern.name} | DSA | AI Engineer Practice Guide` }
}

export default async function DsaPatternPage({
  params,
}: {
  params: Promise<{ pattern: string }>
}) {
  const { pattern: slug } = await params
  const pattern = resolvePattern(slug)
  if (!pattern) notFound()

  const problems = content.dsaProblems.filter((p) => p.patternId === pattern.id)

  return (
    <article className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">DSA pattern</p>
        <h1 className="mt-1">{pattern.name}</h1>
      </div>

      <section>
        <h2 className="eyebrow mb-2">Reach for this when</h2>
        <ul className="list-disc pl-5">
          {pattern.signals.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-2">Template</h2>
        <pre className="code-block overflow-x-auto">
          <code>{pattern.template}</code>
        </pre>
      </section>

      <section>
        <h2 className="eyebrow mb-2">Pitfalls</h2>
        <ul className="list-disc pl-5">
          {pattern.pitfalls.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-2">Problems</h2>
        <ProblemList problems={problems} />
      </section>
    </article>
  )
}
