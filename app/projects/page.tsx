import Link from 'next/link'
import { content } from '@/lib/content/index'
import { slugOf } from '@/lib/content/ids'

export const metadata = { title: 'Projects | AI Engineer Practice Guide' }

export default function ProjectsPage() {
  const projects = [...content.projects].sort((a, b) => a.month - b.month)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>Projects</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Six shipped projects, one per month, each defended with generated docs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${slugOf(p.id)}`}
            className="panel card flex min-w-0 flex-col gap-2 p-4"
          >
            <span className="eyebrow">Month {p.month}</span>
            <h2>{p.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{p.goal}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
