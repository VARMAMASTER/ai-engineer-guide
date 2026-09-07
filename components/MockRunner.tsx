'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Mermaid from './Mermaid'
import MockTimer from './MockTimer'
import CodingScript, { SCRIPT_STEPS } from './CodingScript'
import { dsaPatterns, dsaProblems } from '@/content/dsa'
import { sdPatterns, sdQuestions } from '@/content/system-design'
import { behaviouralPrinciples, behaviouralQuestions } from '@/content/behavioural'
import {
  elapsedOf, formatDuration, isRunning, overrunNames, phaseActuals, phasesOf,
  scheduledPhaseIndex, useMock, useMockHydrated, useNow,
} from '@/lib/progress/mock'
import type {
  MockKind, MockPhaseResult, MockRecord, MockSession, Phase,
} from '@/lib/progress/mock'

/**
 * Timed mock mode (spec 6.8).
 *
 * Everything else in this guide is untimed, and practising a problem with
 * unlimited time is a different skill from solving it in 25 minutes while
 * explaining yourself. This is the one surface that rehearses the real
 * constraint.
 *
 * Three rules the implementation exists to hold:
 *
 * 1. Nothing reveals early. The answer fields are not hidden with CSS or an
 *    `open` attribute, they are absent from the DOM until the drill ends. A
 *    reveal you can reach by inspecting the page is not a time box.
 * 2. The clock is wall clock. See `lib/progress/mock` — a backgrounded tab and
 *    a reload both produce the true elapsed figure, and a pause is counted and
 *    reported rather than quietly forgiven.
 * 3. Time up is information. Nothing is submitted, cleared or locked when the
 *    box runs out; the timer keeps counting and the reveal stays a decision
 *    you make.
 *
 * Content is imported directly from `content/*` rather than through
 * `lib/content/index`, so this route does not wait on whoever is editing the
 * registry, and it reads every optional field defensively — a DSA problem
 * whose `approach` has not been written yet renders one section fewer, not a
 * crash.
 */

/* ========================================================================= *
 * Kinds
 * ========================================================================= */

const CODING_BOX_MS = 25 * 60_000
/** Two minutes is the answer itself. The probes that follow are not timed. */
const BEHAVIOURAL_BOX_MS = 2 * 60_000

const KIND_NOUN: Record<MockKind, string> = {
  coding: 'Coding',
  design: 'System design',
  behavioural: 'Behavioural',
}

/* ========================================================================= *
 * One drawn drill, resolved from content
 * ========================================================================= */

interface Pick {
  id: string
  /** What goes in the history row. */
  label: string
  budgetMs: number
  /** Design only. Empty for the other two kinds. */
  phases: Phase[]
  /** The heading of the drill. */
  heading: string
  /** Shown before the clock starts, and again while it runs. */
  opening?: string
  /** Everything visible while the clock is running. */
  brief: ReactNode
  /** Everything held back until the drill ends. */
  reveal: ReactNode
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h3 className="eyebrow">{title}</h3>
      {children}
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
      {items.map((t) => (
        <li key={t} className="min-w-0 break-words">{t}</li>
      ))}
    </ul>
  )
}

function Prose({ children }: { children: ReactNode }) {
  return <p className="text-sm break-words">{children}</p>
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'var(--positive)',
  medium: 'var(--warning)',
  hard: 'var(--danger)',
}

