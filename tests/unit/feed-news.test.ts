import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseArs, parseVerge, mergeNews, MAX_NEWS_ITEMS } from '@/lib/feed/news'
import { decodeEntities, timestamp } from '@/lib/feed/xml'
import { relativeTime } from '@/lib/date'
import type { FeedItem } from '@/lib/feed/types'

const arsXml = readFileSync('tests/fixtures/arstechnica.xml', 'utf8')
const vergeXml = readFileSync('tests/fixtures/verge.xml', 'utf8')

describe('parseArs', () => {
  const items = parseArs(arsXml)

  it('reads every <item> in the fixture', () => {
    expect(items).toHaveLength(20)
  })

  it('gives each item a title, an absolute url, a date, and a full instant', () => {
    for (const i of items) {
      expect(i.source).toBe('ars')
      expect(i.title.length).toBeGreaterThan(5)
      expect(i.url.startsWith('https://arstechnica.com/')).toBe(true)
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(i.published).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(i.published!.slice(0, 10)).toBe(i.date)
    }
  })

  it('prefers the wide media:content image over the square media:thumbnail', () => {
    // Ars nests <media:thumbnail> (500x500) inside <media:content> (1152x648).
    // The card is 16:9, so the wide one is the one worth shipping.
    expect(items[0].image).toBe(
      'https://cdn.arstechnica.net/wp-content/uploads/2026/08/LakeMariner-1152x648.png',
    )
    for (const i of items) {
      expect(i.image, `${i.title} lost its image`).toBeDefined()
      expect(i.image!.startsWith('https://cdn.arstechnica.net/')).toBe(true)
      expect(i.image).not.toMatch(/-500x500\./)
    }
  })

  it('falls back to media:thumbnail when there is no media:content', () => {
    const xml = `<rss><channel><item>
      <title>Thumbnail only</title>
      <link>https://arstechnica.com/a/</link>
      <pubDate>Mon, 07 Sep 2026 11:00:03 +0000</pubDate>
      <media:thumbnail url="https://cdn.arstechnica.net/x-500x500.jpg" width="500" height="500" />
    </item></channel></rss>`
    expect(parseArs(xml)[0].image).toBe('https://cdn.arstechnica.net/x-500x500.jpg')
  })

  it('keeps an item that has no image at all, with image undefined', () => {
    const xml = `<rss><channel><item>
      <title>No picture here</title>
      <link>https://arstechnica.com/plain/</link>
      <pubDate>Mon, 07 Sep 2026 11:00:03 +0000</pubDate>
    </item></channel></rss>`
    const [item] = parseArs(xml)
    expect(item.title).toBe('No picture here')
    expect(item.image).toBeUndefined()
  })

  it('ignores a non-https image url rather than shipping a mixed-content src', () => {
    const xml = `<rss><channel><item>
      <title>Insecure image</title>
      <link>https://arstechnica.com/b/</link>
      <pubDate>Mon, 07 Sep 2026 11:00:03 +0000</pubDate>
      <media:content url="http://cdn.arstechnica.net/x.jpg" />
    </item></channel></rss>`
    expect(parseArs(xml)[0].image).toBeUndefined()
  })

  it('decodes entities and collapses whitespace in titles', () => {
    const xml = `<rss><channel><item>
      <title><![CDATA[Foo &amp; Bar
         &#8212; part &#039;two&#039;]]></title>
      <link>https://arstechnica.com/c/</link>
      <pubDate>Mon, 07 Sep 2026 11:00:03 +0000</pubDate>
    </item></channel></rss>`
    expect(parseArs(xml)[0].title).toBe("Foo & Bar — part 'two'")
  })

  it('skips an item with an unparseable pubDate', () => {
    const xml = `<rss><channel><item>
      <title>Broken date</title>
      <link>https://arstechnica.com/d/</link>
      <pubDate>not a date at all</pubDate>
    </item></channel></rss>`
    expect(parseArs(xml)).toEqual([])
  })

  it('returns an empty array for malformed xml', () => {
    expect(parseArs('<not-a-feed/>')).toEqual([])
    expect(parseArs('<rss><channel><item><title>Truncated')).toEqual([])
    expect(parseArs('')).toEqual([])
  })
})

