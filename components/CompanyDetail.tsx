import ContentProse from './ContentProse'
import type { CompanyGuide } from '@/lib/content/schema'
import { formatMinutes, loopMinutes, loopRoundCount } from './CompanyIndex'

/* -------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------- */

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex min-w-0 max-w-[80ch] flex-col gap-2 pl-5 text-sm">
      {items.map((item) => (
        <li key={item} className="list-disc marker:text-[var(--text-faint)]">
          {item}
        </li>
      ))}
    </ul>
  )
}

/**
 * The rounds table.
 *
 * A real `<table>` — the four columns are genuinely tabular and a screen
 * reader should read them as such. Below `md` the cells drop to block/inline
 * so each row stacks into a card and picks up its own visible column labels;
 * nothing is duplicated in the DOM, so the labels come and go with the layout
 * rather than being hidden copies of each other.
 */
function RoundsTable({ guide }: { guide: CompanyGuide }) {
  return (
    <div className="panel min-w-0 rounded-[var(--radius)] p-4">
      <table className="w-full min-w-0 border-collapse text-left">
        <caption className="sr-only">{guide.name} interview loop, round by round</caption>
        <thead className="hidden md:table-header-group">
          <tr>
            <th scope="col" className="eyebrow pb-2 pr-4 align-bottom">
              Round
            </th>
            <th scope="col" className="eyebrow pb-2 pr-4 align-bottom">
              Count
            </th>
            <th scope="col" className="eyebrow pb-2 pr-4 align-bottom">
              Minutes
            </th>
            <th scope="col" className="eyebrow pb-2 align-bottom">
              What it is
            </th>
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {guide.rounds.map((r) => (
            <tr
              key={r.name}
              className="block border-t border-[var(--panel-border)] py-3 first:border-t-0 first:pt-0 md:table-row md:py-0"
            >
              <th
                scope="row"
                className="block pr-4 pb-1 text-left align-top text-sm font-semibold md:table-cell md:w-[15rem] md:py-3 md:pb-3"
              >
                {r.name}
              </th>
              <td className="mr-4 inline-block pb-1 align-top md:mr-0 md:table-cell md:py-3">
                <span className="eyebrow mr-1.5 md:hidden">Rounds</span>
                <span className="readout">{r.count}</span>
              </td>
              <td className="inline-block pb-1 align-top md:table-cell md:py-3 md:pr-4">
                <span className="eyebrow mr-1.5 md:hidden">Each</span>
                <span className="readout">{r.minutes}m</span>
              </td>
              <td className="block max-w-[62ch] align-top text-sm text-[var(--text-muted)] md:table-cell md:py-3">
                {r.what}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * One company's loop.
 *
 * `marketNote` closes the page and is given more weight than anything else on
 * it. Everything above is a description of a process; the market note is the
 * only part that says whether the process is available to this candidate at
 * all. A guide that lists Anthropic's rounds without saying that Anthropic
 * does not hire engineers in India reads as encouraging, and encouraging is
 * not the same as useful.
 */
export default function CompanyDetail({ guide }: { guide: CompanyGuide }) {
  return (
    <article className="flex min-w-0 flex-col gap-8">
      <header className="min-w-0">
        <p className="eyebrow">Interview loop</p>
        <h1 className="mt-1">{guide.name}</h1>
        <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="readout text-[var(--text-faint)]">
            {loopRoundCount(guide)} interviews
          </span>
          <span className="readout text-[var(--text-faint)]">&middot;</span>
          <span className="readout text-[var(--text-faint)]">
            {formatMinutes(loopMinutes(guide))} in the room
          </span>
        </p>
      </header>

      <section className="panel min-w-0 rounded-[var(--radius)] p-5">
        <h2 className="eyebrow" style={{ color: 'var(--accent)' }}>
          Realistic level
        </h2>
        <p className="mt-2 max-w-[68ch] text-base leading-relaxed">{guide.level}</p>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="eyebrow">The loop</h2>
        <RoundsTable guide={guide} />
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <h2 className="eyebrow" style={{ color: 'var(--warning)' }}>
            Where this loop is lost
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Not generic interview advice — the failure modes specific to {guide.name}.
          </p>
        </div>
        <Bullets items={guide.failsOn} />
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <h2 className="eyebrow">Drill this in the two weeks before</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Everything named here is a page in this guide. Tap it.
          </p>
        </div>
        <ul className="flex min-w-0 max-w-[80ch] flex-col gap-2 pl-5 text-sm">
          {guide.drill.map((d) => (
            <li key={d} className="list-disc marker:text-[var(--text-faint)]">
              <ContentProse text={d} />
            </li>
          ))}
        </ul>
      </section>

      <section
        className="panel min-w-0 rounded-[var(--radius)] p-5"
        style={{ borderColor: 'var(--warning)' }}
        data-testid="market-note"
      >
        <h2 className="eyebrow" style={{ color: 'var(--warning)' }}>
          The honest note on hiring where you are
        </h2>
        <p className="mt-2 max-w-[66ch] text-base leading-relaxed md:text-lg">
          {guide.marketNote}
        </p>
      </section>
    </article>
  )
}
