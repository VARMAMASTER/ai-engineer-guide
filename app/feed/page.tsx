import type { Metadata } from 'next'
import FeedBoard from '@/components/FeedBoard'

export const metadata: Metadata = {
  title: 'AI Feed | AI Engineer Practice Guide',
}

/**
 * The heading and the standing copy are server-rendered and static — the feed
 * itself loads on the client. A publisher being slow or down changes what is
 * on the page, never whether the page arrives.
 */
export default function FeedPage() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h1>AI Feed</h1>
        <p className="text-sm text-[var(--text-muted)]">
          What shipped this week, from four sources at once. Skim it; the curated Reading list is
          the one that is actually scheduled into the plan.
        </p>
      </div>

      <FeedBoard />
    </div>
  )
}
