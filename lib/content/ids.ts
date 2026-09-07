export const ID_PREFIXES = ['dsap', 'dsa', 'sdp', 'sdq', 'mlp', 'mlq', 'topic', 'q', 'proj', 'ms', 'doc', 'read', 'day', 'week', 'cst'] as const

export type IdPrefix = (typeof ID_PREFIXES)[number]

export function slugOf(id: string): string {
  for (const p of ID_PREFIXES) {
    if (id.startsWith(`${p}-`)) return id.slice(p.length + 1)
  }
  return id
}

export function idFromSlug(prefix: IdPrefix, slug: string): string {
  return `${prefix}-${slug}`
}
