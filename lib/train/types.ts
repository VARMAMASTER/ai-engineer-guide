import { z } from 'zod'

/**
 * Train's own vocabulary. Nothing here reads Diet, Ops or the learning
 * modules — see `docs/superpowers/specs/2026-09-14-unified-app-design.md`
 * section 5.2. Training volume is derived only from Train's own logged
 * history; the calorie-balance relationship is real but it is the agent's
 * sentence to make, not a field on these types.
 */

export const muscleGroupSchema = z.enum([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
])
export type MuscleGroup = z.infer<typeof muscleGroupSchema>

export const equipmentSchema = z.enum([
  'barbell',
  'dumbbell',
  'bodyweight',
  'machine',
  'cable',
  'kettlebell',
  'bands',
])
export type Equipment = z.infer<typeof equipmentSchema>

/**
 * The movement pattern an exercise belongs to. This is the load-bearing
 * concept for injury exclusion (see `restrictedPatterns` below): an injury
 * rules out a pattern, not a named exercise, so "Overhead Press",
 * "Dumbbell Shoulder Press" and "Pike Push-Up" are all excluded together by
 * a shoulder restriction because they all express `vertical_push`.
 */
export const movementPatternSchema = z.enum([
  'horizontal_push',
  'horizontal_pull',
  'vertical_push',
  'vertical_pull',
  'squat',
  'hinge',
  'lunge',
  'carry',
  'core',
  'isolation',
])
export type MovementPattern = z.infer<typeof movementPatternSchema>

export const goalSchema = z.enum(['strength', 'hypertrophy', 'general_fitness'])
export type Goal = z.infer<typeof goalSchema>

export const experienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced'])
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>

/**
 * A restricted movement, not a restricted exercise. "shoulder" is the
 * general case the spec calls out by name: it must rule out overhead
 * pressing as a category, not just the one exercise literally called
 * "Overhead Press".
 */
export const injurySchema = z.enum(['shoulder', 'knee', 'lower_back', 'elbow', 'wrist', 'hip'])
export type Injury = z.infer<typeof injurySchema>

/**
 * Injury -> excluded movement patterns. This mapping is the whole point:
 * an entry here removes every exercise that expresses the pattern,
 * regardless of its name. It is intentionally conservative (a real
 * physio would refine it per person) and intentionally small — each row is
 * a documented judgement call, not an attempt at medical completeness.
 */
export const RESTRICTED_PATTERNS: Record<Injury, MovementPattern[]> = {
  // Overhead pressing loads the shoulder in its most vulnerable position.
  shoulder: ['vertical_push'],
  // Deep knee flexion under load is what a bad knee cannot tolerate.
  knee: ['squat', 'lunge'],
  // Spinal loading in flexion is the mechanism a bad lower back cannot take.
  lower_back: ['hinge'],
  // Pressing loads the elbow through its full extension range under load.
  elbow: ['horizontal_push', 'vertical_push'],
  wrist: [],
  hip: ['hinge', 'lunge'],
}

export interface Exercise {
  id: string
  name: string
  primaryMuscle: MuscleGroup
  pattern: MovementPattern
  equipment: Equipment
  /** Multi-joint, loads more than one muscle group at once. */
  compound: boolean
}

export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  primaryMuscle: muscleGroupSchema,
  pattern: movementPatternSchema,
  equipment: equipmentSchema,
  compound: z.boolean(),
}) satisfies z.ZodType<Exercise>

export const loggedSetSchema = z.object({
  exerciseId: z.string().min(1),
  reps: z.number().int().positive(),
  /** Kilograms. 0 is valid (bodyweight-only set). */
  load: z.number().min(0),
  /** Rate of perceived exertion, 1-10. Optional — plenty of logs skip it. */
  rpe: z.number().min(1).max(10).optional(),
  /** ISO instant the set was performed. */
  timestamp: z.string().min(1),
})
export type LoggedSet = z.infer<typeof loggedSetSchema>

export const sessionSchema = z.object({
  id: z.string().min(1),
  /** Local calendar date, `YYYY-MM-DD`. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sets: z.array(loggedSetSchema),
})
export type Session = z.infer<typeof sessionSchema>

export const planDaySchema = z.object({
  /** e.g. "Full Body", "Upper", "Push". */
  label: z.string().min(1),
  exerciseIds: z.array(z.string().min(1)),
})
export type PlanDay = z.infer<typeof planDaySchema>

export const splitSchema = z.enum(['full_body', 'upper_lower', 'push_pull_legs'])
export type Split = z.infer<typeof splitSchema>

export const planSchema = z.object({
  daysPerWeek: z.number().int().min(2).max(6),
  split: splitSchema,
  days: z.array(planDaySchema),
  /**
   * Decisions worth surfacing rather than silently swallowing: a clamped
   * day count, a slot that no available exercise could fill, a day left
   * empty because the constraints admitted nothing safe for it.
   */
  notes: z.array(z.string()),
})
export type Plan = z.infer<typeof planSchema>

export const trainingProfileSchema = z.object({
  goal: goalSchema,
  experience: experienceLevelSchema,
  /** Requested days/week. Plan generation clamps this into [2, 6] and notes it. */
  availableDays: z.number().int().min(0).max(14),
  equipment: z.array(equipmentSchema),
  injuries: z.array(injurySchema),
})
export type TrainingProfile = z.infer<typeof trainingProfileSchema>

/** Parses unknown input at a boundary (a form, storage, an API body). */
export function parseTrainingProfile(input: unknown): TrainingProfile {
  return trainingProfileSchema.parse(input)
}

export function parseSession(input: unknown): Session {
  return sessionSchema.parse(input)
}

export function parseLoggedSet(input: unknown): LoggedSet {
  return loggedSetSchema.parse(input)
}
