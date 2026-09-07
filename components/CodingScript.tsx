'use client'

/**
 * The coding round's communication script (spec 6.8).
 *
 * System design questions in this guide carry a delivery script; coding
 * carried none, and that is the wrong way round. Almost nobody fails a coding
 * round because they could not write the two-pointer loop. They fail because
 * they went silent for nine minutes, started typing before agreeing on an
 * approach, or finished the code and never said what it costs.
 *
 * So the sequence is written down, in order, with the sentence you actually
 * say — not a category name like "clarify requirements", which is advice you
 * cannot perform. Ticking a step is a rehearsal aid, not a score: the marks
 * live with the session and die with it, because the habit is what carries
 * into the interview, not the checkboxes.
 */

export interface ScriptStep {
  id: string
  title: string
  /** A sentence you can say out loud, close to verbatim. */
  cue: string
}

export const SCRIPT_STEPS: ScriptStep[] = [
  {
    id: 'restate',
    title: 'Restate the problem',
    cue: 'So the input is X, and I need to return Y. Have I got that right?',
  },
  {
    id: 'constraints',
    title: 'Ask about constraints and edge cases',
    cue: 'How big can n get? Can the input be empty, have duplicates, or be negative? Am I optimising for time or memory?',
  },
  {
    id: 'brute-force',
    title: 'State a brute force with its complexity',
    cue: 'The obvious approach is to check every pair — O(n squared) time, O(1) space. Let me see if I can do better.',
  },
  {
    id: 'pattern',
    title: 'Name the pattern and the better approach',
    cue: 'The fact that we only care about whether a value was seen before points at a hash map, which gets this to one pass.',
  },
  {
    id: 'narrate',
    title: 'Code it while narrating',
    cue: 'I am going to build the map first, then scan once — I will check the complement before inserting, so an element cannot pair with itself.',
  },
  {
    id: 'trace',
    title: 'Trace a small example by hand',
    cue: 'Let me run it on [2, 7, 11] with target 9: i is 0, map is empty, we store 2, then at i is 1 the complement 2 is there, so we return [0, 1].',
  },
  {
    id: 'complexity',
    title: 'State the final complexity',
    cue: 'That is O(n) time because each element is touched once, and O(n) space for the map in the worst case.',
  },
  {
    id: 'tests',
    title: 'Say what you would test',
    cue: 'I would test the empty input, a single element, no valid answer, duplicates, and the answer at both ends of the array.',
  },
]

interface Props {
  /** Step ids ticked so far, from the live session. */
  checked: string[]
  onToggle: (stepId: string) => void
  /** True once the drill has ended — the script becomes a read-only record. */
  disabled?: boolean
}

export default function CodingScript({ checked, onToggle, disabled = false }: Props) {
  const done = SCRIPT_STEPS.filter((s) => checked.includes(s.id)).length

  return (
    <section className="panel flex min-w-0 flex-col gap-3 p-4" data-testid="coding-script">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="eyebrow">Say it out loud, in this order</h2>
        <span className="readout text-[var(--text-muted)]" data-testid="script-progress">
          {done}
          <span className="text-[var(--text-faint)]">/{SCRIPT_STEPS.length}</span>
        </span>
      </div>

      <ol className="flex min-w-0 flex-col gap-2">
        {SCRIPT_STEPS.map((step, i) => {
          const ticked = checked.includes(step.id)
          return (
            <li key={step.id} className="min-w-0">
              <label
                data-step-id={step.id}
                data-ticked={ticked ? 'true' : 'false'}
                className="surface-solid group flex min-h-11 w-full cursor-pointer items-start gap-3 p-3 data-[ticked=true]:[filter:saturate(0.55)]"
              >
                <input
                  type="checkbox"
                  checked={ticked}
                  disabled={disabled}
                  onChange={() => onToggle(step.id)}
                  aria-label={step.title}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-solid)] transition-colors checked:border-[var(--accent)] checked:bg-[var(--accent)] disabled:cursor-default"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex min-w-0 items-baseline gap-2 text-sm font-medium group-data-[ticked=true]:text-[var(--text-muted)] group-data-[ticked=true]:line-through">
                    <span className="readout shrink-0 text-[var(--text-faint)]">{i + 1}</span>
                    <span className="min-w-0">{step.title}</span>
                  </span>
                  <span className="text-sm text-[var(--text-muted)] italic">“{step.cue}”</span>
                </span>
              </label>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
