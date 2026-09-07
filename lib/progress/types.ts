import { z } from 'zod'

export const CURRENT_VERSION = 2

/**
 * How sure you were of a card the last time revision mode showed it.
 *
 * This is deliberately NOT a date map like `completed`. Completion records
 * "I practised this, on this day"; revision records "I could say this out
 * loud". They are different facts about the same content id, so they live
 * under different keys and even carry different value shapes — a `revision`
 * entry can never be mistaken for, or merged into, a `completed` entry.
 */
export const revisionRatingSchema = z.enum(['again', 'good'])

export type RevisionRating = z.infer<typeof revisionRatingSchema>

export const progressBlobSchema = z.object({
  version: z.literal(CURRENT_VERSION),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  completed: z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  revision: z.record(z.string(), revisionRatingSchema),
  hours: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.number().min(0).max(24)),
  settings: z.object({ theme: z.enum(['dark', 'light', 'system']) }),
})

export type ProgressBlob = z.infer<typeof progressBlobSchema>

export function emptyBlob(): ProgressBlob {
  return {
    version: CURRENT_VERSION,
    startDate: null,
    completed: {},
    revision: {},
    hours: {},
    settings: { theme: 'dark' },
  }
}
