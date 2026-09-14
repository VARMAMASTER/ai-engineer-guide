import { createClient } from '@/lib/db/server'
import { emptyTrainState, fetchTrainState, type TrainState } from '@/lib/train/data'

export interface LoadedTrainState {
  state: TrainState
  /** Non-null when the read failed. The page says so instead of 500-ing. */
  error: string | null
}

/**
 * Read this user's Train state on the server, for the first paint.
 *
 * Server-side rather than from a `useEffect` so the session that is due, the
 * sets already logged and every number on the progress page are in the first
 * HTML response — no spinner, and no blank screen on a phone that has dropped
 * to one bar in a basement gym. The client components take it as their initial
 * state and own it from there.
 *
 * A failed read degrades to an empty state plus a message. The alternative is a
 * 500 in the middle of a workout, which is the one moment this app has to keep
 * working.
 */
export async function loadTrainState(): Promise<LoadedTrainState> {
  try {
    const db = await createClient()
    return { state: await fetchTrainState(db), error: null }
  } catch (cause) {
    return {
      state: emptyTrainState(),
      error: cause instanceof Error ? cause.message : 'Could not read your training data.',
    }
  }
}
