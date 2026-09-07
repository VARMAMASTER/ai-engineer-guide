/**
 * The lightweight XML helpers every feed parser in this directory shares.
 *
 * There is deliberately no XML library here. All four feeds are small, flat,
 * machine-generated documents from stable publishers, and a regex reader that
 * skips anything it cannot understand degrades to "fewer items" rather than
 * "throws on the whole document" — which is exactly the failure mode a feed
 * page wants. Every parser below returns `[]` for input it cannot read.
 */

const NAMED: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
}

// One alternation, one pass. Decoding named entities and numeric entities in
// separate passes would turn `&amp;#039;` (a literal, escaped entity) into an
// apostrophe; a single pass leaves it as the `&#039;` text it actually is.
const ENTITY = /&(?:amp|lt|gt|quot|apos|nbsp|#\d{1,7}|#[xX][0-9a-fA-F]{1,6});/g

/**
 * Decode the HTML entities these feeds actually emit — the five named XML ones
 * plus decimal and hex character references. The Verge writes its image URLs
 * with `&#038;` for every query-string `&`, so an undecoded `src` is a 404.
 */
export function decodeEntities(s: string): string {
  return s.replace(ENTITY, (m) => {
    const named = NAMED[m]
    if (named !== undefined) return named
    const body = m.slice(2, -1)
    const code = body[0] === 'x' || body[0] === 'X' ? parseInt(body.slice(1), 16) : Number(body)
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
  })
}

/** Unwrap a `<![CDATA[...]]>` payload; returns `s` unchanged when there is none. */
export function stripCdata(s: string): string {
  const m = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/)
  return m ? m[1] : s
}

/** Collapse every run of whitespace to a single space and trim. */
export function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/** The text content of the first `<name>...</name>` element inside `block`. */
export function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? m[1].trim() : ''
}

/** `tag`, then CDATA unwrapped, entities decoded, and whitespace collapsed. */
export function textTag(block: string, name: string): string {
  return clean(decodeEntities(stripCdata(tag(block, name))))
}

/**
 * An RFC-822 (`Mon, 07 Sep 2026 11:00:03 +0000`) or ISO-8601 timestamp as a
 * `{ iso, date }` pair, or `null` when it is not a date at all. `date` is the
 * `YYYY-MM-DD` calendar day every `FeedItem` carries; `iso` is the full instant
 * the relative-time readout ("3h ago") needs.
 */
export function timestamp(raw: string): { iso: string; date: string } | null {
  const text = clean(raw)
  if (!text) return null
  const ms = Date.parse(text)
  if (Number.isNaN(ms)) return null
  const iso = new Date(ms).toISOString()
  return { iso, date: iso.slice(0, 10) }
}
