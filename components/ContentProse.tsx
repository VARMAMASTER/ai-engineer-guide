import { Fragment } from 'react'
import Link from 'next/link'
import { byId } from '@/lib/content/index'

/**
 * The banks a prose line can name, and the segment that renders each.
 *
 * `sdp-` and `mlp-` share `/system-design/[pattern]`, and `lldp-`/`lldq-`
 * share `/lld/[slug]`, exactly as those routes resolve them.
 */
const ROUTES: Record<string, string> = {
  dsap: '/dsa',
  sdp: '/system-design',
  mlp: '/system-design',
  lldp: '/lld',
  lldq: '/lld',
  topic: '/ai-ml',
  proj: '/projects',
}

// Longest prefixes first so `dsap-` is never matched as `dsa` + `p-`.
const CONTENT_ID = /\b(dsap|lldp|lldq|sdp|mlp|topic|proj)-[a-z0-9]+(?:-[a-z0-9]+)*/g

function hrefFor(id: string): string | undefined {
  const prefix = id.slice(0, id.indexOf('-'))
  const base = ROUTES[prefix]
  if (base === undefined) return undefined
  return `${base}/${id.slice(prefix.length + 1)}`
}

function nameOf(id: string): string | undefined {
  const item = byId.get(id)
  if (item === undefined) return undefined
  if ('name' in item && typeof item.name === 'string') return item.name
  return undefined
}

/**
 * A line of content prose with its embedded content ids turned into links.
 *
 * Several banks write advice as prose containing raw ids — "timed reps on
 * dsap-graphs, dsap-dp-1d", "proj-rag - the evaluation harness you built".
 * That is precise and unreadable. Each id that actually resolves is replaced
 * by the item's name and linked to the page that teaches it, so the sentence
 * reads as English and the thing it names is one tap away.
 *
 * An id that resolves to nothing is left exactly as written rather than
 * silently dropped: that is a content bug, and `pnpm validate` is where it
 * should be caught, not hidden here.
 */
export default function ContentProse({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  let cursor = 0

  for (const match of text.matchAll(CONTENT_ID)) {
    const id = match[0]
    const start = match.index
    const href = hrefFor(id)
    const name = nameOf(id)

    if (href === undefined || name === undefined) continue

    if (start > cursor) {
      parts.push(<Fragment key={`t${cursor}`}>{text.slice(cursor, start)}</Fragment>)
    }
    parts.push(
      <Link
        key={`l${start}`}
        href={href}
        title={id}
        className="text-[var(--accent)] underline decoration-[var(--accent-line)] underline-offset-2 transition-colors hover:decoration-[var(--accent)]"
      >
        {name}
      </Link>,
    )
    cursor = start + id.length
  }

  if (cursor < text.length) parts.push(<Fragment key={`t${cursor}`}>{text.slice(cursor)}</Fragment>)

  return <>{parts}</>
}
