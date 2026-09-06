import { content, docsForProject } from '@/lib/content/index'
import Checkbox from './Checkbox'

interface Props {
  projectId: string
}

const MONTHS = [
  '', 'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6',
]

/**
 * A shipped-project brief: name and month, goal, the architecture diagram,
 * constraints, the four milestones (each a card with its own checkbox), the
 * seven generated defense docs, then the defense questions as plain prose.
 *
 * The architecture field is preformatted ASCII, so it renders in `.code-block`
 * — a solid surface with its own horizontal scroll — never inside a glass
 * panel.
 */
export default function ProjectDetail({ projectId }: Props) {
  const project = content.projects.find((p) => p.id === projectId)
  if (!project) return null

  const milestones = content.milestones
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => a.order - b.order)
  const docs = docsForProject(projectId).sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="eyebrow">{MONTHS[project.month] ?? `Month ${project.month}`}</span>
        <h1>{project.name}</h1>
      </div>

      <p>{project.goal}</p>

      <pre className="code-block whitespace-pre">{project.architecture}</pre>

      <div className="flex flex-col gap-2">
        <h2>Constraints</h2>
        <ul className="list-disc pl-5 text-sm">
          {project.constraints.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        {milestones.map((m, i) => (
          <div key={m.id} className="panel flex flex-col gap-3 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3>
                Milestone {i + 1}: {m.title}
              </h3>
              <span className="readout shrink-0 text-[var(--text-muted)]">{m.hours}h</span>
            </div>

            <ul className="list-disc pl-5 text-sm">
              {m.scope.map((s, si) => (
                <li key={si}>{s}</li>
              ))}
            </ul>

            <div className="flex flex-col gap-1">
              <span className="eyebrow">Acceptance</span>
              <ul className="list-disc pl-5 text-sm">
                {m.acceptance.map((a, ai) => (
                  <li key={ai}>{a}</li>
                ))}
              </ul>
            </div>

            <Checkbox itemId={m.id} label={m.title} />
          </div>
        ))}
      </div>

      <div className="panel flex flex-col gap-1 p-2">
        <h2 className="px-2 pt-1">Defense docs</h2>
        {docs.map((d) => (
          <Checkbox key={d.id} itemId={d.id} label={`Doc: ${d.name}`} />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h2>Defense questions</h2>
        <ul className="list-disc pl-5 text-sm">
          {project.defense.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
