import { addDays } from '@/lib/date'
import type { AppStatus, AppSummary, Trend } from '@/lib/summary'
import type { AppTimeline } from '@/lib/agent/types'

/**
 * Fixture summaries, which is the whole point of the seam.
 *
 * Spec 4.2: "feed it fixture summaries from four apps and assert the brief it
 * writes." Nothing in this directory imports a mini-app, touches a database or
 * reads a clock — if a test here needs one of those, the agent has grown a
 * dependency it is not allowed to have and the test is the alarm.
 */

export const TODAY = '2026-09-14'

export function daysEndingToday(count: number, today = TODAY): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)))
}

export function summary(args: {
  appId: string
  date: string
  status: AppStatus
  headline?: string
  trend?: Trend
  trendValue?: string
}): AppSummary {
  const title = args.appId.charAt(0).toUpperCase() + args.appId.slice(1)
  return {
    appId: args.appId,
    title,
    href: `/${args.appId}`,
    status: args.status,
    headline: args.headline ?? `${title} is ${args.status}.`,
    metrics: args.trend
      ? [{ label: 'Trend', value: args.trendValue ?? '79.4 kg', trend: args.trend }]
      : [],
    date: args.date,
  }
}

/**
 * A timeline from a status-per-day string, oldest day first.
 *
 * `o` ok, `b` behind, `a` attention, `i` idle. Reading a rule's input as
 * "iiioooaaa" makes the fourteen-day shape visible in one line, which matters
 * when the thing under test is a run length.
 */
const CODES: Record<string, AppStatus> = { o: 'ok', b: 'behind', a: 'attention', i: 'idle' }

export function timelineOf(
  appId: string,
  codes: string,
  options: { trend?: string; today?: string } = {},
): AppTimeline {
  const today = options.today ?? TODAY
  const dates = daysEndingToday(codes.length, today)
  const trendCodes = options.trend
  const days = [...codes].map((code, i) =>
    summary({
      appId,
      date: dates[i],
      status: CODES[code],
      ...(trendCodes
        ? { trend: ({ f: 'flat', d: 'down', u: 'up', '-': 'unknown' } as const)[trendCodes[i]] }
        : {}),
    }),
  )
  const title = appId.charAt(0).toUpperCase() + appId.slice(1)
  return { appId, title, href: `/${appId}`, days }
}
