import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import CompanyDetail from '@/components/CompanyDetail'
import { companySlug } from '@/components/CompanyIndex'
import type { CompanyGuide } from '@/lib/content/schema'

function resolve(slug: string): CompanyGuide | undefined {
  return content.companyGuides.find((g) => g.id === `co-${slug}`)
}

/** All six, prerendered — the bank is fixed and tiny. */
export function generateStaticParams() {
  return content.companyGuides.map((g) => ({ slug: companySlug(g.id) }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = resolve(slug)
  if (!guide) return {}
  return { title: `${guide.name} | Companies | AI Engineer Practice Guide` }
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = resolve(slug)
  if (!guide) notFound()

  return <CompanyDetail guide={guide} />
}
