import { addDays } from '@/lib/date'
import type { DietTargets, EatingWindow, LogEntry, UserProfile, WeightReading } from '@/lib/diet'

let counter = 0

/** A logged meal. `at` is the meal's local timestamp, `YYYY-MM-DDTHH:MM`. */
export function entry(
  at: string,
  kcal: number,
  proteinG = 0,
  extra: Partial<LogEntry> = {},
): LogEntry {
  counter += 1
  return {
    id: `e${counter}`,
    name: 'meal',
    servings: 1,
    kcal,
    proteinG,
    at,
    date: at.slice(0, 10),
    ...extra,
  }
}

export function weigh(date: string, kg: number): WeightReading {
  return { date, kg }
}

/** `count` consecutive dates starting at `from`. */
export function dates(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i))
}

/** One identical meal a day for `count` days. */
export function dailyEntries(
  from: string,
  count: number,
  kcal: number,
  proteinG = 0,
  time = '13:00',
): LogEntry[] {
  return dates(from, count).map((d) => entry(`${d}T${time}`, kcal, proteinG))
}

/** A weight reading every day, from a function of the day index. */
export function dailyWeights(
  from: string,
  count: number,
  kgAt: (index: number) => number,
): WeightReading[] {
  return dates(from, count).map((d, i) => weigh(d, kgAt(i)))
}

export const PROFILE: UserProfile = {
  sex: 'male',
  ageYears: 30,
  heightCm: 175,
  weightKg: 80,
  activity: 'moderate',
  goal: 'lose',
}

export const TARGETS: DietTargets = { kcal: 2000, proteinG: 140, kcalBand: 150 }

export const WINDOW: EatingWindow = { start: '12:00', end: '18:00', enabled: true }
