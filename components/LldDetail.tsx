'use client'

import { useId, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Checkbox from './Checkbox'
import Mermaid from './Mermaid'
import { lldSlug } from './LldIndex'
import { content } from '@/lib/content/index'
import type { LldPattern, LldQuestion } from '@/lib/content/schema'

/* -------------------------------------------------------------------------
 * Shared bits
 * ---------------------------------------------------------------------- */

function Bullets({ items }: { items: readonly string[] }) {
  return (
    // Measure is capped: every list on these pages is full sentences, and at
    // 1280px an unconstrained column runs past 140 characters a line.
    <ul className="flex min-w-0 max-w-[82ch] flex-col gap-2 pl-5 text-sm">
      {items.map((item) => (
        <li key={item} className="list-disc marker:text-[var(--text-faint)]">
          {item}
        </li>
      ))}
    </ul>
  )
}

/**
 * Python, solid and in its own scroll container.
 *
 * `.code-block` already carries `overflow-x: auto` and `max-width: 100%`; the
 * wrapper's `min-w-0` is what stops a flex column from being widened by the
 * longest line instead of letting the box scroll.
 */
function Python({ source, label }: { source: string; label: string }) {
  return (
    <div className="min-w-0 max-w-full">
      <pre className="code-block whitespace-pre" aria-label={label}>
        <code>{source}</code>
      </pre>
    </div>
  )
}

function CompanyPills({ companies }: { companies: readonly string[] }) {
  return (
    <>
      {companies.map((c) => (
        <span
          key={c}
          className="tag capitalize"
        >
          {c}
        </span>
      ))}
    </>
  )
}

/**
 * A section that stays shut until the reader asks for it.
 *
 * The whole point of the problem page is that you can attempt the problem from
 * the statement and the clarifying questions alone. Entities, the class diagram
 * and the reference solution are three separate reveals rather than one, so a
 * reader stuck on structure can take that hint without being handed the
 * finished code in the same gesture. Content is mounted only once open, which
 * also keeps Mermaid's ~1MB chunk off the page for anyone who never opens it.
 */
function Reveal({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="panel flex min-w-0 flex-col rounded-[var(--radius)] p-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full min-w-0 items-center gap-3 text-left"
      >
        <span
          aria-hidden="true"
          className="shrink-0 text-[var(--text-muted)] transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &rsaquo;
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-[var(--text-muted)]">{open ? 'Hide' : hint}</span>
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="mt-3 flex min-w-0 flex-col gap-3 border-t border-[var(--panel-border)] pt-3"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Pattern page
 * ---------------------------------------------------------------------- */

export function LldPatternDetail({ pattern }: { pattern: LldPattern }) {
  const problems = content.lldQuestions.filter((q) => q.patterns.includes(pattern.id))

  return (
    <article className="flex min-w-0 flex-col gap-8">
      <header className="min-w-0">
        <p className="eyebrow">LLD pattern</p>
        <h1 className="mt-1">{pattern.name}</h1>
      </header>

      <section className="panel min-w-0 rounded-[var(--radius)] p-4">
        <h2 className="eyebrow">What it solves</h2>
        <p className="mt-2 text-sm">{pattern.solves}</p>
      </section>

      {/*
        Given real prominence on purpose. Every pattern catalogue tells you what
        a pattern is for; almost none tell you when reaching for it makes the
        design worse, which is exactly the judgement an interviewer is probing.
      */}
      <section
        className="panel min-w-0 rounded-[var(--radius)] p-5"
        style={{ borderColor: 'var(--warning)' }}
        data-testid="when-wrong"
      >
        <h2 className="eyebrow" style={{ color: 'var(--warning)' }}>
          When this is the wrong choice
        </h2>
        <p className="mt-2 max-w-[68ch] text-base leading-relaxed">{pattern.whenWrong}</p>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="eyebrow">How to spot it</h2>
        <Bullets items={pattern.notes} />
      </section>

      {pattern.diagram !== undefined ? (
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="eyebrow">Structure</h2>
          <Mermaid source={pattern.diagram} caption={`${pattern.name} — class structure`} />
        </section>
      ) : null}

      <section className="flex min-w-0 flex-col gap-2">
        <h2 className="eyebrow">Example (Python)</h2>
        <Python source={pattern.example} label={`${pattern.name} example, Python`} />
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="eyebrow">Pitfalls</h2>
        <Bullets items={pattern.pitfalls} />
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="eyebrow">Problems that exercise it</h2>
        <ul className="flex min-w-0 flex-col gap-2">
          {problems.map((q) => (
            <li key={q.id}>
              <Link
                href={`/lld/${lldSlug(q.id)}`}
                className="panel card flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-[var(--radius)] px-4 py-2.5"
              >
                <span className="min-w-0 text-sm">{q.name}</span>
                <span className="readout shrink-0 text-[var(--text-faint)]">{q.minutes}m</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}

/* -------------------------------------------------------------------------
 * Machine coding problem page
 * ---------------------------------------------------------------------- */

export function LldProblemDetail({ question }: { question: LldQuestion }) {
  const patterns = question.patterns
    .map((id) => content.lldPatterns.find((p) => p.id === id))
    .filter((p): p is LldPattern => p !== undefined)

  return (
    <article className="flex min-w-0 flex-col gap-8">
      <header className="min-w-0">
        <p className="eyebrow">Machine coding</p>
        <h1 className="mt-1">{question.name}</h1>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
          <span className="readout text-[var(--text-faint)]">{question.minutes}m</span>
          <CompanyPills companies={question.companies} />
        </div>
      </header>

      {/* 1. The prompt, as the interviewer reads it out. */}
      <section className="panel min-w-0 rounded-[var(--radius)] p-5" data-testid="statement">
        <h2 className="eyebrow" style={{ color: 'var(--accent)' }}>
          The prompt
        </h2>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed md:text-lg">
          {question.statement}
        </p>
      </section>

      {/* 2. What to ask before writing a line. */}
      <section className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <h2 className="eyebrow">Ask these first</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Before any code. Each answer removes a design you would otherwise have to guess at.
          </p>
        </div>
        <Bullets items={question.clarify} />
      </section>

      {/* 3. Graded reveals. Attempt it from the two sections above alone. */}
      <section className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <h2 className="eyebrow">Reveal the answer</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Attempt the problem from the prompt and your clarifying questions first — these open
            only when you ask.
          </p>
        </div>

        <Reveal label="Entities" hint="The objects, and who owns what">
          <Bullets items={question.entities} />
        </Reveal>

        <Reveal label="Class diagram" hint="The structure, drawn">
          <Mermaid source={question.diagram} caption={`${question.name} — class diagram`} />
        </Reveal>

        <Reveal label="Reference solution (Python)" hint="Runnable sketch, with asserts">
          <Python source={question.solution} label={`${question.name} reference solution, Python`} />
        </Reveal>
      </section>

      {/* 4. What comes after you finish. */}
      <section className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <h2 className="eyebrow">Extensions</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            What the interviewer asks once your first version works.
          </p>
        </div>
        <Bullets items={question.extensions} />
      </section>

      {/* 5. The patterns this exercises. */}
      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="eyebrow">Patterns it exercises</h2>
        <ul className="flex min-w-0 flex-wrap gap-2">
          {patterns.map((p) => (
            <li key={p.id} className="min-w-0">
              <Link
                href={`/lld/${lldSlug(p.id)}`}
                className="panel card flex min-h-11 min-w-0 items-center rounded-[var(--radius)] px-4 text-sm"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="panel min-w-0 rounded-[var(--radius)] p-2">
        <Checkbox itemId={question.id} label={`Solved — ${question.name}`} />
      </div>
    </article>
  )
}
