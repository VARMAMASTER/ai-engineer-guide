import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import DietSections from '../_components/DietSections'

/**
 * The frame for everything INSIDE Diet.
 *
 * A route group, so the URLs are still `/diet/log`, `/diet/weight` and so on —
 * `(inside)` adds no segment. The group exists only to draw a line the layout
 * can sit on: these four routes require a session (`lib/auth/routes.ts`) and
 * share the section strip, and `/diet` itself is public and does not, so it
 * lives outside the group and gets neither.
 *
 * `ToastProvider` is mounted here rather than in the root layout. Every write
 * on these four screens is optimistic and needs somewhere to say "that did not
 * save"; nothing in the rest of the app has asked for toasts yet, and putting
 * the provider in `app/layout.tsx` would mount two live regions on every
 * learning page to serve four routes.
 */
export default function DietInsideLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-w-0 flex-col">
        <DietSections />
        {children}
      </div>
    </ToastProvider>
  )
}
