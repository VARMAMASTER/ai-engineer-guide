import { SOURCE_REGION } from './sources'
import { clean, decodeEntities, tag, textTag, timestamp } from './xml'
import type { FeedItem } from './types'

/**
 * The four keyless RSS/Atom news sources — two global, two Indian.
 *
 * All four are parsed with the same regex approach as `parseArxiv` — see the
 * note at the top of `xml.ts` for why there is no XML library in this
 * directory. The interesting difference between them is where the image lives:
 *
 *   Ars Technica  a dedicated Media RSS tag. `<media:content url="...">` is the
 *                 wide 1152x648 hero and `<media:thumbnail url="...">` (nested
 *                 inside it) is a 500x500 crop, so the wide one is preferred.
 *   The Verge     no image tag at all. The only image is a raw `<img src="...">`
 *                 buried in the HTML blob inside the `<content>` CDATA, and its
 *                 query string is entity-escaped (`&#038;` for every `&`), so an
 *                 undecoded src is a 404 through the image optimiser.
 *   Indian Express  Media RSS like Ars, but `<media:thumbnail>` is a sibling of
 *                 `<media:content>` rather than nested inside it, and both
 *                 carry the same URL. Two image hosts are live in the same
 *                 feed — `images.indianexpress.com` for most items and a bare
 *                 `indianexpress.com/wp-content/...` for a handful — so both
 *                 are allowlisted in `next.config.ts`.
 *   MediaNama     no image tag and, for most items, no image at all: the feed
 *                 ships no featured image, so the only candidate is an inline
 *                 `<img>` inside `<content:encoded>`, which roughly a third of
 *                 items have. `image` is simply `undefined` for the rest and
 *                 the board renders them as text cards — the same path a dead
 *                 publisher CDN already takes.
 *
 * The Indian sources are what make this feed useful to an engineer working in
 * India: MediaNama is the distinctive one (RBI, SEBI, NPCI, AI and elections,
 * Indian tech policy), the Indian Express is the volume one.
 */

export const ARS_URL = 'https://arstechnica.com/ai/feed/'
export const VERGE_URL = 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'
export const MEDIANAMA_URL = 'https://www.medianama.com/tag/artificial-intelligence/feed/'
export const INDIAN_EXPRESS_URL =
  'https://indianexpress.com/section/technology/artificial-intelligence/feed/'

/** Hard cap on the merged news feed. */
export const MAX_NEWS_ITEMS = 40

/**
 * Per-publisher cap, applied newest-first before the overall cap.
 *
 * Without it the feed is whatever the loudest publisher is. Ars returns 20
 * items and the Indian Express returns *two hundred* — several a day, going
 * back months — so an unbounded newest-first merge would hand the Indian
 * Express nearly every slot and bury both MediaNama's India-specific policy
 * reporting and the global sources the page had before. Ten each keeps all
 * four mastheads on screen and keeps the region split roughly even.
 */
export const MAX_PER_SOURCE = 10

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

/**
 * The RSS 2.0 shape three of the four publishers share: one `<item>` per
 * story, `<pubDate>`, `<dc:creator>`, and an image that is either a Media RSS
 * tag or an `<img>` inside the HTML body. `findImage` is what differs.
 */
function parseRss(
  xml: string,
  source: 'ars' | 'medianama' | 'indianexpress',
  findImage: (block: string) => string | undefined,
): FeedItem[] {
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
      source,
      region: SOURCE_REGION[source],
      date: when.date,
      published: when.iso,
      image: imageUrl(findImage(block)),
      meta: textTag(block, 'dc:creator') || undefined,
    })
  }
  return items
}

/** The wide `<media:content>` hero, falling back to the square thumbnail. */
function mediaRssImage(block: string): string | undefined {
  return firstMatch(block, MEDIA_CONTENT) ?? firstMatch(block, MEDIA_THUMBNAIL)
}

/** Ars Technica's AI feed: RSS 2.0 with Media RSS image tags. */
export function parseArs(xml: string): FeedItem[] {
  return parseRss(xml, 'ars', mediaRssImage)
}

/**
 * The Indian Express AI section: RSS 2.0, Media RSS, ~200 items deep.
 *
 * Structurally this is Ars with a different masthead, so it reuses the same
 * reader. `MAX_PER_SOURCE` is what keeps its two hundred items from owning the
 * whole board, and `mergeNews` is what keeps its re-reports of OpenAI and
 * Anthropic stories from appearing twice next to the Ars or Verge original.
 */
export function parseIndianExpress(xml: string): FeedItem[] {
  return parseRss(xml, 'indianexpress', mediaRssImage)
}

/**
 * MediaNama's AI tag feed: RSS 2.0, no Media RSS, frequently no image.
 *
 * This is the India-specific source worth having — RBI, SEBI, NPCI, election
 * integrity, fintech — and it is a small WordPress feed that ships no featured
 * image. The only candidate is an inline `<img>` in the article body, which
 * most items do not have, so most items come back with `image: undefined` on
 * purpose and land in the text section of the board.
 */
