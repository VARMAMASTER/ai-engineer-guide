import type { Goal, Task } from '@/lib/ops/types'

let counter = 0

/** A minimally-valid Task, with sensible defaults, for tests to override via spread. */
export function makeTask(overrides: Partial<Task> = {}): Task {
  counter += 1
  return {
    id: `task-${counter}`,
    title: 'Untitled task',
    priority: 'medium',
    tags: [],
    completed: false,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

/** A minimally-valid Goal, with sensible defaults, for tests to override via spread. */
export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  counter += 1
  return {
    id: `goal-${counter}`,
    title: 'Untitled goal',
    target: 10,
    unit: 'things',
    current: 0,
    startDate: '2026-01-01',
    deadline: '2026-12-31',
    ...overrides,
  }
}
