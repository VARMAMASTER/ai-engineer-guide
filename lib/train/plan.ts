import { EXERCISES } from './exercises'
import { RESTRICTED_PATTERNS, type Equipment, type Exercise, type MovementPattern, type MuscleGroup, type Plan, type PlanDay, type Split, type TrainingProfile } from './types'

const MIN_DAYS = 2
const MAX_DAYS = 6

/**
 * Sensible splits by available days, per section 5.2 of the design spec:
 * full body at 2-3, upper/lower at 4, push/pull/legs at 5-6. Deliberately
 * not configurable beyond this — the brief is "do not invent exotic
 * splits."
 */
function chooseSplit(days: number): Split {
  if (days <= 3) return 'full_body'
  if (days === 4) return 'upper_lower'
  return 'push_pull_legs'
}

interface Slot {
  pattern: MovementPattern
  muscle?: MuscleGroup
}

const FULL_BODY_SLOTS: Slot[] = [
  { pattern: 'squat' },
  { pattern: 'hinge' },
  { pattern: 'horizontal_push' },
  { pattern: 'horizontal_pull' },
  { pattern: 'core' },
]

const UPPER_SLOTS: Slot[] = [
  { pattern: 'horizontal_push' },
  { pattern: 'horizontal_pull' },
  { pattern: 'vertical_push' },
  { pattern: 'vertical_pull' },
  { pattern: 'isolation', muscle: 'biceps' },
  { pattern: 'isolation', muscle: 'triceps' },
]

const LOWER_SLOTS: Slot[] = [
  { pattern: 'squat' },
  { pattern: 'hinge' },
  { pattern: 'lunge' },
  { pattern: 'isolation', muscle: 'calves' },
  { pattern: 'core' },
]

const PUSH_SLOTS: Slot[] = [
  { pattern: 'horizontal_push' },
  { pattern: 'vertical_push' },
  { pattern: 'isolation', muscle: 'triceps' },
  { pattern: 'isolation', muscle: 'shoulders' },
]

const PULL_SLOTS: Slot[] = [
  { pattern: 'horizontal_pull' },
  { pattern: 'vertical_pull' },
  { pattern: 'isolation', muscle: 'biceps' },
]

const LEGS_SLOTS: Slot[] = [
  { pattern: 'squat' },
  { pattern: 'hinge' },
  { pattern: 'lunge' },
  { pattern: 'isolation', muscle: 'calves' },
  { pattern: 'core' },
]

/** Which slot template and label back each day of a split, in order. */
function dayTemplates(split: Split, days: number): Array<{ label: string; slots: Slot[] }> {
  if (split === 'full_body') {
    return Array.from({ length: days }, (_, i) => ({ label: `Full Body ${i + 1}`, slots: FULL_BODY_SLOTS }))
  }
  if (split === 'upper_lower') {
    const cycle = [
      { label: 'Upper', slots: UPPER_SLOTS },
      { label: 'Lower', slots: LOWER_SLOTS },
    ]
    return Array.from({ length: days }, (_, i) => cycle[i % 2])
  }
  // push_pull_legs: 5 days repeats Push/Pull once more rather than a
  // partial second Legs day; 6 days is two clean rotations.
  const rotation = [
    { label: 'Push', slots: PUSH_SLOTS },
    { label: 'Pull', slots: PULL_SLOTS },
    { label: 'Legs', slots: LEGS_SLOTS },
  ]
  if (days === 5) return [rotation[0], rotation[1], rotation[2], rotation[0], rotation[1]]
  return Array.from({ length: days }, (_, i) => rotation[i % 3])
}

function excludedPatterns(profile: TrainingProfile): Set<MovementPattern> {
  const out = new Set<MovementPattern>()
  for (const injury of profile.injuries) {
    for (const pattern of RESTRICTED_PATTERNS[injury]) out.add(pattern)
  }
  return out
}

/**
 * Equipment available to the profile. An empty list is treated as
 * bodyweight-only — you always have your own bodyweight, so "no equipment"
 * is a real, plannable case rather than a plan of nothing.
 */
function availableEquipment(profile: TrainingProfile): Set<Equipment> {
  return new Set(profile.equipment.length > 0 ? profile.equipment : ['bodyweight'])
}

/**
 * Picks one exercise for a slot, falling back from an exact
 * pattern+muscle match to a muscle-only match before giving up. Excludes
 * ids already used elsewhere in the same day so a plan does not repeat an
 * exercise across slots.
 */
function selectExercise(
  slot: Slot,
  equipment: Set<Equipment>,
  excluded: Set<MovementPattern>,
  usedInDay: Set<string>,
): Exercise | undefined {
  const base = (candidates: Exercise[]) =>
    candidates.filter((e) => equipment.has(e.equipment) && !excluded.has(e.pattern) && !usedInDay.has(e.id))

  const exact = base(EXERCISES).filter(
    (e) => e.pattern === slot.pattern && (!slot.muscle || e.primaryMuscle === slot.muscle),
  )
  const byCompound = [...exact].sort((a, b) => Number(b.compound) - Number(a.compound))
  if (byCompound.length > 0) return byCompound[0]

  if (slot.muscle) {
    const muscleOnly = base(EXERCISES).filter((e) => e.primaryMuscle === slot.muscle)
    if (muscleOnly.length > 0) return muscleOnly[0]
  }
  return undefined
}

/**
 * Builds a plan from goal, available days, equipment and injuries.
 *
 * Never throws: an over-constrained profile (equipment down to bodyweight
 * plus several conflicting injuries) yields a plan with some slots left
 * unfilled rather than an exception — the gaps are recorded in
 * `notes` rather than hidden. This is a deliberate decision for the "the
 * constraints admit almost nothing" case: a plan with 2 exercises and 3
 * notes explaining the rest is more useful, and more honest, than an error.
 */
export function generatePlan(profile: TrainingProfile): Plan {
  const notes: string[] = []

  let days = profile.availableDays
  if (days < MIN_DAYS) {
    notes.push(`Requested ${days} day(s)/week clamped to the minimum of ${MIN_DAYS}.`)
    days = MIN_DAYS
  } else if (days > MAX_DAYS) {
    notes.push(`Requested ${days} day(s)/week clamped to the maximum of ${MAX_DAYS}.`)
    days = MAX_DAYS
  }

  const split = chooseSplit(days)
  const equipment = availableEquipment(profile)
  const excluded = excludedPatterns(profile)

  const planDays: PlanDay[] = dayTemplates(split, days).map((template) => {
    const usedInDay = new Set<string>()
    const exerciseIds: string[] = []
    for (const slot of template.slots) {
      const exercise = selectExercise(slot, equipment, excluded, usedInDay)
      if (exercise) {
        exerciseIds.push(exercise.id)
        usedInDay.add(exercise.id)
      } else {
        const target = slot.muscle ? `${slot.pattern}/${slot.muscle}` : slot.pattern
        notes.push(
          `${template.label}: no available exercise for ${target} given the current equipment and injury constraints.`,
        )
      }
    }
    if (exerciseIds.length === 0) {
      notes.push(`${template.label}: no exercises could be safely selected for this day at all.`)
    }
    return { label: template.label, exerciseIds }
  })

  return { daysPerWeek: days, split, days: planDays, notes }
}