export function parseMedianama(xml: string): FeedItem[] {
  return parseRss(xml, 'medianama', (block) =>
    firstMatch(`${tag(block, 'content:encoded')}\n${tag(block, 'description')}`, IMG_SRC),
  )
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
      region: SOURCE_REGION.verge,
      date: when.date,
      published: when.iso,
      image: imageUrl(firstMatch(body, IMG_SRC)),
      meta: textTag(block, 'name') || undefined,
    })
  }
  return items
}

/**
 * Words carried by almost every headline. Dropping them before comparing two
 * titles stops "the"/"a"/"to" inflating the overlap between two unrelated
 * stories, which is the direction the false positives come from.
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'for', 'from', 'has', 'have',
  'how', 'in', 'into', 'is', 'it', 'its', 'new', 'not', 'of', 'on', 'or', 'out', 'over', 's',
  'says', 'say', 'said', 't', 'that', 'the', 'their', 'this', 'to', 'up', 'was', 'what', 'why',
  'will', 'with', 'you', 'your',
])

/** Minimum shared content words before two titles may be called the same story. */
const TITLE_MIN_SHARED = 4
/** Jaccard overlap at or above which two titles are the same story. */
const TITLE_SIMILARITY = 0.7

/**
 * A headline reduced to its content words: lowercased, punctuation and
 * typographic quotes flattened, digits kept (a year or a funding figure is one
 * of the most discriminating tokens a headline has), stopwords dropped.
 */
function titleTokens(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0 && !STOPWORDS.has(w))
  return new Set(words)
}

/**
 * Whether two headlines are the same story told twice.
 *
 * The Indian Express re-reports the global stories Ars and The Verge break, so
 * cross-publisher duplicates are not hypothetical — they are the normal case
 * for anything about OpenAI or Anthropic. URL dedup cannot see them: the two
 * publishers give the same story different URLs.
 *
 * The test is deliberately conservative, because a false positive silently
 * deletes a real story and is far worse than a duplicate the reader can see
 * and ignore. Both of these must hold:
 *
 *   - at least {@link TITLE_MIN_SHARED} content words in common, so short
 *     headlines ("OpenAI raises again" / "OpenAI ships again") cannot collide
 *     on two or three tokens;
 *   - a Jaccard overlap of at least {@link TITLE_SIMILARITY}, so one headline
 *     has to be nearly the whole of the other, not merely about the same
 *     company.
 *
 * "Anthropic's Dario Amodei calls for a slower AI race" and "Dario Amodei
 * calls for slower AI race, says Anthropic" pass. "OpenAI launches GPT-6" and
 * "OpenAI launches a new image model" do not.
 */
function sameStory(a: Set<string>, b: Set<string>): boolean {
  let shared = 0
  for (const w of a) if (b.has(w)) shared++
  if (shared < TITLE_MIN_SHARED) return false
  const union = a.size + b.size - shared
  return union > 0 && shared / union >= TITLE_SIMILARITY
}

/**
 * Merge parsed source lists into the news feed.
 *
 *   1. Dedupe by URL — a story can be syndicated verbatim.
 *   2. Collapse near-identical headlines across publishers, keeping the
 *      EARLIEST item. The first publisher to run a story is the one that
 *      reported it; a wire re-report six hours later is the copy.
 *   3. Sort newest first.
 *   4. Take at most {@link MAX_PER_SOURCE} per publisher and
 *      {@link MAX_NEWS_ITEMS} overall, newest first, so no single feed's
 *      volume decides what the page is.
 */
export function mergeNews(lists: FeedItem[][]): FeedItem[] {
  const byUrl = new Map<string, FeedItem>()
  for (const list of lists) {
    for (const item of list) {
      if (!byUrl.has(item.url)) byUrl.set(item.url, item)
    }
  }

  const when = (i: FeedItem) => i.published ?? i.date
  const kept: { item: FeedItem; tokens: Set<string> }[] = []
  for (const item of byUrl.values()) {
    const tokens = titleTokens(item.title)
    const clash = kept.find((k) => sameStory(k.tokens, tokens))
    if (!clash) {
      kept.push({ item, tokens })
      continue
    }
    // Same story twice: whichever went out first is the one worth keeping.
    if (when(item) < when(clash.item)) {
      clash.item = item
      clash.tokens = tokens
    }
  }

  const sorted = kept.map((k) => k.item).sort((a, b) => when(b).localeCompare(when(a)))

  const perSource = new Map<FeedItem['source'], number>()
  const merged: FeedItem[] = []
  for (const item of sorted) {
    if (merged.length >= MAX_NEWS_ITEMS) break
    const taken = perSource.get(item.source) ?? 0
    if (taken >= MAX_PER_SOURCE) continue
    perSource.set(item.source, taken + 1)
    merged.push(item)
  }
  return merged
}
