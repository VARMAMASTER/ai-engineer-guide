import { progressBlobSchema, emptyBlob, CURRENT_VERSION } from './types'
import type { ProgressBlob } from './types'

type Step = (blob: Record<string, unknown>) => Record<string, unknown>

/** Keyed by the version being upgraded FROM. */
const STEPS: Record<number, Step> = {
  0: (b) => ({
    ...b,
    version: 1,
    hours: b.hours ?? {},
    settings: b.settings ?? { theme: 'dark' },
    completed: b.completed ?? {},
    startDate: b.startDate ?? null,
  }),
}

export function migrate(raw: unknown): ProgressBlob {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Progress file is not an object.')
  }
  let blob = { ...(raw as Record<string, unknown>) }
  const declared = typeof blob.version === 'number' ? blob.version : 0
  if (declared > CURRENT_VERSION) {
    throw new Error(`Progress file was written by a newer version of the app (v${declared}).`)
  }
  for (let v = declared; v < CURRENT_VERSION; v += 1) {
    const step = STEPS[v]
    if (!step) throw new Error(`No migration from version ${v}.`)
    blob = step(blob)
  }
  const parsed = progressBlobSchema.safeParse({ ...emptyBlob(), ...blob })
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new Error(`Progress file is invalid at "${first.path.join('.')}": ${first.message}`)
  }
  return parsed.data
}
