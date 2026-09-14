/**
 * The one place a token is spent, and every way that can fail.
 *
 * Routing is Vercel AI Gateway through the `ai` package's plain
 * `provider/model` strings. Authentication is Vercel OIDC: `VERCEL_OIDC_TOKEN`
 * is present in deployments and in `.env.local` locally, and no API key, no
 * provider SDK and no secret of our own is involved at any point.
 *
 * The model was chosen against the live catalogue rather than from memory
 * (`curl https://ai-gateway.vercel.sh/v1/models`, checked 2026-09-14):
 * `anthropic/claude-haiku-4.5` at $1/M in and $5/M out over a 200k window. The
 * brief is a few hundred tokens in and under a hundred out, so a day's brief
 * costs a fraction of a cent, and Haiku is good at exactly the register this
 * needs — short, concrete, unembellished prose.
 *
 * A $5/month cap is set on the project. That makes "budget exhausted" a state
 * this code will genuinely reach, not a theoretical branch, and the same is
 * true of rate limiting and of a team with no credit on file. All three resolve
 * to the same user-visible outcome — the deterministic observations, shown
 * plainly, with a line saying why the extra sentence is missing — because a
 * brief whose rules fired is still a useful brief.
 */
import { generateText } from 'ai'
import type { SynthesisFailure } from './types'

/** Primary. Verified present in the live catalogue before being hardcoded. */
export const PRIMARY_MODEL = 'anthropic/claude-haiku-4.5'

/**
 * Fallback, tried by the gateway when every provider for the primary fails.
 * Roughly a quarter of the price, and more than good enough for three
 * sentences whose facts are all supplied.
 */
export const FALLBACK_MODEL = 'google/gemini-3.1-flash-lite'

/** The brief is three sentences. This is a ceiling, not a target. */
export const MAX_OUTPUT_TOKENS = 200

export type SynthesisOutcome =
  | { ok: true; text: string; model: string }
  | { ok: false; failure: SynthesisFailure; detail: string }

/** The shape of a thrown gateway/provider error, as far as we care about it. */
interface ErrorLike {
  statusCode?: unknown
  responseBody?: unknown
  message?: unknown
  type?: unknown
  cause?: unknown
}

function asErrorLike(value: unknown): ErrorLike | null {
  return typeof value === 'object' && value !== null ? (value as ErrorLike) : null
}

/**
 * Walk an error and everything it wraps, collecting the text and status codes.
 *
 * The gateway wraps the provider's `APICallError` in its own error, and the
 * distinguishing detail — "customer_verification_required", a 429, a budget
 * message — can be on either. `ai` does not export the gateway error classes
 * (they live in `@ai-sdk/gateway`, which is not installed and does not need to
 * be), so this reads the chain structurally instead of by `instanceof`.
 */
function flatten(error: unknown): { text: string; statuses: number[] } {
  const parts: string[] = []
  const statuses: number[] = []
  let cursor: unknown = error
  for (let depth = 0; depth < 5 && cursor; depth += 1) {
    const node = asErrorLike(cursor)
    if (!node) break
    if (typeof node.message === 'string') parts.push(node.message)
    if (typeof node.responseBody === 'string') parts.push(node.responseBody)
    if (typeof node.type === 'string') parts.push(node.type)
    if (typeof node.statusCode === 'number') statuses.push(node.statusCode)
    cursor = node.cause
  }
  return { text: parts.join(' | '), statuses }
}

/**
 * Which real-world state this failure is.
 *
 * Order matters: a budget message can arrive with a 429, and "you are out of
 * money" is a different thing to tell someone than "try again in a minute".
 */
export function classifyFailure(error: unknown): { failure: SynthesisFailure; detail: string } {
  const { text, statuses } = flatten(error)
  const lower = text.toLowerCase()

  if (lower.includes('customer_verification_required') || lower.includes('credit card')) {
    return {
      failure: 'no-credit',
      detail: 'AI Gateway has no payment method on file for this project, so it services no requests.',
    }
  }
  if (
    lower.includes('budget') ||
    lower.includes('insufficient') ||
    lower.includes('quota') ||
    statuses.includes(402)
  ) {
    return {
      failure: 'budget-exhausted',
      detail: 'The monthly AI budget for this project is spent.',
    }
  }
  if (statuses.includes(429) || lower.includes('rate limit') || lower.includes('rate_limit')) {
    return { failure: 'rate-limited', detail: 'The model provider is rate limiting this project.' }
  }
  return {
    failure: 'unavailable',
    detail: text.slice(0, 200) || 'The model could not be reached.',
  }
}

/**
 * Ask the model for the cross-domain sentence.
 *
 * Never throws. Every failure is a value, because the caller's correct response
 * to all of them is identical — show the rules' output and say why the extra
 * sentence is missing — and an exception crossing this boundary would turn a
 * missing paragraph into a 500 on someone's Today page.
 */
export async function synthesise(args: {
  system: string
  prompt: string
  signal?: AbortSignal
}): Promise<SynthesisOutcome> {
  try {
    const result = await generateText({
      model: PRIMARY_MODEL,
      system: args.system,
      prompt: args.prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // Low but not zero: the facts are fixed, so there is nothing to explore,
      // and a deterministic-ish note reads the same two days running when
      // nothing has changed, which is itself informative.
      temperature: 0.3,
      maxRetries: 1,
      abortSignal: args.signal,
      providerOptions: { gateway: { models: [FALLBACK_MODEL] } },
    })

    const model = result.response?.modelId ?? PRIMARY_MODEL
    return { ok: true, text: result.text, model }
  } catch (error) {
    return { ok: false, ...classifyFailure(error) }
  }
}
