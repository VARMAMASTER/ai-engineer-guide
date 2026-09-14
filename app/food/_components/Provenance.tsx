import Panel from '@/components/ui/Panel'
import Tag from '@/components/ui/Tag'
import {
  confidenceBlurb,
  confidenceLabel,
  sourceBlurb,
  sourceLabel,
} from '@/lib/food/nutrients'
import type { Confidence, NutritionSource } from '@/lib/food/types'

/**
 * Where a number came from, and how much to trust it.
 *
 * On every food, without exception. A user has to be able to tell an
 * ICMR-sourced figure from somebody's considered guess, and the only way to
 * make that possible is to put it on the page rather than in a footnote about
 * "our data sources". An estimate is labelled an estimate, in the same place a
 * measured value would be labelled measured.
 *
 * `confidence` drives the colour, and only three exist: this is deliberately
 * not a five-star rating. A number that was never measured cannot be 60%
 * trustworthy, and a finer scale would invite arithmetic on the scale itself.
 */

const CONFIDENCE_TAG: Record<Confidence, { variant: 'default' | 'outline' | 'accent'; className: string }> = {
  high: { variant: 'accent', className: '' },
  medium: { variant: 'outline', className: '' },
  low: { variant: 'outline', className: 'text-[var(--warning)]' },
}

export interface ProvenanceProps {
  source: NutritionSource
  confidence: Confidence
  note?: string
  /** For a dish: the weakest confidence among its ingredients. */
  weakestIngredientConfidence?: Confidence
}

export default function Provenance({
  source,
  confidence,
  note,
  weakestIngredientConfidence,
}: ProvenanceProps) {
  const tag = CONFIDENCE_TAG[confidence]
  return (
    <Panel tier="panel" className="flex flex-col gap-3 p-4">
      <h2 className="eyebrow" id="provenance">
        Where these numbers come from
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <Tag variant="outline">{sourceLabel(source)}</Tag>
        <Tag variant={tag.variant} className={tag.className}>
          {confidenceLabel(confidence)}
        </Tag>
      </div>

      <p className="text-sm text-[var(--text-muted)]">{sourceBlurb(source)}</p>
      <p className="text-sm text-[var(--text-muted)]">{confidenceBlurb(confidence)}</p>

      {note ? (
        <Panel tier="solid" className="p-3">
          <p className="text-sm text-[var(--text-muted)]">{note}</p>
        </Panel>
      ) : null}

      {weakestIngredientConfidence ? (
        <p className="text-sm text-[var(--text-muted)]">
          The weakest ingredient figure in this recipe is{' '}
          <strong className="font-medium text-[var(--text)]">
            {confidenceLabel(weakestIngredientConfidence).toLowerCase()}
          </strong>
          , and that is the ceiling on the dish however carefully the quantities are measured.
        </p>
      ) : null}
    </Panel>
  )
}
