import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import { LldPatternDetail, LldProblemDetail } from '@/components/LldDetail'
import type { LldPattern, LldQuestion } from '@/lib/content/schema'

/**
 * One dynamic segment serves both banks.
 *
 * Patterns (`lldp-`) and machine coding problems (`lldq-`) are two views of the
 * same subject and link to each other constantly, so splitting them across
 * `/lld/patterns/[x]` and `/lld/problems/[y]` would buy nothing but longer
 * URLs. Ids are unique across the two banks (content validation enforces it),
 * so the prefix is redundant in the URL: `/lld/solid` and `/lld/parking-lot`.
 */
type Resolved =
  | { kind: 'pattern'; pattern: LldPattern }
  | { kind: 'problem'; question: LldQuestion }

function resolve(slug: string): Resolved | undefined {
  const pattern = content.lldPatterns.find((p) => p.id === `lldp-${slug}`)
  if (pattern) return { kind: 'pattern', pattern }

  const question = content.lldQuestions.find((q) => q.id === `lldq-${slug}`)
  if (question) return { kind: 'problem', question }

  return undefined
}

/**
 * Same rule as `lldSlug` in `components/LldIndex.tsx`, spelled out again rather
 * than imported: that module is `'use client'`, and a function exported from a
 * client module cannot be *called* on the server — only rendered as a
 * component. The unit test pins the two to the same 33 slugs.
 */
export function generateStaticParams() {
  return [...content.lldPatterns, ...content.lldQuestions].map((item) => ({
    slug: item.id.replace(/^lld[pq]-/, ''),
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const found = resolve(slug)
  if (!found) return {}
  const name = found.kind === 'pattern' ? found.pattern.name : found.question.name
  return { title: `${name} | LLD | AI Engineer Practice Guide` }
}

export default async function LldSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const found = resolve(slug)
  if (!found) notFound()

  return found.kind === 'pattern' ? (
    <LldPatternDetail pattern={found.pattern} />
  ) : (
    <LldProblemDetail question={found.question} />
  )
}
