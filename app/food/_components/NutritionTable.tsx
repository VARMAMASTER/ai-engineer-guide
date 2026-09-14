import Panel from '@/components/ui/Panel'
import {
  MACRO_NUTRIENTS,
  MICRO_NUTRIENTS,
  NOT_KNOWN,
  formatNutrient,
  scaleNutrients,
  type NutrientSpec,
} from '@/lib/food/nutrients'
import type { NutrientKey, Nutrients, Serving } from '@/lib/food/types'

/**
 * The nutrition panel.
 *
 * ---------------------------------------------------------------------------
 * THE ONE THING THIS COMPONENT EXISTS TO GET RIGHT
 *
 * An unmeasured value renders as the words "not known", in muted italics, and
 * NEVER as 0 and never as a bare dash. Zero and unknown are different facts:
 * ghee contains no fibre (measured) and nobody has published the potassium in
 * kasuri methi (absent), and a table that prints "0.0 g" for both is lying
 * about the second one. Conflating them is the core failure of nutrition
 * databases, and it is the reason the whole `lib/food` type layer keeps
 * `number | null` instead of defaulting to zero.
 *
 * Where a dish's value is unknown BECAUSE one of its ingredients has no
 * figure, `missing` names them. "not known" with no explanation is a dead end;
 * "not known — drumstick and curry leaves have no figure" is something a
 * reader can go and fix.
 * ---------------------------------------------------------------------------
 *
 * Layout: the table gets its own `overflow-x-auto`, which is what keeps a
 * three-column panel off the page's horizontal scrollbar at 390px. The page
 * must never scroll sideways; a wide table inside it may.
 */

export interface NutritionTableProps {
  per100g: Nutrients
  /** Extra columns — a katori, one idli, ten almonds. */
  servings?: Serving[]
  /** Which ingredients are responsible for each unknown, if this is a dish. */
  missing?: Partial<Record<NutrientKey, string[]>>
  caption?: string
}

function Row({
  spec,
  columns,
  missing,
}: {
  spec: NutrientSpec
  columns: Nutrients[]
  missing?: string[]
}) {
  return (
    <tr className="border-t border-[var(--panel-border)]">
      <th
        scope="row"
        className={`py-2 pr-4 text-left font-normal ${
          spec.sub ? 'pl-4 text-[var(--text-faint)]' : 'text-[var(--text)]'
        }`}
      >
        {spec.label}
        {missing && missing.length > 0 ? (
          <span className="block text-xs text-[var(--text-faint)]">
            no figure for {missing.slice(0, 3).join(', ')}
            {missing.length > 3 ? ` and ${missing.length - 3} more` : ''}
          </span>
        ) : null}
      </th>
      {columns.map((column, index) => {
        const value = formatNutrient(column[spec.key], spec)
        return (
          <td
            key={index}
            className={`py-2 pl-4 text-right tabular-nums whitespace-nowrap ${
              value.known ? 'text-[var(--text)]' : 'text-[var(--text-faint)] italic'
            }`}
          >
            {value.text}
          </td>
        )
      })}
    </tr>
  )
}

export default function NutritionTable({
  per100g,
  servings = [],
  missing = {},
  caption,
}: NutritionTableProps) {
  const columns = [per100g, ...servings.map((serving) => scaleNutrients(per100g, serving.grams))]
  const headers = ['Per 100 g', ...servings.map((s) => `${s.label} (${s.grams} g)`)]

  return (
    <Panel tier="panel" className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="eyebrow" id="nutrition">
          Nutrition
        </h2>
        {caption ? <p className="text-sm text-[var(--text-muted)]">{caption}</p> : null}
      </div>

      {/* Its own scroller. The page body stays put at 390px. */}
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[20rem] border-collapse text-sm">
          <caption className="sr-only">
            Nutrition per 100 grams{servings.length > 0 ? ' and per serving' : ''}. An absent value
            reads “{NOT_KNOWN}”, which is not the same as zero.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-left text-xs font-normal text-[var(--text-faint)]">
                Nutrient
              </th>
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="pb-2 pl-4 text-right text-xs font-normal whitespace-nowrap text-[var(--text-faint)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MACRO_NUTRIENTS.map((spec) => (
              <Row key={spec.key} spec={spec} columns={columns} missing={missing[spec.key]} />
            ))}
          </tbody>
          <tbody>
            <tr className="border-t border-[var(--panel-border)]">
              <th
                scope="row"
                colSpan={1 + headers.length}
                className="pt-4 pb-1 text-left text-xs font-normal text-[var(--text-faint)]"
              >
                Micronutrients — mostly unmeasured, and shown separately for that reason
              </th>
            </tr>
            {MICRO_NUTRIENTS.map((spec) => (
              <Row key={spec.key} spec={spec} columns={columns} missing={missing[spec.key]} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--text-faint)]">
        “{NOT_KNOWN}” means nobody has published a figure for it. It does not mean zero — a zero
        here is a measurement, like the fibre in ghee.
      </p>
    </Panel>
  )
}