describe('parseVerge', () => {
  const items = parseVerge(vergeXml)

  it('reads every <entry> in the fixture', () => {
    expect(items).toHaveLength(10)
  })

  it('takes the url from the rel="alternate" link, not the <id>', () => {
    // <id> is the WordPress permalink stub (https://www.theverge.com/?p=990932),
    // which is a redirect, not the article URL.
    expect(items[0].url).toBe(
      'https://www.theverge.com/ai-artificial-intelligence/990932/seattle-times-newsday-lawsuit-openai-microsoft',
    )
    for (const i of items) {
      expect(i.source).toBe('verge')
      expect(i.url.startsWith('https://www.theverge.com/')).toBe(true)
      expect(i.url).not.toContain('?p=')
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('digs the image out of the <img> inside the content CDATA', () => {
    for (const i of items) {
      expect(i.image, `${i.title} lost its image`).toBeDefined()
      expect(i.image!.startsWith('https://platform.theverge.com/')).toBe(true)
    }
  })

  it('decodes the &#038; entities the Verge writes into its image query strings', () => {
    // Undecoded, this src is a literal `&#038;strip=all` and the CDN 404s it.
    expect(items[0].image).toBe(
      'https://platform.theverge.com/wp-content/uploads/sites/2/2026/09/gettyimages-2292926705.jpg' +
        '?quality=90&strip=all&crop=0,0,100,100',
    )
    for (const i of items) expect(i.image).not.toContain('&#')
  })

  it('finds src even when it is not the first attribute on the img tag', () => {
    const xml = `<feed><entry>
      <title type="html"><![CDATA[Late src]]></title>
      <link rel="alternate" type="text/html" href="https://www.theverge.com/x" />
      <published>2026-09-06T19:36:04-04:00</published>
      <content type="html"><![CDATA[<figure><img alt="" data-caption="a &quot;quote&quot;" data-portal-copyright="Getty" src="https://platform.theverge.com/y.jpg?a=1&#038;b=2" /></figure>]]></content>
    </entry></feed>`
    expect(parseVerge(xml)[0].image).toBe('https://platform.theverge.com/y.jpg?a=1&b=2')
  })

  it('falls back to the summary blob when content carries no image', () => {
    const xml = `<feed><entry>
      <title type="html"><![CDATA[Summary image]]></title>
      <link rel="alternate" type="text/html" href="https://www.theverge.com/z" />
      <published>2026-09-06T19:36:04-04:00</published>
      <summary type="html"><![CDATA[<p>text</p><img src="https://platform.theverge.com/s.jpg" />]]></summary>
    </entry></feed>`
    expect(parseVerge(xml)[0].image).toBe('https://platform.theverge.com/s.jpg')
  })

  it('keeps an entry with no image at all, with image undefined', () => {
    const xml = `<feed><entry>
      <title type="html"><![CDATA[Text only entry]]></title>
      <link rel="alternate" type="text/html" href="https://www.theverge.com/plain" />
      <published>2026-09-06T19:36:04-04:00</published>
      <content type="html"><![CDATA[<p>Just prose, no figure.</p>]]></content>
    </entry></feed>`
    const [item] = parseVerge(xml)
    expect(item.title).toBe('Text only entry')
    expect(item.image).toBeUndefined()
  })

  it('falls back to <updated> when there is no <published>', () => {
    const xml = `<feed><entry>
      <title type="html"><![CDATA[Updated only]]></title>
      <link rel="alternate" type="text/html" href="https://www.theverge.com/u" />
      <updated>2026-09-06T23:43:53+00:00</updated>
    </entry></feed>`
    expect(parseVerge(xml)[0].date).toBe('2026-09-06')
  })

  it('returns an empty array for malformed xml', () => {
    expect(parseVerge('<not-a-feed/>')).toEqual([])
    expect(parseVerge('<feed><entry><title>Truncated')).toEqual([])
    expect(parseVerge('')).toEqual([])
  })

  it('skips an entry with no alternate link', () => {
    const xml = `<feed><entry>
      <title type="html"><![CDATA[Linkless]]></title>
      <published>2026-09-06T19:36:04-04:00</published>
    </entry></feed>`
    expect(parseVerge(xml)).toEqual([])
  })
})

describe('mergeNews', () => {
  const item = (url: string, published: string): FeedItem => ({
    id: url,
    title: url,
    url,
    source: 'ars',
    date: published.slice(0, 10),
    published,
  })

  it('dedupes by url across sources', () => {
    const shared = item('https://example.com/a', '2026-09-05T00:00:00.000Z')
    const merged = mergeNews([
      [shared],
      [shared, item('https://example.com/b', '2026-09-04T00:00:00.000Z')],
    ])
    expect(merged.map((i) => i.url)).toEqual(['https://example.com/a', 'https://example.com/b'])
  })

  it('sorts newest first', () => {
    const merged = mergeNews([
      [item('https://example.com/old', '2026-09-01T00:00:00.000Z')],
      [item('https://example.com/new', '2026-09-07T12:00:00.000Z')],
      [item('https://example.com/mid', '2026-09-04T00:00:00.000Z')],
    ])
    expect(merged.map((i) => i.url)).toEqual([
      'https://example.com/new',
      'https://example.com/mid',
      'https://example.com/old',
    ])
  })

  it('caps the merged feed', () => {
    const many = Array.from({ length: 50 }, (_, n) =>
      item(`https://example.com/${n}`, `2026-09-01T00:${String(n).padStart(2, '0')}:00.000Z`),
    )
    expect(mergeNews([many])).toHaveLength(MAX_NEWS_ITEMS)
  })

  it('merges the two real fixtures into one deduped, sorted feed', () => {
    const merged = mergeNews([parseArs(arsXml), parseVerge(vergeXml)])
    expect(merged).toHaveLength(MAX_NEWS_ITEMS)
    expect(new Set(merged.map((i) => i.url)).size).toBe(merged.length)
    expect(merged.every((i) => i.image)).toBe(true)
    const stamps = merged.map((i) => i.published!)
    expect([...stamps].sort().reverse()).toEqual(stamps)
  })

  it('survives every source returning nothing', () => {
    expect(mergeNews([])).toEqual([])
    expect(mergeNews([[], []])).toEqual([])
  })
})

describe('decodeEntities', () => {
  it('decodes named, decimal and hex references', () => {
    expect(decodeEntities('a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;')).toBe(
      'a & b <c> "d" \'e\'',
    )
    expect(decodeEntities('x=1&#038;y=2')).toBe('x=1&y=2')
    expect(decodeEntities('&#8230; and &#x2014;')).toBe('… and —')
  })

  it('decodes in a single pass, so an escaped entity stays escaped', () => {
    expect(decodeEntities('&amp;#039;')).toBe('&#039;')
  })

  it('leaves an out-of-range reference alone', () => {
    expect(decodeEntities('&#1114112;')).toBe('&#1114112;')
  })
})

describe('timestamp', () => {
  it('reads RFC-822 and ISO-8601 alike', () => {
    expect(timestamp('Mon, 07 Sep 2026 11:00:03 +0000')?.date).toBe('2026-09-07')
    expect(timestamp('2026-09-06T19:36:04-04:00')?.date).toBe('2026-09-06')
  })

  it('returns null for junk', () => {
    expect(timestamp('')).toBeNull()
    expect(timestamp('yesterday-ish')).toBeNull()
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-09-07T12:00:00.000Z')

  it('renders the short ladder', () => {
    expect(relativeTime('2026-09-07T11:59:30.000Z', now)).toBe('just now')
    expect(relativeTime('2026-09-07T11:48:00.000Z', now)).toBe('12m ago')
    expect(relativeTime('2026-09-07T09:00:00.000Z', now)).toBe('3h ago')
    expect(relativeTime('2026-09-05T12:00:00.000Z', now)).toBe('2d ago')
    expect(relativeTime('2026-08-16T12:00:00.000Z', now)).toBe('3w ago')
    expect(relativeTime('2026-01-02T12:00:00.000Z', now)).toBe('2026-01-02')
  })

  it('accepts a bare calendar date, as arXiv and HN supply', () => {
    expect(relativeTime('2026-09-06', now)).toBe('1d ago')
  })

  it('clamps a future timestamp instead of rendering a negative age', () => {
    expect(relativeTime('2026-09-08T12:00:00.000Z', now)).toBe('just now')
  })

  it('returns unparseable input verbatim', () => {
    expect(relativeTime('soon', now)).toBe('soon')
  })
})
