import { describe, expect, it, vi } from 'vitest'
import { proposalsFor } from '@/lib/agent/store'
import { parseStoredBrief } from '@/lib/agent/schema'
import { buildBrief } from '@/lib/agent/brief'
import { timelineOf, TODAY } from './fixtures'

/**
 * The two places a brief crosses a boundary: the inbox it is shown with, and
 * the JSONB column it is stored in.
 */

/** Just enough of a Supabase client for `readProposals`. */
function fakeDb(rows: unknown[]) {
  const order = vi.fn(async () => ({ data: rows, error: null }))
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { client: { from } as never, from }
}

describe('a brief that declines to speak also declines to advise', () => {
  it('attaches no inbox to a not-enough-data brief', async () => {
    // Found on a real three-day-old account: the brief said "there is not
    // enough here to say anything true" and then, directly underneath, offered
    // a suggestion raised by an earlier generation. Saying nothing and then
    // advising is the worst of both.
    const { client, from } = fakeDb([{ id: 'x', title: 't', body: 'b', apps: [], severity: 'act', state: 'pending' }])
    const proposals = await proposalsFor(client, { date: TODAY, status: 'not-enough-data' })
    expect(proposals).toEqual([])
    expect(from).not.toHaveBeenCalled()
  })

  it('still attaches it once the brief has something to say, decision intact', async () => {
    const row = { id: 'x', title: 't', body: 'b', apps: ['diet'], severity: 'act', state: 'dismissed' }
    const { client } = fakeDb([row])
    const proposals = await proposalsFor(client, { date: TODAY, status: 'ready' })
    expect(proposals).toEqual([row])
  })
})

describe('the stored payload is validated in both directions', () => {
  it('round-trips a real brief', async () => {
    const brief = await buildBrief({
      timelines: [
        timelineOf('diet', 'iiiooooooooooo', { trend: 'ffffffffffffff' }),
        timelineOf('learn', 'iiioooooooooob'),
      ],
      today: TODAY,
    })
    const parsed = parseStoredBrief(JSON.parse(JSON.stringify(brief)))
    expect(parsed).not.toBeNull()
    expect(parsed?.observations.length).toBe(brief.observations.length)
  })

  it('drops a payload written by a shape that has since moved on', () => {
    // A row written by an older deployment must become "regenerate this",
    // never a runtime surprise inside a component.
    expect(parseStoredBrief({ date: TODAY, status: 'ready' })).toBeNull()
    expect(parseStoredBrief(null)).toBeNull()
    expect(parseStoredBrief({ date: 'yesterday' })).toBeNull()
  })
})
