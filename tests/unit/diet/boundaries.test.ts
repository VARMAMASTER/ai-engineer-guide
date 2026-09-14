import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Diet is a bounded context (spec 4.2) and its logic is pure (no I/O until a
 * later stage). ESLint `no-restricted-imports` zones will enforce the first of
 * those; until then — and as a check the zones cannot make, since they say
 * nothing about `fetch` — these assertions hold the line.
 */
const DIR = join(process.cwd(), 'lib', 'diet')
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.ts'))
const SOURCES = FILES.map((f) => ({ file: f, text: readFileSync(join(DIR, f), 'utf8') }))

function importsOf(text: string): string[] {
  return [...text.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])
}

describe('diet module boundaries', () => {
  it('has the modules the domain was split into', () => {
    expect(FILES.sort()).toEqual([
      'aggregate.ts',
      // The persistence CONTRACT — row shapes and codecs — but not the
      // queries. It is in here so that `entryToRow` and friends are held to
      // the same purity and no-I/O bar as the arithmetic; the Supabase calls
      // that use them live in `app/diet/_data/`, outside this module.
      'data.ts',
      'energy.ts',
      'forecast.ts',
      'index.ts',
      // The weekly meal plan: the template logic, and the owner's own plan as
      // data. Split so the reference values can be read and corrected without
      // scrolling past the arithmetic that consumes them.
      'plan-seed.ts',
      'plan.ts',
      'summary.ts',
      'time.ts',
      'trend.ts',
      'types.ts',
      'window.ts',
    ])
  })

  it('imports nothing from another mini-app', () => {
    for (const { file, text } of SOURCES) {
      for (const spec of importsOf(text)) {
        expect(
          /(^|\/)(train|ops|learn)(\/|$)/.test(spec),
          `${file} imports across an app boundary: ${spec}`,
        ).toBe(false)
      }
    }
  })

  it('imports only zod, lib/summary, generic date utilities and its own files', () => {
    const allowed = new Set(['zod', '@/lib/summary', '@/lib/date'])
    for (const { file, text } of SOURCES) {
      for (const spec of importsOf(text)) {
        const ok = allowed.has(spec) || spec.startsWith('./')
        expect(ok, `${file} imports an unexpected module: ${spec}`).toBe(true)
      }
    }
  })

  it('performs no I/O', () => {
    for (const { file, text } of SOURCES) {
      for (const forbidden of [
        'fetch(',
        'localStorage',
        'sessionStorage',
        'indexedDB',
        'supabase',
        'XMLHttpRequest',
        'node:fs',
      ]) {
        expect(text.includes(forbidden), `${file} performs I/O via ${forbidden}`).toBe(false)
      }
    }
  })

  it('never reads the wall clock, so every function is deterministic', () => {
    for (const { file, text } of SOURCES) {
      expect(text.includes('Date.now()'), `${file} reads the clock`).toBe(false)
      expect(/new Date\(\)/.test(text), `${file} reads the clock`).toBe(false)
    }
  })
})