function codingPick(problemId: string): Pick | null {
  const problem = dsaProblems.find((p) => p.id === problemId)
  if (!problem) return null
  const pattern = dsaPatterns.find((p) => p.id === problem.patternId)

  // Every field below the `name`, `difficulty` and `url` triple is optional in
  // the schema while the solutions pass is still landing. Each one is rendered
  // only if it is there.
  const reveal = (
    <>
      {problem.signal ? (
        <Section title="The signal you should have spotted">
          <Prose>{problem.signal}</Prose>
        </Section>
      ) : null}
      {problem.approach ? (
        <Section title="Approach"><Prose>{problem.approach}</Prose></Section>
      ) : null}
      {problem.complexity ? (
        <Section title="Complexity">
          <Bullets items={[`Time — ${problem.complexity.time}`, `Space — ${problem.complexity.space}`]} />
        </Section>
      ) : null}
      {problem.solution ? (
        <Section title="Solution">
          <pre className="code-block"><code>{problem.solution}</code></pre>
        </Section>
      ) : null}
      {problem.followUps?.length ? (
        <Section title="The follow-up"><Bullets items={problem.followUps} /></Section>
      ) : null}
      {!problem.signal && !problem.approach && !problem.solution ? (
        <Section title="No written answer yet">
          <Prose>
            This problem has no approach or solution in the bank yet. Compare against the editorial
            on LeetCode, then write down the one sentence that would have got you there faster.
          </Prose>
        </Section>
      ) : null}
    </>
  )

  return {
    id: problem.id,
    label: problem.name,
    budgetMs: CODING_BOX_MS,
    phases: [],
    heading: problem.name,
    brief: (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="readout" style={{ color: DIFFICULTY_COLOR[problem.difficulty] }}>
          {problem.difficulty}
        </span>
        {pattern ? <span className="readout text-[var(--text-muted)]">{pattern.name}</span> : null}
        <a
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          className="readout text-[var(--accent)] underline underline-offset-4"
        >
          {`LeetCode ${problem.leetcodeNumber} ↗`}
        </a>
      </div>
    ),
    reveal,
  }
}

function tierLabel(tier: number | string): string {
  if (tier === 'ml') return 'ML system design'
  if (tier === 'ai') return 'AI system design'
  return `Tier ${tier}`
}

function designPick(questionId: string): Pick | null {
  const q = sdQuestions.find((x) => x.id === questionId)
  if (!q) return null
  const pattern = sdPatterns.find((p) => p.id === q.patternId)
  const s = q.solution

  return {
    id: q.id,
    label: q.title,
    budgetMs: q.minutes * 60_000,
    phases: phasesOf(q.delivery.budget),
    heading: q.title,
    opening: q.delivery.opening,
    brief: (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="readout text-[var(--text-muted)]">{tierLabel(q.tier)}</span>
        {pattern ? <span className="readout text-[var(--text-muted)]">{pattern.name}</span> : null}
        <span className="readout text-[var(--text-faint)]">{q.companies.join(' · ')}</span>
      </div>
    ),
    reveal: (
      <>
        <Section title="Requirements"><Prose>{s.define}</Prose></Section>
        <Section title="Estimates"><Bullets items={s.numbers} /></Section>
        <Section title="API & data model"><Prose>{s.data}</Prose></Section>
        <Section title="Architecture"><Prose>{s.architecture}</Prose></Section>
        <Section title="Reference diagram">
          <Mermaid source={q.diagram} caption={`${q.title} — reference architecture`} />
        </Section>
        <Section title="Deep dive — evaluation"><Prose>{s.evaluate}</Prose></Section>
        <Section title="Deep dive — deployment"><Prose>{s.deploy}</Prose></Section>
        <Section title="Wrap-up"><Prose>{s.wrapup}</Prose></Section>
        <Section title="Traps"><Bullets items={q.delivery.traps} /></Section>
        <Section title="When pushed">
          <div className="flex flex-col gap-3">
            {q.delivery.whenPushed.map((p) => (
              <div key={p.challenge} className="surface-solid flex flex-col gap-1.5 p-3">
                <p className="text-sm font-medium break-words">{p.challenge}</p>
                <p className="text-sm break-words text-[var(--text-muted)]">{p.answer}</p>
              </div>
            ))}
          </div>
        </Section>
      </>
    ),
  }
}

/** The companies a behavioural question is asked at, via the principles it maps to. */
function companiesOf(principleIds: string[]): string[] {
  const found: string[] = []
  for (const id of principleIds) {
    const company = behaviouralPrinciples.find((p) => p.id === id)?.company
    if (company) found.push(company)
  }
  return [...new Set(found)]
}

function behaviouralPick(questionId: string): Pick | null {
  const q = behaviouralQuestions.find((x) => x.id === questionId)
  if (!q) return null
  const names = q.principleIds
    .map((id) => behaviouralPrinciples.find((p) => p.id === id)?.name)
    .filter((n): n is string => Boolean(n))

  return {
    id: q.id,
    label: q.prompt,
    budgetMs: BEHAVIOURAL_BOX_MS,
    phases: [],
    heading: q.prompt,
    brief: (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {names.map((n) => (
          <span key={n} className="readout text-[var(--text-muted)]">{n}</span>
        ))}
        <span className="readout text-[var(--text-faint)]">{companiesOf(q.principleIds).join(' · ')}</span>
      </div>
    ),
    reveal: (
      <>
        <Section title="The probes that follow your answer"><Bullets items={q.probes} /></Section>
        <Section title="Traps on this question"><Bullets items={q.traps} /></Section>
      </>
    ),
  }
}

