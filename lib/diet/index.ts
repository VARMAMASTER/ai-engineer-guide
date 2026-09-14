/**
 * Diet domain logic — pure functions, no I/O, no UI.
 *
 * Nothing in `lib/diet` fetches, queries or reads storage. Every function takes
 * data in and returns data out, which is what lets the arithmetic people will
 * make decisions about their bodies from be checked against hand-computed
 * values in `tests/unit/diet`. Persistence arrives later and must adapt to this
 * shape rather than the other way round.
 *
 * Boundaries (spec 4.2): this module imports `lib/summary` and generic date
 * utilities, and nothing from `lib/train`, `lib/ops` or the learning modules.
 */
export * from './types'
export * from './time'
export * from './trend'
export * from './aggregate'
export * from './energy'
export * from './forecast'
export * from './window'
export * from './summary'
