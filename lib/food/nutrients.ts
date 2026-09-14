import type { Confidence, NutrientKey, Nutrients, NutritionSource } from './types'

/**
 * The nutrition panel, as data — which nutrients, in which order, at which
 * precision, and how an absent value is written down.
 *
 * ---------------------------------------------------------------------------
 * THE UNKNOWN RULE, in one place so it cannot be got wrong twice.
 *
 * `formatNutrient(null)` returns "not known". Not "0", not "0 g", not "—".
 *
 * A dash is barely better than a zero: it reads as "nothing here" and a user
 * who wants their fibre intake will quietly treat it as none. The words have
 * to say which fact is missing, and that is why this returns a string with a
 * `known: false` flag rather than a number the caller might format itself.
 * ---------------------------------------------------------------------------
 */

export interface NutrientSpec {
  key: NutrientKey
  label: string
  unit: 'kcal' | 'g' | 'mg'
  /** Decimal places. Energy gets none: "124.37 kcal" is false precision. */
  places: number
  /**
   * `macro` is the panel every label carries and every source publishes.
   * `micro` is the laborious, least reliable half — mostly unmeasured here,
   * and shown in its own block so an unknown micronutrient does not read as a
   * gap in the macros.
   */
  band: 'macro' | 'micro'
  /** Rendered indented under its parent, the way a nutrition label does it. */
  sub?: boolean
}

/**
 * Order matters and follows the order on a packet, because that is the order
 * people can read without hunting: energy, protein, carbohydrate (of which
 * sugars), fat (of which saturates), fibre, sodium.
 */
export const NUTRIENTS: readonly NutrientSpec[] = [
  { key: 'kcal', label: 'Energy', unit: 'kcal', places: 0, band: 'macro' },
  { key: 'protein_g', label: 'Protein', unit: 'g', places: 1, band: 'macro' },
  { key: 'carb_g', label: 'Carbohydrate', unit: 'g', places: 1, band: 'macro' },
  { key: 'sugar_g', label: 'of which sugars', unit: 'g', places: 1, band: 'macro', sub: true },
  { key: 'fat_g', label: 'Fat', unit: 'g', places: 1, band: 'macro' },
  { key: 'sat_fat_g', label: 'of which saturates', unit: 'g', places: 1, band: 'macro', sub: true },
  { key: 'fibre_g', label: 'Fibre', unit: 'g', places: 1, band: 'macro' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', places: 0, band: 'macro' },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', places: 0, band: 'micro' },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', places: 1, band: 'micro' },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg', places: 0, band: 'micro' },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg', places: 1, band: 'micro' },
] as const

export const MACRO_NUTRIENTS = NUTRIENTS.filter((n) => n.band === 'macro')
export const MICRO_NUTRIENTS = NUTRIENTS.filter((n) => n.band === 'micro')

/** The phrase for an unmeasured value. One constant, so it is never "0" by accident. */
export const NOT_KNOWN = 'not known'

export interface FormattedNutrient {
  /** False when the value is absent. The caller styles on this, not on the text. */
  known: boolean
  /** "124 kcal", "8.4 g", or exactly `NOT_KNOWN`. */
  text: string
}

/**
 * Format one nutrient value for display.
 *
 * `null` and `undefined` both mean not known. `NaN` does too — it is what an
 * arithmetic slip produces, and printing "NaN g" in a nutrition panel is
 * worse than admitting the gap.
 */
export function formatNutrient(value: number | null | undefined, spec: NutrientSpec): FormattedNutrient {
  if (value == null || !Number.isFinite(value)) return { known: false, text: NOT_KNOWN }
  const rounded = value.toFixed(spec.places)
  return { known: true, text: `${rounded} ${spec.unit}` }
}

/** Scale a set of nutrients from per-100 g to an arbitrary weight. */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100
  const scale = (v: number | null): number | null => (v == null ? null : v * factor)
  return {
    kcal: per100g.kcal * factor,
    protein_g: per100g.protein_g * factor,
    carb_g: per100g.carb_g * factor,
    fat_g: per100g.fat_g * factor,
    sugar_g: scale(per100g.sugar_g),
    sat_fat_g: scale(per100g.sat_fat_g),
    fibre_g: scale(per100g.fibre_g),
    sodium_mg: scale(per100g.sodium_mg),
    calcium_mg: scale(per100g.calcium_mg),
    iron_mg: scale(per100g.iron_mg),
    potassium_mg: scale(per100g.potassium_mg),
    vitamin_c_mg: scale(per100g.vitamin_c_mg),
  }
}

/** How many of the twelve nutrients this row actually has a figure for. */
export function knownCount(n: Nutrients): number {
  return NUTRIENTS.filter((spec) => {
    const value = n[spec.key]
    return value != null && Number.isFinite(value)
  }).length
}

const SOURCE_LABEL: Record<NutritionSource, string> = {
  'ifct-2017': 'IFCT 2017 (ICMR-NIN)',
  'usda-fdc': 'USDA FoodData Central',
  label: 'Manufacturer label',
  derived: 'Computed from this recipe',
  estimate: 'Estimate',
}

const SOURCE_BLURB: Record<NutritionSource, string> = {
  'ifct-2017':
    'The Indian Food Composition Tables, published by the National Institute of Nutrition. The authority for Indian foods, and analysed on Indian samples.',
  'usda-fdc':
    'The USDA reference database. Reliable for whole foods that are the same everywhere; its composed dishes are American and are not used here.',
  label: 'Taken from a pack. True of that pack and of nothing else.',
  derived:
    'Not measured. Summed from the ingredient quantities below, so it is exactly as good as they are and as close as this recipe is to yours.',
  estimate:
    'A considered figure, not a measured one. Treat it as the right order of magnitude and no better.',
}

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

const CONFIDENCE_BLURB: Record<Confidence, string> = {
  high: 'A published reference value for this exact food in this exact state.',
  medium:
    'A published value for a close match, or one commonly cited figure among several that disagree by a few per cent.',
  low: 'Weak. Either the sources disagree badly or nobody has published this one — do not build a diet on it.',
}

export function sourceLabel(source: NutritionSource): string {
  return SOURCE_LABEL[source]
}

export function sourceBlurb(source: NutritionSource): string {
  return SOURCE_BLURB[source]
}

export function confidenceLabel(confidence: Confidence): string {
  return CONFIDENCE_LABEL[confidence]
}

export function confidenceBlurb(confidence: Confidence): string {
  return CONFIDENCE_BLURB[confidence]
}

/** Weakest wins: a dish of six good figures and one guess is a guess. */
export function weakest(values: readonly Confidence[]): Confidence {
  if (values.includes('low')) return 'low'
  if (values.includes('medium')) return 'medium'
  return 'high'
}