function pickFor(kind: MockKind, itemId: string): Pick | null {
  if (kind === 'coding') return codingPick(itemId)
  if (kind === 'design') return designPick(itemId)
  return behaviouralPick(itemId)
}

/* ========================================================================= *
 * Pools and filters
 * ========================================================================= */

interface FilterOption {
  value: string
  label: string
}

function filterOptions(kind: MockKind): { legend: string; options: FilterOption[] } {
  if (kind === 'coding') {
    return {
      legend: 'Pattern',
      options: [...dsaPatterns]
        .sort((a, b) => a.order - b.order)
        .map((p) => ({ value: p.id, label: p.name })),
    }
  }
  if (kind === 'design') {
    return {
      legend: 'Pattern',
      options: [...sdPatterns]
        .sort((a, b) => a.order - b.order)
        .map((p) => ({ value: p.id, label: p.name })),
    }
  }
  return {
    legend: 'Company',
    options: [
      { value: 'amazon', label: 'Amazon' },
      { value: 'google', label: 'Google' },
      { value: 'meta', label: 'Meta' },
      { value: 'general', label: 'General' },
    ],
  }
}

function poolFor(kind: MockKind, filter: string): string[] {
  if (kind === 'coding') {
    return dsaProblems.filter((p) => !filter || p.patternId === filter).map((p) => p.id)
  }
  if (kind === 'design') {
    return sdQuestions.filter((q) => !filter || q.patternId === filter).map((q) => q.id)
  }
  return behaviouralQuestions
    .filter((q) => !filter || companiesOf(q.principleIds).includes(filter))
    .map((q) => q.id)
}

/**
 * Draw one, avoiding an immediate repeat.
 *
 * "Random" that hands you the same question twice running is the fastest way
 * to stop trusting the button, so the last thing drilled is excluded whenever
 * there is anything else to choose from.
 */
function drawFrom(pool: string[], avoidId?: string): string | null {
  if (pool.length === 0) return null
  const candidates = pool.length > 1 && avoidId ? pool.filter((id) => id !== avoidId) : pool
  const from = candidates.length > 0 ? candidates : pool
  return from[Math.floor(Math.random() * from.length)]
}

/* ========================================================================= *
 * The runner
 * ========================================================================= */

