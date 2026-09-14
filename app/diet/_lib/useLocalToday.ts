'use client'

import { useSyncExternalStore } from 'react'
import { todayIso } from '@/lib/date'

/**
 * Today, as the USER's calendar has it.
 *
 * Diet is wall-clock all the way down: an 18:30 meal is outside a 12:00-18:00
 * window regardless of where the user was standing, and a UTC day boundary
 * would split an evening in half. The server rendering this app is not in the
 * user's timezone — on Vercel it is in UTC — so "today" cannot be decided
 * there, and for several hours a day it would be the wrong date.
 *
 * `useSyncExternalStore` rather than `useState` + an effect, and the difference
 * is not stylistic. The server snapshot is the server's date, so the HTML and
 * the first client render agree and there is no hydration mismatch; React then
 * reads the client snapshot — the browser's own clock — as part of finishing
 * hydration rather than as a second render triggered from an effect. On the
 * overwhelming majority of loads the two dates are the same string and nothing
 * re-renders at all.
 *
 * The store never notifies, because a date does not change while you are
 * looking at it in any way this app needs to react to mid-session; a navigation
 * or a reload picks up the new day.
 */
const neverChanges = () => () => {}

export function useLocalToday(serverToday: string): string {
  return useSyncExternalStore(neverChanges, todayIso, () => serverToday)
}

/** The current local wall-clock time as `HH:MM`, for defaulting a meal's time. */
export function nowLocalTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
