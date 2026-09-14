/**
 * The check that makes "never let the model invent a number" a guarantee.
 *
 * The prompt asks the model not to. This rejects it when it does anyway. On a
 * health-adjacent surface a fabricated figure is not a stylistic lapse — it is
 * a wrong number in a confident voice, which is precisely the failure mode the
 * rules-first split exists to rule out — so a synthesis that states a figure the
 * rules did not produce is dropped entirely and the brief falls back to the
 * deterministic observations.
 *
 * Dropping rather than repairing is deliberate. A note with one bad number
 * quietly edited out still had a model reasoning from a number that was never
 * true, and there is no way from here to tell which of the remaining sentences
 * that number was holding up.
 */
import { figuresIn, normaliseFigure } from './prompt'

/** Longest synthesis we will show. The prompt asks for 70 words. */
export const MAX_SYNTHESIS_CHARS = 700

export type VerificationResult =
  | { ok: true; text: string }
  | { ok: false; problem: 'empty' | 'too-long' | 'invented-figure' | 'forbidden-claim'; detail: string }

/**
 * Words that turn an observation into a diagnosis.
 *
 * Deliberately narrow. This is a backstop against the single failure spec 5.1.2
 * names — reporting noise as causation — not a general-purpose content filter,
 * and a filter wide enough to catch every phrasing would reject honest prose
 * daily. It catches the blunt forms; the prompt handles the rest.
 */
const CAUSAL_CLAIMS = [
  /\bbecause you\b/i,
  /\bcaus(?:e|es|ed|ing)\b/i,
  /\bleads? to\b/i,
  /\bis why you\b/i,
  /\bproves?\b/i,
  /\bdiagnos/i,
]

/**
 * Advice the agent is structurally not allowed to give.
 *
 * The target is narrow and specific: anything that suggests the 180-day plan
 * should move. Verbs are matched as whole words rather than as stems, because
 * a stem match on "mov" turns the perfectly honest "your weight has not moved,
 * and the plan is on track" into a rejection.
 */
const PLAN_NOUNS = '(?:study|studies|plan|learn|dsa)'
const FORBIDDEN_ADVICE = [
  new RegExp(`\\b(?:reschedul|re-schedul|postpon|defer)\\w*\\b[^.]{0,40}\\b${PLAN_NOUNS}\\b`, 'i'),
  new RegExp(`\\bpush\\w*\\s+back\\b[^.]{0,40}\\b${PLAN_NOUNS}\\b`, 'i'),
  new RegExp(
    `\\b(?:skip|skipping|drop|dropping|move|moving|shift|shifting)\\b[^.]{0,30}\\b${PLAN_NOUNS}\\b`,
    'i',
  ),
  new RegExp(`\\b${PLAN_NOUNS}\\b[^.]{0,40}\\b(?:reschedul|postpon|defer)\\w*\\b`, 'i'),
]

/**
 * Check a synthesis against the exact material the model was shown.
 *
 * `allowedFigures` comes from `buildPrompt`, derived from the prompt string
 * itself, so the permitted set cannot drift away from what was actually sent.
 */
export function verifySynthesis(text: string, allowedFigures: string[]): VerificationResult {
  const trimmed = text.trim()

  if (trimmed.length === 0) {
    return { ok: false, problem: 'empty', detail: 'The model returned nothing.' }
  }
  if (trimmed.length > MAX_SYNTHESIS_CHARS) {
    return {
      ok: false,
      problem: 'too-long',
      detail: `${trimmed.length} characters, over the ${MAX_SYNTHESIS_CHARS} cap.`,
    }
  }

  const allowed = new Set(allowedFigures.map(normaliseFigure))
  const invented = figuresIn(trimmed).filter((f) => !allowed.has(f))
  if (invented.length > 0) {
    return {
      ok: false,
      problem: 'invented-figure',
      detail: `Stated ${invented.join(', ')}, which the rules never produced.`,
    }
  }

  for (const pattern of [...CAUSAL_CLAIMS, ...FORBIDDEN_ADVICE]) {
    const match = pattern.exec(trimmed)
    if (match) {
      return {
        ok: false,
        problem: 'forbidden-claim',
        detail: `Contains "${match[0]}", which reads as a cause or an edit to the plan.`,
      }
    }
  }

  return { ok: true, text: trimmed }
}
