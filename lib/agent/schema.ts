/**
 * The wire and storage shape of a `Brief`, validated in both directions.
 *
 * A brief is written to `agent_brief.payload` as JSONB and read back days
 * later, possibly by a newer deployment whose `Brief` type has moved on. Zod on
 * the way out is what turns that from a runtime surprise in a component into a
 * row this code can decide to ignore — the same contract `lib/diet/data.ts` and
 * `lib/ops/rows.ts` apply to their own rows.
 *
 * It is also the boundary for the API response, so a client can never receive a
 * shape the server did not mean to send.
 */
import { z } from 'zod'

export const observationSchema = z.object({
  id: z.string().min(1).max(100),
  apps: z.array(z.string().min(1).max(40)).max(8),
  severity: z.enum(['info', 'watch', 'act']),
  text: z.string().min(1).max(500),
  figures: z.array(z.string().max(40)).max(20),
})

export const proposalSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  apps: z.array(z.string().min(1).max(40)).max(8),
  severity: z.enum(['info', 'watch', 'act']),
  state: z.enum(['pending', 'accepted', 'dismissed']),
})

export const coverageSchema = z.object({
  appId: z.string().min(1).max(40),
  title: z.string().min(1).max(60),
  days: z.number().int().min(0).max(400),
  activeDays: z.number().int().min(0).max(400),
})

export const briefSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['ready', 'not-enough-data', 'observations-only']),
  observations: z.array(observationSchema).max(20),
  synthesis: z.string().max(1000).nullable(),
  model: z.string().max(200).nullable(),
  synthesisFailure: z
    .enum(['no-credit', 'budget-exhausted', 'rate-limited', 'unavailable', 'unverifiable', 'not-requested'])
    .nullable(),
  reason: z.string().max(1000).nullable(),
  proposals: z.array(proposalSchema).max(20),
  coverage: z.array(coverageSchema).max(20),
})

export type StoredBrief = z.infer<typeof briefSchema>

/** Parse a stored payload, returning null rather than throwing on a stale shape. */
export function parseStoredBrief(value: unknown): StoredBrief | null {
  const parsed = briefSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
