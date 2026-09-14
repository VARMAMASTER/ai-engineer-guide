import type { Exercise } from './types'

/**
 * A small built-in exercise library, big enough to cover every split at
 * every equipment tier the plan generator supports. Not a user-editable
 * catalogue (that's a future stage) — a fixed set pure functions can plan
 * against and tests can assert on by id.
 */
export const EXERCISES: Exercise[] = [
  // Squat pattern
  { id: 'back-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', pattern: 'squat', equipment: 'barbell', compound: true },
  { id: 'goblet-squat', name: 'Goblet Squat', primaryMuscle: 'quads', pattern: 'squat', equipment: 'dumbbell', compound: true },
  { id: 'bodyweight-squat', name: 'Bodyweight Squat', primaryMuscle: 'quads', pattern: 'squat', equipment: 'bodyweight', compound: true },

  // Hinge pattern
  { id: 'barbell-deadlift', name: 'Barbell Deadlift', primaryMuscle: 'hamstrings', pattern: 'hinge', equipment: 'barbell', compound: true },
  { id: 'dumbbell-rdl', name: 'Dumbbell Romanian Deadlift', primaryMuscle: 'hamstrings', pattern: 'hinge', equipment: 'dumbbell', compound: true },
  { id: 'kettlebell-swing', name: 'Kettlebell Swing', primaryMuscle: 'glutes', pattern: 'hinge', equipment: 'kettlebell', compound: true },
  { id: 'bodyweight-hip-hinge', name: 'Bodyweight Good Morning', primaryMuscle: 'hamstrings', pattern: 'hinge', equipment: 'bodyweight', compound: true },

  // Lunge pattern
  { id: 'dumbbell-walking-lunge', name: 'Dumbbell Walking Lunge', primaryMuscle: 'quads', pattern: 'lunge', equipment: 'dumbbell', compound: true },
  { id: 'bodyweight-lunge', name: 'Bodyweight Lunge', primaryMuscle: 'quads', pattern: 'lunge', equipment: 'bodyweight', compound: true },
  { id: 'barbell-lunge', name: 'Barbell Lunge', primaryMuscle: 'quads', pattern: 'lunge', equipment: 'barbell', compound: true },

  // Horizontal push
  { id: 'barbell-bench-press', name: 'Barbell Bench Press', primaryMuscle: 'chest', pattern: 'horizontal_push', equipment: 'barbell', compound: true },
  { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', primaryMuscle: 'chest', pattern: 'horizontal_push', equipment: 'dumbbell', compound: true },
  { id: 'push-up', name: 'Push-Up', primaryMuscle: 'chest', pattern: 'horizontal_push', equipment: 'bodyweight', compound: true },
  { id: 'cable-chest-press', name: 'Cable Chest Press', primaryMuscle: 'chest', pattern: 'horizontal_push', equipment: 'cable', compound: true },
  { id: 'machine-chest-press', name: 'Machine Chest Press', primaryMuscle: 'chest', pattern: 'horizontal_push', equipment: 'machine', compound: true },

  // Vertical push (overhead pressing — what a "bad shoulder" excludes)
  { id: 'barbell-overhead-press', name: 'Barbell Overhead Press', primaryMuscle: 'shoulders', pattern: 'vertical_push', equipment: 'barbell', compound: true },
  { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', primaryMuscle: 'shoulders', pattern: 'vertical_push', equipment: 'dumbbell', compound: true },
  { id: 'pike-push-up', name: 'Pike Push-Up', primaryMuscle: 'shoulders', pattern: 'vertical_push', equipment: 'bodyweight', compound: true },
  { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', primaryMuscle: 'shoulders', pattern: 'vertical_push', equipment: 'machine', compound: true },

  // Horizontal pull
  { id: 'barbell-row', name: 'Barbell Row', primaryMuscle: 'back', pattern: 'horizontal_pull', equipment: 'barbell', compound: true },
  { id: 'dumbbell-row', name: 'Dumbbell Row', primaryMuscle: 'back', pattern: 'horizontal_pull', equipment: 'dumbbell', compound: true },
  { id: 'inverted-row', name: 'Inverted Row', primaryMuscle: 'back', pattern: 'horizontal_pull', equipment: 'bodyweight', compound: true },
  { id: 'cable-row', name: 'Seated Cable Row', primaryMuscle: 'back', pattern: 'horizontal_pull', equipment: 'cable', compound: true },
  { id: 'machine-row', name: 'Machine Row', primaryMuscle: 'back', pattern: 'horizontal_pull', equipment: 'machine', compound: true },

  // Vertical pull
  { id: 'pull-up', name: 'Pull-Up', primaryMuscle: 'back', pattern: 'vertical_pull', equipment: 'bodyweight', compound: true },
  { id: 'lat-pulldown', name: 'Lat Pulldown', primaryMuscle: 'back', pattern: 'vertical_pull', equipment: 'cable', compound: true },
  { id: 'machine-pulldown', name: 'Machine Pulldown', primaryMuscle: 'back', pattern: 'vertical_pull', equipment: 'machine', compound: true },
  { id: 'dumbbell-pullover', name: 'Dumbbell Pullover', primaryMuscle: 'back', pattern: 'vertical_pull', equipment: 'dumbbell', compound: true },

  // Isolation / accessory
  { id: 'dumbbell-curl', name: 'Dumbbell Bicep Curl', primaryMuscle: 'biceps', pattern: 'isolation', equipment: 'dumbbell', compound: false },
  { id: 'band-curl', name: 'Band Bicep Curl', primaryMuscle: 'biceps', pattern: 'isolation', equipment: 'bands', compound: false },
  { id: 'cable-triceps-pushdown', name: 'Cable Triceps Pushdown', primaryMuscle: 'triceps', pattern: 'isolation', equipment: 'cable', compound: false },
  { id: 'bodyweight-triceps-dip', name: 'Bodyweight Triceps Dip', primaryMuscle: 'triceps', pattern: 'isolation', equipment: 'bodyweight', compound: false },
  { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', primaryMuscle: 'shoulders', pattern: 'isolation', equipment: 'dumbbell', compound: false },
  { id: 'machine-leg-extension', name: 'Machine Leg Extension', primaryMuscle: 'quads', pattern: 'isolation', equipment: 'machine', compound: false },
  { id: 'machine-leg-curl', name: 'Machine Leg Curl', primaryMuscle: 'hamstrings', pattern: 'isolation', equipment: 'machine', compound: false },
  { id: 'dumbbell-calf-raise', name: 'Dumbbell Calf Raise', primaryMuscle: 'calves', pattern: 'isolation', equipment: 'dumbbell', compound: false },
  { id: 'bodyweight-calf-raise', name: 'Bodyweight Calf Raise', primaryMuscle: 'calves', pattern: 'isolation', equipment: 'bodyweight', compound: false },
  { id: 'bodyweight-plank', name: 'Plank', primaryMuscle: 'core', pattern: 'core', equipment: 'bodyweight', compound: false },
  { id: 'cable-woodchop', name: 'Cable Woodchop', primaryMuscle: 'core', pattern: 'core', equipment: 'cable', compound: false },
  { id: 'kettlebell-carry', name: 'Kettlebell Farmer Carry', primaryMuscle: 'core', pattern: 'carry', equipment: 'kettlebell', compound: true },
]

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id)
}
