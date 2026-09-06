import type { Metadata } from 'next'
import ProjectIndex from '@/components/ProjectIndex'

export const metadata: Metadata = {
  title: 'Projects | AI Engineer Practice Guide',
}

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>Projects</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Six shipped projects, one per month, each defended with generated docs.
        </p>
      </div>

      <ProjectIndex />
    </div>
  )
}