export default function MockRunner({ kind }: { kind: MockKind }) {
  const hydrated = useMockHydrated()
  const stored = useMock((s) => s.active)
  const history = useMock((s) => s.history)
  const start = useMock((s) => s.start)
  const pause = useMock((s) => s.pause)
  const resume = useMock((s) => s.resume)
  const toggleScriptStep = useMock((s) => s.toggleScriptStep)
  const advancePhase = useMock((s) => s.advancePhase)
  const end = useMock((s) => s.end)
  const discard = useMock((s) => s.discard)

  const [filter, setFilter] = useState('')
  // Design draws before it starts, so `delivery.opening` — the sentence you
  // open the round with — can be read while the clock is still at zero.
  const [pending, setPending] = useState<string | null>(null)

  const active: MockSession | null = hydrated && stored?.kind === kind ? stored : null
  const elsewhere = hydrated && stored && stored.kind !== kind ? stored : null

  const now = useNow(isRunning(active))
  const elapsed = active ? elapsedOf(active, now) : 0

  const pick = useMemo(
    () => (active ? pickFor(kind, active.itemId) : pending ? pickFor(kind, pending) : null),
    [active, kind, pending],
  )

  const lastOfKind = history.find((h) => h.kind === kind)?.itemId

  const draw = useCallback(() => {
    const id = drawFrom(poolFor(kind, filter), lastOfKind)
    if (!id) return
    const drawn = pickFor(kind, id)
    if (!drawn) return
    if (kind === 'design') {
      setPending(id)
      return
    }
    start({ kind, itemId: id, label: drawn.label, budgetMs: drawn.budgetMs })
  }, [filter, kind, lastOfKind, start])

  const startPending = useCallback(() => {
    if (!pending) return
    const drawn = pickFor(kind, pending)
    if (!drawn) return
    start({ kind, itemId: pending, label: drawn.label, budgetMs: drawn.budgetMs })
    setPending(null)
  }, [kind, pending, start])

  const finish = useCallback(() => {
    if (!active || !pick) return
    const results: MockPhaseResult[] =
      pick.phases.length > 0
        ? phaseActuals(pick.phases, active.phaseMarks, elapsed).map((actualMs, i) => ({
            name: pick.phases[i].name,
            budgetMs: pick.phases[i].budgetMs,
            actualMs,
          }))
        : []
    end(elapsed, results)
  }, [active, elapsed, end, pick])

  const startOver = useCallback(() => {
    discard()
    setPending(null)
  }, [discard])

  /* ----- setup ---------------------------------------------------------- */

  if (!active) {
    return (
      <div className="flex min-w-0 flex-col gap-5" data-testid="mock-setup">
        {elsewhere ? (
          <p className="panel p-4 text-sm text-[var(--text-muted)]" data-testid="mock-elsewhere">
            {`A ${KIND_NOUN[elsewhere.kind].toLowerCase()} drill is still open — `}
            <Link
              href={`/mock/${elsewhere.kind}`}
              className="text-[var(--accent)] underline underline-offset-4"
            >
              go back to it
            </Link>
            {'. Starting a drill here will replace it.'}
          </p>
        ) : null}

        {pending && pick ? (
          <PreStart
            pick={pick}
            onStart={startPending}
            onRedraw={() => setPending(drawFrom(poolFor(kind, filter), pending))}
          />
        ) : (
          <Setup
            kind={kind}
            filter={filter}
            onFilter={setFilter}
            poolSize={poolFor(kind, filter).length}
            onDraw={draw}
            ready={hydrated}
          />
        )}

        <MockHistory kind={kind} />
      </div>
    )
  }

  if (!pick) {
    // The drawn id is no longer in the bank — a question renamed underneath a
    // stored session. Say so and offer a clean start rather than a blank page.
    return (
      <div className="panel flex flex-col gap-3 p-4">
        <p className="text-sm">That drill is no longer in the question bank.</p>
        <ActionButton onClick={startOver}>Start again</ActionButton>
      </div>
    )
  }

  const remaining = pick.budgetMs - elapsed
  const ended = active.endedAt !== null
  const paused = active.pausedAt !== null

  const actuals = pick.phases.length > 0
    ? phaseActuals(pick.phases, active.phaseMarks, elapsed)
    : []
  const phaseIndex = Math.min(active.phaseMarks.length, Math.max(0, pick.phases.length - 1))
  const scheduled = pick.phases.length > 0 ? scheduledPhaseIndex(pick.phases, elapsed) : 0

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid={ended ? 'mock-summary' : 'mock-drill'}>
      <section className="panel flex min-w-0 flex-col gap-4 p-4 md:p-5">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="eyebrow">{`${KIND_NOUN[kind]} drill`}</p>
          <h2 className="break-words" data-testid="mock-heading">{pick.heading}</h2>
          {pick.brief}
        </div>

        <div className="surface-solid flex flex-col gap-3 p-4">
          <MockTimer
            label="Session"
            remainingMs={remaining}
            budgetMs={pick.budgetMs}
            state={ended ? 'ended' : paused ? 'paused' : 'running'}
            pauses={active.pauses}
          />
          {!ended ? (
            <div className="flex flex-wrap gap-2">
              {paused ? (
                <ActionButton emphasis onClick={() => resume()}>Resume</ActionButton>
              ) : (
                <ActionButton onClick={() => pause()}>Pause</ActionButton>
              )}
              <ActionButton emphasis={remaining <= 0} onClick={finish} testId="mock-end">
                {remaining <= 0 ? 'End & reveal' : 'End early & reveal'}
              </ActionButton>
              <ActionButton onClick={startOver}>Discard</ActionButton>
            </div>
          ) : null}
        </div>

        <p aria-live="polite" className="sr-only">
          {ended ? 'Drill ended.'
            : paused ? 'Paused.'
            : remaining <= 0 ? 'Time is up. Nothing has been submitted; end the drill when you are ready.'
            : ''}
        </p>
      </section>

      {pick.phases.length > 0 ? (
        <PhaseBoard
          phases={pick.phases}
          actuals={actuals}
          currentIndex={phaseIndex}
          scheduledIndex={scheduled}
          closed={active.phaseMarks.length}
          live={!ended}
          onAdvance={() => advancePhase(elapsed)}
        />
      ) : null}

      {pick.opening ? (
        <section className="panel flex flex-col gap-2 p-4">
          <h3 className="eyebrow">Open with this</h3>
          <p className="text-sm break-words italic">{`“${pick.opening}”`}</p>
        </section>
      ) : null}

      {kind === 'coding' ? (
        <CodingScript checked={active.script} onToggle={toggleScriptStep} disabled={ended} />
      ) : null}

      {ended ? (
        <>
          <Summary
            session={active}
            pick={pick}
            elapsedMs={active.endedAt ?? elapsed}
            phaseResults={actuals.map((actualMs, i) => ({
              name: pick.phases[i].name,
              budgetMs: pick.phases[i].budgetMs,
              actualMs,
            }))}
          />
          <section
            className="panel flex min-w-0 flex-col gap-5 p-4 md:p-5"
            data-testid="mock-reveal"
          >
            <h2>The answer</h2>
            {pick.reveal}
          </section>
          <div className="flex flex-wrap gap-2">
            <ActionButton emphasis onClick={startOver} testId="mock-again">Draw another</ActionButton>
            <Link
              href="/mock"
              className="flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--panel-border)] px-4 text-sm"
            >
              Back to Mock
            </Link>
          </div>
        </>
      ) : null}
    </div>
  )
}

