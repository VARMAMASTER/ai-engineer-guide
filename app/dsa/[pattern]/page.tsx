import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import { idFromSlug } from '@/lib/content/ids'
import ProblemList from '@/components/ProblemList'

export function generateStaticParams() {
  return content.dsaPatterns.map((p) => ({ pattern: p.id.slice('dsap-'.length) }))
}

export default async function DsaPatternPage({
  params,
}: {
  params: Promise<{ pattern: string }>
}) {
  const { pattern: slug } = await params
  const pattern = content.dsaPatterns.find((p) => p.id === idFromSlug('dsap', slug))
  if (!pattern) notFound()

  const problems = content.dsaProblems.filter((p) => p.patternId === pattern.id)

  return (
    <article className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{pattern.name}</h1>

      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wide text-[var(--text-muted)]">
          Reach for this when
        </h2>
        <ul className="list-disc pl-5">
          {pattern.signals.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wide text-[var(--text-muted)]">
          Template
        </h2>
        <pre className="code-block overflow-x-auto">
          <code>{pattern.template}</code>
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wide text-[var(--text-muted)]">
          Pitfalls
        </h2>
        <ul className="list-disc pl-5">
          {pattern.pitfalls.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm uppercase tracking-wide text-[var(--text-muted)]">
          Problems
        </h2>
        <ProblemList problems={problems} />
      </section>
    </article>
  )
}
