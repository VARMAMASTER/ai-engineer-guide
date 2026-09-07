import { clean, decodeEntities, tag, textTag, timestamp } from './xml'
import type { FeedItem } from './types'

/**
 * The two keyless RSS/Atom sources that carry a real per-article image.
 *
 * Both are parsed with the same regex approach as `parseArxiv` — see the note
 * at the top of `xml.ts` for why there is no XML library in this directory.
 * The interesting difference between them is where the image lives:
 *
 *   Ars Technica  a dedicated Media RSS tag. `<media:content url="...">` is the
 *                 wide 1152x648 hero and `<media:thumbnail url="...">` (nested
 *                 inside it) is a 500x500 crop, so the wide one is preferred.
 *   The Verge     no image tag at all. The only image is a raw `<img src="...">`
 *                 buried in the HTML blob inside the `<content>` CDATA, and its
 *                 query string is entity-escaped (`&#038;` for every `&`), so an
 *                 undecoded src is a 404 through the image optimiser.
 */

export const ARS_URL = 'https://arstechnica.com/ai/feed/'
export const VERGE_URL = 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'

/** Hard cap on the merged news feed. Ars gives 20 items, the Verge 10. */
export const MAX_NEWS_ITEMS = 30

const ITEM = /<item[\s>][\s\S]*?<\/item>/g
const ENTRY = /<entry[\s>][\s\S]*?<\/entry>/g

const MEDIA_CONTENT = /<media:content\b[^>]*?\burl="([^"]+)"/
const MEDIA_THUMBNAIL = /<media:thumbnail\b[^>]*?\burl="([^"]+)"/
// `src` is rarely the first attribute on these <img> tags (alt, data-caption and
// data-portal-copyright all come first), so the pattern has to scan the tag.
const IMG_SRC = /<img\b[^>]*?\ssrc="([^"]+)"/
const ALTERNATE_LINK = /<link\b[^>]*\brel="alternate"[^>]*\bhref="([^"]+)"/

/** An absolute https URL, or undefined — the UI renders a text card for undefined. */
function imageUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const url = decodeEntities(clean(raw))
  return url.startsWith('https://') ? url : undefined
}

function firstMatch(block: string, re: RegExp): string | undefined {
  const m = block.match(re)
  return m ? m[1] : undefined
}

/** Ars Technica's AI feed: RSS 2.0 with Media RSS image tags. */
export function parseArs(xml: string): FeedItem[] {
  const items: FeedItem[] = []
  for (const block of xml.match(ITEM) ?? []) {
    const title = textTag(block, 'title')
    const url = textTag(block, 'link')
    const when = timestamp(tag(block, 'pubDate'))
    if (!title || !url.startsWith('http') || !when) continue
    items.push({
      id: textTag(block, 'guid') || url,
      title,
      url,
      source: 'ars',
      date: when.date,
      published: when.iso,
      image: imageUrl(firstMatch(block, MEDIA_CONTENT) ?? firstMatch(block, MEDIA_THUMBNAIL)),
      meta: textTag(block, 'dc:creator') || undefined,
    })
  }
  return items
}

/** The Verge's AI feed: Atom, with the image only inside the content HTML. */
export function parseVerge(xml: string): FeedItem[] {
  const items: FeedItem[] = []
  for (const block of xml.match(ENTRY) ?? []) {
    const title = textTag(block, 'title')
    const href = firstMatch(block, ALTERNATE_LINK)
    const url = href ? decodeEntities(clean(href)) : ''
    const when = timestamp(tag(block, 'published') || tag(block, 'updated'))
    if (!title || !url.startsWith('http') || !when) continue
    // The image can be in either blob; `<content>` is the full article body and
    // carries the lead <figure>, `<summary>` is the fallback for entries that
    // ship only a teaser.
    const body = `${tag(block, 'content')}\n${tag(block, 'summary')}`
    items.push({
      id: textTag(block, 'id') || url,
      title,
      url,
      source: 'verge',
      date: when.date,
      published: when.iso,
      image: imageUrl(firstMatch(body, IMG_SRC)),
      meta: textTag(block, 'name') || undefined,
    })
  }
  return items
}

/**
 * Merge parsed source lists into the news feed: dedupe by URL (a story can be
 * syndicated to both), sort newest first, cap at {@link MAX_NEWS_ITEMS}.
 */
export function mergeNews(lists: FeedItem[][]): FeedItem[] {
  const byUrl = new Map<string, FeedItem>()
  for (const list of lists) {
    for (const item of list) {
      if (!byUrl.has(item.url)) byUrl.set(item.url, item)
    }
  }
  return [...byUrl.values()]
    .sort((a, b) => (b.published ?? b.date).localeCompare(a.published ?? a.date))
    .slice(0, MAX_NEWS_ITEMS)
}