/* ========================================================================= *
 * Pieces
 * ========================================================================= */

function Setup({
  kind, filter, onFilter, poolSize, onDraw, ready,
}: {
  kind: MockKind
  filter: string
  onFilter: (v: string) => void
  poolSize: number
  onDraw: () => void
  ready: boolean
}) {
  const { legend, options } = filterOptions(kind)

  return (
    <section className="panel flex min-w-0 flex-col gap-4 p-4 md:p-5">
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor="mock-filter" className="eyebrow">{legend}</label>
        <select
          id="mock-filter"
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          className="surface-solid min-h-11 w-full max-w-md px-3 text-sm text-[var(--text)]"
        >
          <option value="">{`Anything (${poolFor(kind, '').length})`}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ActionButton emphasis onClick={onDraw} disabled={!ready || poolSize === 0} testId="mock-draw">
          {kind === 'design' ? 'Draw a question' : 'Start the clock'}
        </ActionButton>
        <span className="readout text-[var(--text-faint)]">
          {poolSize === 0 ? 'nothing matches that filter' : `${poolSize} to draw from`}
        </span>
      </div>
    </section>
  )
}

/**
 * The design drill's pre-roll: the question and the sentence you open with,
 * read at leisure, before a single second is on the clock. Reading your
 * opening line against a running clock is exactly the habit this is trying to
 * break.
 */
