import TodayBrief from '@/components/agent/TodayBrief'
import TodayTasks from '@/components/TodayTasks'

export const metadata = { title: 'Today | Unyfide' }

/**
 * Today: the brief first, then the day's plan.
 *
 * The order is the argument. Spec 5.4 gives the agent no tab of its own on the
 * grounds that an agent behind a tab is a chatbot you must remember to visit,
 * and an agent on Today is a colleague who tells you something — which only
 * holds if it is the thing you see, rather than a panel below three screens of
 * checkboxes.
 *
 * `TodayTasks` keeps the `h1`. There is exactly one visible `h1` per route in
 * this app and `tests/e2e/routes.spec.ts` asserts it, so the brief deliberately
 * carries no heading of its own — it is a labelled region instead, which also
 * keeps the heading order clean for the axe sweep. Signed out it renders
 * nothing at all, so the learning half of the app is unchanged by its presence.
 */
export default function TodayPage() {
  return (
    <div className="flex flex-col gap-6">
      <TodayBrief />
      <TodayTasks />
    </div>
  )
}
