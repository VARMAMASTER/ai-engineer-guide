import { notFound } from 'next/navigation'
import { content } from '@/lib/content/index'
import { slugOf, idFromSlug } from '@/lib/content/ids'
import ProjectDetail from '@/components/ProjectDetail'

export async function generateStaticParams() {
  return content.projects.map((p) => ({ project: slugOf(p.id) }))
}

export async function generateMetadata({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params
  const project = content.projects.find((p) => p.id === idFromSlug('proj', slug))
  return { title: project ? `${project.name} | AI Engineer Practice Guide` : 'Project' }
}

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params
  const id = idFromSlug('proj', slug)
  const exists = content.projects.some((p) => p.id === id)
  if (!exists) notFound()

  return <ProjectDetail projectId={id} />
}
