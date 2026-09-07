'use client'

import Image from 'next/image'
import { useState } from 'react'
import { relativeTime } from '@/lib/date'
import { SOURCE_LABEL } from '@/lib/feed/sources'
import type { FeedItem } from '@/lib/feed/types'

/**
 * One article card. The image is the point, so it leads at a fixed 16:9 and
 * the text sits under it.
 *
 * Two things this has to get right:
 *
 *   Layout shift. The image box is an aspect-ratio container with `fill`, so
 *   its height is known before a single byte of the image arrives. Nothing
 *   below it moves as the grid loads.
 *
 *   A dead CDN. Publisher images 404, expire, and get blocked. On `error` the
 *   card drops the image box entirely and renders as the text card it would
 *   have been if the feed had shipped no image — a torn card with a broken
 *   glyph or a bare grey rectangle is worse than no picture.
 */
export default function FeedCard({ item, priority }: { item: FeedItem; priority: boolean }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(item.image) && !imageFailed

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="panel card flex min-w-0 flex-col overflow-hidden"
    >
      {showImage ? (
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-[var(--track)]">
          <Image
            src={item.image!}
            alt=""
            fill
            // One column below 768px, two above it inside a max-w-5xl main
            // that already gives up 15.5rem to the rail — so ~46vw, never the
            // full desktop width, and never a desktop-width file on a phone.
            sizes="(min-width: 768px) 46vw, 100vw"
            className="object-cover"
            // The first row is above the fold on every viewport and is the LCP
            // element, so it loads eagerly; everything below it stays lazy.
            priority={priority}
            onError={() => setImageFailed(true)}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <span className="eyebrow text-[var(--accent)]">{SOURCE_LABEL[item.source]}</span>
        <h3 className="min-w-0">{item.title}</h3>
        {item.meta ? (
          <p className="min-w-0 truncate text-sm text-[var(--text-muted)]">{item.meta}</p>
        ) : null}
        <span className="readout mt-auto pt-1 text-[var(--text-muted)]">
          {relativeTime(item.published ?? item.date)}
        </span>
      </div>
    </a>
  )
}