function PreStart({
  pick, onStart, onRedraw,
}: {
  pick: Pick
  onStart: () => void
  onRedraw: () => void
}) {
  return (
    <section className="panel flex min-w-0 flex-col gap-4 p-4 md:p-5" data-testid="mock-prestart">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="eyebrow">Before the clock starts</p>
        <h2 className="break-words">{pick.heading}</h2>
        {pick.brief}
      </div>

      {pick.opening ? (
        <div className="surface-solid flex flex-col gap-2 p-4">
          <h3 className="eyebrow">Open with this</h3>
          <p className="text-sm break-words italic">{`“${pick.opening}”`}</p>
        </div>
      ) : null}

      <div className="surface-solid flex flex-col gap-2 p-4">
        <h3 className="eyebrow">{`Phase budget — ${formatDuration(pick.budgetMs)}`}</h3>
        <ul className="flex flex-col gap-1">
          {pick.phases.map((p) => (
            <li key={p.key} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{p.name}</span>
              <span className="readout shrink-0 text-[var(--text-muted)]">
                {formatDuration(p.budgetMs)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton emphasis onClick={onStart} testId="mock-start">Start the clock</ActionButton>
        <ActionButton onClick={onRedraw}>Draw a different one</ActionButton>
      </div>
    </section>
  )
}

/**
 * The phase board — the whole reason the design drill exists.
 *
 * Candidates lose design rounds by spending twenty minutes on requirements and
 * then sketching an architecture in four. A single session countdown cannot
 * show that, so this tracks the phase you say you are in against the phase the
 * clock says you should be in, and keeps the running cost of each one visible
 * while there is still time to do something about it.
 */
function PhaseBoard({
  phases, actuals, currentIndex, scheduledIndex, closed, live, onAdvance,
}: {
  phases: Phase[]
  actuals: number[]
  currentIndex: number
  scheduledIndex: number
  closed: number
  live: boolean
  onAdvance: () => void
}) {
  const current = phases[currentIndex]
  const spent = actuals[currentIndex] ?? 0
  const behind = live && scheduledIndex > currentIndex
  const next = phases[currentIndex + 1]

  return (
    <section className="panel flex min-w-0 flex-col gap-4 p-4 md:p-5" data-testid="mock-phases">
      <div className="surface-solid flex flex-col gap-3 p-4">
        <MockTimer
          label={`Phase ${currentIndex + 1} of ${phases.length} — ${current.name}`}
          remainingMs={current.budgetMs - spent}
          budgetMs={current.budgetMs}
          state={live ? 'running' : 'ended'}
          size="sm"
          testId="mock-phase-timer"
        />
        {behind ? (
          <p className="readout" style={{ color: 'var(--warning)' }} data-testid="mock-behind">
            {`The clock says you should be in ${phases[scheduledIndex].name} by now.`}
          </p>
        ) : null}
        {live && next ? (
          <ActionButton onClick={onAdvance} testId="mock-advance">
            {`Done — move to ${next.name}`}
          </ActionButton>
        ) : null}
        {live && !next ? (
          <p className="readout text-[var(--text-faint)]">Last phase. Land the summary.</p>
        ) : null}
      </div>

      <ol className="flex min-w-0 flex-col gap-1.5">
        {phases.map((p, i) => {
          const state = i < closed ? 'done' : i === currentIndex ? 'current' : 'ahead'
          const actual = actuals[i] ?? 0
          const over = state !== 'ahead' && actual > p.budgetMs
          return (
            <li
              key={p.key}
              data-phase={p.key}
              data-phase-state={state}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span
                className="min-w-0 truncate"
                style={{
                  color: state === 'current' ? 'var(--accent)' : state === 'done' ? 'var(--text)' : 'var(--text-faint)',
                  fontWeight: state === 'current' ? 600 : 400,
                }}
              >
                {p.name}
              </span>
              <span
                className="readout shrink-0"
                style={{ color: over ? 'var(--warning)' : 'var(--text-muted)' }}
              >
                {state === 'ahead'
                  ? formatDuration(p.budgetMs)
                  : `${formatDuration(actual)} / ${formatDuration(p.budgetMs)}`}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Summary({
  session, pick, elapsedMs, phaseResults,
}: {
  session: MockSession
  pick: Pick
  elapsedMs: number
  phaseResults: MockPhaseResult[]
}) {
  const delta = elapsedMs - pick.budgetMs
  const overran = overrunNames(phaseResults)
  const scriptDone = session.script.filter((id) => SCRIPT_STEPS.some((s) => s.id === id)).length

  const rows: { label: string; value: string; tone?: string }[] = [
    { label: 'Time box', value: formatDuration(pick.budgetMs) },
    {
      label: 'Real elapsed',
      value: formatDuration(elapsedMs) + (delta > 0 ? ` (${formatDuration(delta)} over)` : ''),
      tone: delta > 0 ? 'var(--warning)' : 'var(--positive)',
    },
    {
      label: 'Paused',
      value: session.pauses === 0
        ? 'not once'
        : `${session.pauses} time${session.pauses === 1 ? '' : 's'}, ${formatDuration(session.pausedMs)} total`,
      tone: session.pauses > 0 ? 'var(--warning)' : undefined,
    },
  ]

  if (session.kind === 'coding') {
    rows.push({
      label: 'Script steps said',
      value: `${scriptDone} of ${SCRIPT_STEPS.length}`,
      tone: scriptDone === SCRIPT_STEPS.length ? 'var(--positive)' : undefined,
    })
  }

  return (
    <section className="panel flex min-w-0 flex-col gap-4 p-4 md:p-5" data-testid="mock-result">
      <h2>How that went</h2>

      <dl className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="min-w-0 text-[var(--text-muted)]">{r.label}</dt>
            <dd className="readout shrink-0" style={{ color: r.tone ?? 'var(--text)' }}>{r.value}</dd>
          </div>
        ))}
      </dl>

      {phaseResults.length > 0 ? (
        <div className="surface-solid flex flex-col gap-2 p-4" data-testid="mock-phase-result">
          <h3 className="eyebrow">Where the time went</h3>
          <ul className="flex flex-col gap-1">
            {phaseResults.map((p) => (
              <li key={p.name} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{p.name}</span>
                <span
                  className="readout shrink-0"
                  style={{ color: p.actualMs > p.budgetMs ? 'var(--warning)' : 'var(--text-muted)' }}
                >
                  {`${formatDuration(p.actualMs)} / ${formatDuration(p.budgetMs)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-[var(--text-muted)]">
            {overran.length === 0
              ? 'Every phase came in on budget.'
              : `Overran: ${overran.join(', ')}.`}
          </p>
        </div>
      ) : null}

      {session.pauses > 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          {`A ${formatDuration(pick.budgetMs)} session with ${session.pauses} pause${session.pauses === 1 ? '' : 's'} is not a ${formatDuration(pick.budgetMs)} session. The history says so too.`}
        </p>
      ) : null}
    </section>
  )
}

/* ========================================================================= *
 * History
 * ========================================================================= */

function stamp(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * The short history. This is the weak-spot signal the app otherwise lacks:
 * unlimited-time practice tells you whether you can solve a problem, and only
 * this tells you whether you are getting faster at it.
 */
export function MockHistory({ kind }: { kind?: MockKind }) {
  const hydrated = useMockHydrated()
  const all = useMock((s) => s.history)
  const clearHistory = useMock((s) => s.clearHistory)
  const rows: MockRecord[] = hydrated ? (kind ? all.filter((r) => r.kind === kind) : all) : []

  return (
    <section className="panel flex min-w-0 flex-col gap-3 p-4" data-testid="mock-history">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="eyebrow">Recent drills</h2>
        {rows.length > 0 && !kind ? (
          <button
            type="button"
            onClick={clearHistory}
            className="readout text-[var(--text-faint)] underline underline-offset-4"
          >
            Clear
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Nothing yet. Finished drills land here with the real elapsed time, so you can see whether
          you are getting faster.
        </p>
      ) : (
        <ul className="flex min-w-0 flex-col gap-2">
          {rows.map((r) => {
            const delta = r.elapsedMs - r.budgetMs
            const overran = overrunNames(r.phases)
            return (
              <li
                key={r.id}
                data-record-kind={r.kind}
                className="surface-solid flex min-w-0 flex-col gap-1 p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0 text-sm break-words">{r.label}</span>
                  <span className="readout shrink-0 text-[var(--text-faint)]">{stamp(r.finishedAt)}</span>
                </div>
                <p className="readout flex flex-wrap gap-x-3 gap-y-1 text-[var(--text-muted)]">
                  <span>{KIND_NOUN[r.kind]}</span>
                  <span style={{ color: delta > 0 ? 'var(--warning)' : 'var(--positive)' }}>
                    {`${formatDuration(r.elapsedMs)} of ${formatDuration(r.budgetMs)}`}
                  </span>
                  <span style={{ color: r.pauses > 0 ? 'var(--warning)' : undefined }}>
                    {r.pauses === 0
                      ? 'no pauses'
                      : `${r.pauses} pause${r.pauses === 1 ? '' : 's'} (${formatDuration(r.pausedMs)})`}
                  </span>
                  {overran.length > 0 ? (
                    <span style={{ color: 'var(--warning)' }}>{`over: ${overran.join(', ')}`}</span>
                  ) : null}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ========================================================================= *
 * Buttons
 * ========================================================================= */

function ActionButton({
  onClick, disabled, emphasis, testId, children,
}: {
  onClick: () => void
  disabled?: boolean
  emphasis?: boolean
  testId?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={
        'min-h-11 rounded-[var(--radius-sm)] px-4 text-sm font-medium disabled:opacity-40 ' +
        (emphasis
          ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
          : 'border border-[var(--panel-border)] text-[var(--text)]')
      }
    >
      {children}
    </button>
  )
}
