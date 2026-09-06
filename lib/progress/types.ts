import { z } from 'zod'

export const CURRENT_VERSION = 1

export const progressBlobSchema = z.object({
  version: z.literal(CURRENT_VERSION),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  completed: z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  hours: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.number().min(0).max(24)),
  settings: z.object({ theme: z.enum(['dark', 'light', 'system']) }),
})

export type ProgressBlob = z.infer<typeof progressBlobSchema>

export function emptyBlob(): ProgressBlob {
  return { version: CURRENT_VERSION, startDate: null, completed: {}, hours: {}, settings: { theme: 'dark' } }
}
