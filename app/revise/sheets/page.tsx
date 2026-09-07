import Link from 'next/link'
import CheatSheets from '@/components/CheatSheets'

export const metadata = { title: 'Cheat sheets | AI Engineer Practice Guide' }

/**
 * Six dense sheets (spec 6.7b), server-rendered with no client JavaScript.
 * `CheatSheets` carries the print block, so Ctrl-P gives ink on paper rather
 * than a screenshot of a dark app.
 */
export default function CheatSheetsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-1">
        <Link href="/revise" className="eyebrow w-fit hover:text-[var(--accent)]" data-print-hide>
          Revise
        </Link>
        <h1>Cheat sheets</h1>
        <p className="text-sm text-[var(--text-muted)]">
          The numbers and formulas that go missing under pressure. Dense on purpose, and built to
          print — six sheets, one page each.
        </p>
      </div>

      <CheatSheets />
    </div>
  )
}
