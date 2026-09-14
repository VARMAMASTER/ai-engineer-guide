'use client'

import { useCallback, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Panel from '@/components/ui/Panel'
import Tag from '@/components/ui/Tag'
import { useToast } from '@/components/ui/Toast'
import {
  hasSubscription,
  permissionState,
  pushSupport,
  subscribe,
  unsubscribe,
  type PushSupport,
} from '@/lib/push/client'

/**
 * Turning notifications on, and the one permission prompt this app ever fires.
 *
 * THE RULE THIS COMPONENT EXISTS TO KEEP. `Notification.requestPermission()` is
 * never called on mount, from an effect, or as a side effect of arriving on
 * this page. It is called from `subscribe()`, which is called from a button
 * press, and from nowhere else. An unprompted permission dialog is the
 * most-denied dialog on the web, and a denial is close to irreversible: the
 * browser stops asking, and recovery means the user finding the padlock in the
 * address bar. So the sentence explaining exactly what will arrive is rendered
 * BEFORE the button, and the browser's own dialog is the second question the
 * person is asked, never the first.
 *
 * WHAT IS READ ON MOUNT is only what the browser will answer without asking
 * anybody: `Notification.permission` (a value, not a prompt) and whether this
 * device already holds a subscription. Both are needed to know which of the
 * five states below to draw.
 *
 * THE FIVE STATES, each of which needs a different sentence:
 *   * not configured — this deployment has no VAPID key. Nothing the user can do.
 *   * unsupported    — the browser has no Push API at all.
 *   * iOS, not installed — Safari only offers push to a PWA on the Home Screen.
 *     Silently failing here is the worst option: the button would appear to do
 *     nothing on the one platform where the fix is a single menu item.
 *   * denied         — the browser is blocking it, and we say so plainly along
 *     with where to undo it, because "nothing happened" is what it looks like
 *     otherwise.
 *   * ready / on     — the ordinary path.
 */
export default function PushSetup() {
  const toast = useToast()

  // `null` until the effect has run: every check below reads a browser API, and
  // a Client Component is still rendered on the server for the initial HTML.
  const [support, setSupport] = useState<PushSupport | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | 'unavailable' | null>(null)
  const [on, setOn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  /**
   * Bumped to re-run the read below. The same shape `useOps` uses, and for the
   * same reason: the three browser reads live in ONE place — an effect — rather
   * than in a callback the handlers also call, so `setState` is only ever
   * reached from the continuation of an awaited promise. A `setState` run
   * synchronously from an effect body is a cascading render, which is what
   * `react-hooks/set-state-in-effect` refuses, and this project lints at zero.
   */
  const [attempt, setAttempt] = useState(0)
  const refresh = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    let live = true

    const run = async () => {
      const subscribed = await hasSubscription()
      if (!live) return
      setSupport(pushSupport())
      setPermission(permissionState())
      setOn(subscribed)
    }

    void run()
    return () => {
      live = false
    }
  }, [attempt])

  async function turnOn() {
    setBusy(true)
    try {
      const result = await subscribe()
      if (result.kind === 'subscribed') {
        toast.show({ tone: 'success', message: 'Notifications are on for this device.' })
      } else if (result.kind === 'denied') {
        toast.show({ tone: 'error', message: 'Your browser is blocking notifications.' })
      } else if (result.kind === 'dismissed') {
        toast.show({ message: 'No answer given, so nothing changed. You can ask again.' })
      } else {
        toast.show({ tone: 'error', message: result.message })
      }
    } finally {
      refresh()
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    try {
      const result = await unsubscribe()
      if (result.ok) toast.show({ message: 'Notifications are off for this device.' })
      else toast.show({ tone: 'error', message: result.message ?? 'Something went wrong.' })
    } finally {
      refresh()
      setBusy(false)
    }
  }

  async function sendTest() {
    setBusy(true)
    try {
      const response = await fetch('/api/push/test', { method: 'POST' })
      const body = await response.json().catch(() => null)
      if (response.ok) {
        toast.show({ tone: 'success', message: 'Sent. It should appear in a moment.' })
      } else {
        toast.show({ tone: 'error', message: body?.error ?? `The server refused (${response.status}).` })
      }
    } catch {
      toast.show({ tone: 'error', message: 'Could not reach the server.' })
    } finally {
      setBusy(false)
    }
  }

  // Nothing is asserted about the browser until the effect has run, so the
  // server HTML and the first client render agree.
  const state = support === null || permission === null || on === null ? 'pending' : support.kind

  return (
    <Panel className="flex min-w-0 flex-col gap-3 p-4" data-testid="ops-push-setup">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">Notifications on this device</h2>
        {on ? <Tag variant="outline">On</Tag> : null}
      </div>

      {/*
        Said BEFORE the button, not after the dialog. This is the sentence that
        makes the browser's prompt answerable: a person cannot decide whether
        they want notifications from an app that has not told them what it will
        send or how often.
      */}
      <p className="text-sm text-[var(--text-muted)]">
        You will get one notification per reminder — the task&apos;s title and how long until it is
        due — and nothing else. No news, no marketing, no digests. Each device you turn this on for
        is registered separately, and turning it off here removes this one.
      </p>

      {state === 'pending' ? (
        <p className="text-sm text-[var(--text-faint)]">Checking this browser…</p>
      ) : null}

      {state === 'unconfigured' ? (
        <p className="text-sm text-[var(--warning)]">
          This deployment has no push key configured, so notifications cannot be turned on here. The
          rules below are still stored and still evaluated.
        </p>
      ) : null}

      {state === 'unsupported' ? (
        <p className="text-sm text-[var(--warning)]">
          This browser does not support web push. The rules below still work — they just have no way
          to reach you while the app is closed.
        </p>
      ) : null}

      {state === 'ios-needs-install' ? (
        <p className="text-sm text-[var(--warning)]">
          On iPhone and iPad, notifications only work once Unyfide is installed. Tap Share, then
          <span className="font-medium"> Add to Home Screen</span>, open it from there, and this
          button will appear.
        </p>
      ) : null}

      {state === 'ready' && permission === 'denied' ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm text-[var(--warning)]">
            Your browser is blocking notifications for this site, so nothing can be delivered. This
            is a browser setting, not an app one — we cannot ask again until it changes.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            To undo it: open the padlock or settings icon next to the address bar, find
            Notifications, and set it back to Ask or Allow. Then reload this page.
          </p>
        </div>
      ) : null}

      {state === 'ready' && permission !== 'denied' ? (
        <div className="flex flex-wrap items-center gap-2">
          {on ? (
            <>
              <Button variant="accent" loading={busy} onClick={() => void sendTest()} data-testid="ops-push-test">
                Send a test notification
              </Button>
              <Button variant="quiet" loading={busy} onClick={() => void turnOff()} data-testid="ops-push-off">
                Turn off on this device
              </Button>
            </>
          ) : (
            <Button variant="accent" loading={busy} onClick={() => void turnOn()} data-testid="ops-push-on">
              Turn on notifications
            </Button>
          )}
        </div>
      ) : null}

      {/*
        The cadence, stated rather than implied. Delivery is a Vercel Cron Job,
        and this project's plan allows one run a day with up to an hour of slop
        (see `lib/push/schedule.ts`). A reminder set for 18:00 is therefore
        delivered on the next run, not at 18:00 — and a user who is told that
        can decide whether to rely on it, where a user who is not told will
        simply conclude the feature is broken.
      */}
      {on ? (
        <Panel tier="solid" className="p-3">
          <p className="text-sm text-[var(--text-muted)]">
            Reminders are delivered by a scheduled job that runs once a day on this deployment&apos;s
            plan, so a reminder arrives on the next run rather than to the minute. Each one is sent
            exactly once, whenever it does arrive.
          </p>
        </Panel>
      ) : null}
    </Panel>
  )
}
