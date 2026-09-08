'use client'

import { useEffect } from 'react'

/** Same shape the worker's `message` handler accepts. */
const WARM_MESSAGE = 'aeg:warm'

/**
 * Registers `/sw.js`.
 *
 * Renders nothing and does all its work in an effect, so it is inert during
 * SSR and cannot interfere with the blocking theme script in `<head>` — that
 * script has already run and stamped `data-theme` long before React hydrates,
 * which is why an offline launch off the cached HTML paints the right theme
 * with no flash.
 *
 * Registration waits for `load`: a worker install fetches the start page, the
 * offline page and the icon set, and none of that should compete with the
 * first paint.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      // `next dev` and `next start` share localhost:3000. Without this, a
      // worker left behind by a production build keeps serving that build's
      // hashed chunks into the dev server, which looks like a broken app.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) void registration.unregister()
        })
        .catch(() => undefined)
      return
    }

    let cancelled = false

    async function register() {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        const registration = await navigator.serviceWorker.ready
        if (cancelled) return

        // Everything this page loaded was fetched before the worker took
        // control, so the worker never saw it. Hand over the URLs it should
        // hold on to; without this the first visit caches HTML but no JS, and
        // the next offline launch renders unhydrated.
        const worker = registration.active ?? navigator.serviceWorker.controller
        if (!worker) return
        const urls = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => name.includes('/_next/static/'))
        if (urls.length > 0) worker.postMessage({ type: WARM_MESSAGE, urls })
      } catch {
        // An unavailable worker is a degraded experience, never a broken page.
      }
    }

    function start() {
      void register()
    }

    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })

    return () => {
      cancelled = true
      window.removeEventListener('load', start)
    }
  }, [])

  return null
}
