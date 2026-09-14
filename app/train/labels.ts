import type {
  Equipment,
  ExperienceLevel,
  Goal,
  Injury,
  MovementPattern,
  MuscleGroup,
  Split,
} from '@/lib/train/types'

/**
 * How Train's vocabulary is spoken in the interface.
 *
 * Kept out of `lib/train/types.ts` deliberately: those enums are the domain's
 * words and are asserted on by id in 46 tests. A display string is a UI
 * decision that will change (and should be able to) without touching a type
 * the whole app is built on.
 */

export const GOAL_LABELS: Record<Goal, string> = {
  strength: 'Strength',
  hypertrophy: 'Muscle size',
  general_fitness: 'General fitness',
}

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  bodyweight: 'Bodyweight',
  machine: 'Machines',
  cable: 'Cables',
  kettlebell: 'Kettlebells',
  bands: 'Bands',
}

export const INJURY_LABELS: Record<Injury, string> = {
  shoulder: 'Shoulder',
  knee: 'Knee',
  lower_back: 'Lower back',
  elbow: 'Elbow',
  wrist: 'Wrist',
  hip: 'Hip',
}

/**
 * Movement patterns, spelled the way a person would say them. These are shown
 * next to an injury because the exclusion is of a PATTERN, not of a named
 * exercise — "shoulder" removes overhead pressing entirely, not just the row in
 * the library called Overhead Press. Saying which movements went is the
 * difference between a plan that looks arbitrarily short and one that explains
 * itself.
 */
export const PATTERN_LABELS: Record<MovementPattern, string> = {
  horizontal_push: 'horizontal pressing',
  horizontal_pull: 'rowing',
  vertical_push: 'overhead pressing',
  vertical_pull: 'pull-ups and pulldowns',
  squat: 'squatting',
  hinge: 'hinging and deadlifts',
  lunge: 'lunging',
  carry: 'carries',
  core: 'direct core work',
  isolation: 'isolation work',
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
}

export const SPLIT_LABELS: Record<Split, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper / lower',
  push_pull_legs: 'Push / pull / legs',
}

/** `1,240 kg` — tonnage gets big fast and an unseparated five-digit number is unreadable. */
export function formatKg(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded.toLocaleString('en-GB', { maximumFractionDigits: 1 })} kg`
}

/** `40 kg` / `42.5 kg` / `Bodyweight` — 0 kg is a real load, not a missing one. */
export function formatLoad(value: number): string {
  if (value === 0) return 'Bodyweight'
  return formatKg(value)
}
