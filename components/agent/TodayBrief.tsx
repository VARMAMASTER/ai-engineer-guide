'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import Skeleton from '@/components/ui/Skeleton'
import Tag from '@/components/ui/Tag'
import { useUser } from '@/lib/auth/useUser'
import { todayIso } from '@/lib/date'
import type { Brief, Proposal, ProposalState } from '@/lib/agent/types'

/**
 * The brief, on Today.
 *
 * Spec 5.4 is explicit that the agent gets no tab of its own, and the reason is
 * worth keeping in view while reading this file: an agent behind a tab is a
 * chatbot you have to remember to visit, while an agent on Today is a colleague
 * who tells you something. So this sits above the day's tasks, says one thing,
 * and is quiet when it has nothing.
 *
 * Three states it must handle honestly rather than hide:
 *
 *  - **Not enough data.** It says so and stops. A confident note built on three
 *    days of logs is worse than no note.
 *  - **The observations without the sentence.** When the model is unreachable,
 *    out of budget, rate limited or produced something that failed
 *    verification, the deterministic facts are still shown, with a line saying
 *    what is missing and why. They were the substance anyway.
 *  - **Signed out.** Nothing at all. The learning half of this app works
 *    without an account and must not grow a login prompt on its front page.
 *
 * Surface budget: one blurred `Panel` with `solid` blocks inside it. Glass
 * never contains glass.
 */

const STATUS_COLOUR: Record<string, string> = {
  act: 'var(--danger)',
  watch: 'var(--warning)',
  info: 'var(--text-muted)',
}

interface BriefResponse {
  date: string
  brief: Brief | null
  error?: string
}

export default function TodayBrief() {
  const { user, ready: userReady } = useUser()
  // A lazy initializer rather than an effect: the value is wanted once, on the
  // client, and an effect would only re-render to reach the same answer. The
  // server's own result is never rendered — `userReady` is false in server
  // markup and on the hydrating render, so this component returns null on both
  // sides and the client's clock is the only one that reaches the screen.
  const [date] = useState(todayIso)
  const [loaded, setLoaded] = useState(false)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userReady || !user) return
    let live = true
    void (async () => {
      try {
        const res = await fetch(`/api/agent/brief?date=${date}`, { cache: 'no-store' })
        const body = res.ok ? ((await res.json()) as BriefResponse) : null
        if (!live) return
        setBrief(body?.brief ?? null)
      } catch {
        if (live) setError('The brief could not be loaded.')
      } finally {
        if (live) setLoaded(true)
      }
    })()
    return () => {
      live = false
    }
  }, [date, user, userReady])

  async function generate() {
    setWorking(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/brief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const body = (await res.json()) as BriefResponse
      if (!res.ok) {
        setError(body.error ?? 'The brief could not be written.')
        return
      }
      setBrief(body.brief ?? null)
    } catch {
      setError('The brief could not be written.')
    } finally {
      setWorking(false)
    }
  }

  async function decide(proposal: Proposal, state: Exclude<ProposalState, 'pending'>) {
    // Optimistic: the decision is the user's own and the server only records
    // it. A failure puts it back and says so rather than silently disagreeing.
    const previous = proposal.state
    setBrief((b) =>
      b ? { ...b, proposals: b.proposals.map((p) => (p.id === proposal.id ? { ...p, state } : p)) } : b,
    )
    try {
      const res = await fetch('/api/agent/proposals', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: proposal.id, state }),
      })
      if (!res.ok) throw new Error('rejected')
    } catch {
      setBrief((b) =>
        b
          ? {
              ...b,
              proposals: b.proposals.map((p) =>
                p.id === proposal.id ? { ...p, state: previous } : p,
              ),
            }
          : b,
      )
      setError('That could not be saved.')
    }
  }

  // The learning half is usable signed out and must stay that way. No card, no
  // prompt, no shadow of one.
  if (!userReady || !user) return null

  if (!loaded) {
    return (
      <Panel className="flex flex-col gap-3 p-4" aria-label="Your brief">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
      </Panel>
    )
  }

  const pending = brief?.proposals.filter((p) => p.state === 'pending') ?? []
  const decided = brief?.proposals.filter((p) => p.state !== 'pending') ?? []

  return (
    <Panel className="flex min-w-0 flex-col gap-3 p-4" aria-label="Your brief" data-testid="agent-brief">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">Across everything</p>
        <Button
          variant={brief ? 'quiet' : 'accent'}
          loading={working}
          onClick={generate}
          data-testid="agent-brief-generate"
        >
          {brief ? 'Look again' : 'Read today’s brief'}
        </Button>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: 'var(--danger)' }} role="status">
          {error}
        </p>
      ) : null}

      {!brief ? (
        <p className="text-sm text-[var(--text-muted)]">
          One sentence about how Learn, Diet, Train and Ops are going together — the thing none of
          them would say on its own. It reads what is already logged; it never changes any of it.
        </p>
      ) : null}

      {brief ? <BriefBody brief={brief} /> : null}

      {pending.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="eyebrow">Suggestions — nothing happens unless you do it</p>
          {pending.map((proposal) => (
            <Panel key={proposal.id} tier="solid" className="flex min-w-0 flex-col gap-2 p-3">
              <p className="text-sm font-medium text-[var(--text)]">{proposal.title}</p>
              <p className="text-sm text-[var(--text-muted)]">{proposal.body}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => decide(proposal, 'accepted')}>Accept</Button>
                <Button onClick={() => decide(proposal, 'dismissed')}>Dismiss</Button>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}

      {decided.length > 0 ? (
        <p className="text-xs text-[var(--text-faint)]">
          {decided.filter((p) => p.state === 'accepted').length} accepted,{' '}
          {decided.filter((p) => p.state === 'dismissed').length} dismissed today.
        </p>
      ) : null}
    </Panel>
  )
}

function BriefBody({ brief }: { brief: Brief }) {
  if (brief.status === 'not-enough-data') {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-[var(--text)]">Not enough yet to say anything true.</p>
        <p className="text-sm text-[var(--text-muted)]">{brief.reason}</p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {brief.synthesis ? (
        <p className="text-sm leading-relaxed text-[var(--text)]" data-testid="agent-synthesis">
          {brief.synthesis}
        </p>
      ) : null}

      {brief.observations.length > 0 ? (
        <ul className="flex min-w-0 list-none flex-col gap-2">
          {brief.observations.map((observation) => (
            <li key={observation.id} className="flex min-w-0 items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLOUR[observation.severity] }}
              />
              <span className="min-w-0 text-sm text-[var(--text-muted)]">{observation.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{brief.reason}</p>
      )}

      {/* Why the extra sentence is missing, in the open. A brief that quietly
          dropped it would leave the reader unable to tell "nothing to add" from
          "the model is down". */}
      {!brief.synthesis && brief.observations.length > 0 && brief.reason ? (
        <p className="text-xs text-[var(--text-faint)]">
          {failureLabel(brief.synthesisFailure)} {brief.reason}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {brief.coverage.map((app) => (
          <Tag key={app.appId} variant="outline">
            {app.title} · {app.activeDays}/{app.days}d
          </Tag>
        ))}
      </div>
    </div>
  )
}

function failureLabel(failure: Brief['synthesisFailure']): string {
  switch (failure) {
    case 'no-credit':
    case 'budget-exhausted':
      return 'No written note today — the AI budget is unavailable.'
    case 'rate-limited':
      return 'No written note today — the model is rate limited.'
    case 'unverifiable':
      return 'The written note was dropped:'
    case 'unavailable':
      return 'No written note today —'
    default:
      return ''
  }
}
