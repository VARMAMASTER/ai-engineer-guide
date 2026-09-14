import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  parseArs,
  parseVerge,
  parseMedianama,
  parseIndianExpress,
  mergeNews,
  MAX_NEWS_ITEMS,
  MAX_PER_SOURCE,
} from '@/lib/feed/news'
import { SOURCE_REGION, SOURCES, SOURCE_LABEL, REGIONS } from '@/lib/feed/sources'
import { decodeEntities, timestamp } from '@/lib/feed/xml'
import { relativeTime } from '@/lib/date'
import type { FeedItem, FeedSource } from '@/lib/feed/types'

const arsXml = readFileSync('tests/fixtures/arstechnica.xml', 'utf8')
const vergeXml = readFileSync('tests/fixtures/verge.xml', 'utf8')
const medianamaXml = readFileSync('tests/fixtures/medianama.xml', 'utf8')
const indianExpressXml = readFileSync('tests/fixtures/indianexpress.xml', 'utf8')

describe('parseArs', () => {
  const items = parseArs(arsXml)

  it('reads every <item> in the fixture', () => {
    expect(items).toHaveLength(20)
  })

  it('gives each item a title, an absolute url, a date, and a full instant', () => {
    for (const i of items) {
      expect(i.source).toBe('ars')
      expect(i.region).toBe('global')
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
      expect(i.region).toBe('global')
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

describe('parseMedianama', () => {
  const items = parseMedianama(medianamaXml)

  it('reads every <item> in the fixture', () => {
    expect(items).toHaveLength(10)
  })

  it('stamps every item as the india region', () => {
    for (const i of items) {
      expect(i.source).toBe('medianama')
      expect(i.region).toBe('india')
      expect(i.url.startsWith('https://www.medianama.com/')).toBe(true)
      expect(i.title.length).toBeGreaterThan(5)
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(i.published!.slice(0, 10)).toBe(i.date)
    }
  })

  it('reads the genuinely India-specific stories this source exists for', () => {
    const titles = items.map((i) => i.title)
    expect(titles).toContain(
      'PayU rolls out AI fraud protection tool for cross-border card payments',
    )
    expect(titles.some((t) => t.includes('RBI'))).toBe(true)
  })

  it('keeps items that have no image at all, rather than dropping them', () => {
    // MediaNama ships no featured image; only some items have an inline <img>
    // in the body. Both kinds have to survive, or the India source is a
    // third of the size it should be.
    const withImage = items.filter((i) => i.image)
    const withoutImage = items.filter((i) => !i.image)
    expect(withImage.length).toBeGreaterThan(0)
    expect(withoutImage.length).toBeGreaterThan(0)
    expect(withImage.length + withoutImage.length).toBe(items.length)
    for (const i of withImage) {
      expect(i.image!.startsWith('https://www.medianama.com/wp-content/')).toBe(true)
    }
    for (const i of withoutImage) expect(i.image).toBeUndefined()
  })

  it('digs the image out of the content:encoded body', () => {
    const xml = `<rss><channel><item>
      <title>Body image</title>
      <link>https://www.medianama.com/2026/09/a/</link>
      <pubDate>Fri, 11 Sep 2026 12:12:33 +0000</pubDate>
      <content:encoded><![CDATA[<p>text</p><img src="https://www.medianama.com/wp-content/x.png?a=1&#038;b=2" />]]></content:encoded>
    </item></channel></rss>`
    expect(parseMedianama(xml)[0].image).toBe('https://www.medianama.com/wp-content/x.png?a=1&b=2')
  })

  it('falls back to the description blob when the body carries no image', () => {
    const xml = `<rss><channel><item>
      <title>Description image</title>
      <link>https://www.medianama.com/2026/09/b/</link>
      <pubDate>Fri, 11 Sep 2026 12:12:33 +0000</pubDate>
      <description><![CDATA[<img src="https://www.medianama.com/wp-content/d.png" />]]></description>
    </item></channel></rss>`
    expect(parseMedianama(xml)[0].image).toBe('https://www.medianama.com/wp-content/d.png')
  })

  it('returns an empty array for malformed xml', () => {
    expect(parseMedianama('<not-a-feed/>')).toEqual([])
    expect(parseMedianama('<rss><channel><item><title>Truncated')).toEqual([])
    expect(parseMedianama('')).toEqual([])
  })
})

describe('parseIndianExpress', () => {
  const items = parseIndianExpress(indianExpressXml)

  it('reads every <item> in the fixture', () => {
    expect(items).toHaveLength(24)
  })

  it('stamps every item as the india region', () => {
    for (const i of items) {
      expect(i.source).toBe('indianexpress')
      expect(i.region).toBe('india')
      expect(i.url.startsWith('https://indianexpress.com/article/')).toBe(true)
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(i.published).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })

  it('takes the lead Media RSS image, which is always on the CDN host', () => {
    // Every item's FIRST <media:content> is on images.indianexpress.com. The
    // feed does also carry `indianexpress.com/wp-content/...` URLs, but only
    // as the second and third <media:content> of an item whose lead image is
    // on the CDN — so the apex host is allowlisted in next.config.ts as
    // insurance, not because a parsed item points at it today.
    const hosts = new Set(items.filter((i) => i.image).map((i) => new URL(i.image!).hostname))
    expect(hosts).toEqual(new Set(['images.indianexpress.com']))
    expect(items[0].image).toBe('https://images.indianexpress.com/2026/04/sam-altman.jpg')
  })

  it('keeps an item with no media tag at all, with image undefined', () => {
    // One item in the live 200-item feed has no media tag; it must still land.
    const xml = `<rss><channel><item>
      <title>No media tag</title>
      <link>https://indianexpress.com/article/technology/artificial-intelligence/x-1/</link>
      <pubDate>Sun, 13 Sep 2026 10:24:03 +0000</pubDate>
    </item></channel></rss>`
    const [item] = parseIndianExpress(xml)
    expect(item.title).toBe('No media tag')
    expect(item.image).toBeUndefined()
    expect(item.region).toBe('india')
  })

  it('leaves meta undefined for the many items with an empty dc:creator', () => {
    expect(items[0].meta).toBeUndefined()
    expect(items.some((i) => typeof i.meta === 'string' && i.meta.length > 0)).toBe(true)
  })

  it('returns an empty array for malformed xml', () => {
    expect(parseIndianExpress('<not-a-feed/>')).toEqual([])
    expect(parseIndianExpress('')).toEqual([])
  })
})

describe('sources', () => {
  it('gives every source a label, an endpoint and a region', () => {
    for (const s of SOURCES) {
      expect(SOURCE_LABEL[s.id]).toBe(s.label)
      expect(s.endpoint.startsWith('/api/feed/')).toBe(true)
      expect(SOURCE_REGION[s.id]).toMatch(/^(global|india)$/)
    }
    expect(SOURCES).toHaveLength(Object.keys(SOURCE_LABEL).length)
  })

  it('marks exactly the Indian publishers as india', () => {
    const india = (Object.keys(SOURCE_REGION) as FeedSource[]).filter(
      (s) => SOURCE_REGION[s] === 'india',
    )
    expect(india.sort()).toEqual(['indianexpress', 'medianama'])
  })

  it('offers both regions as chips', () => {
    expect(REGIONS.map((r) => r.id)).toEqual(['global', 'india'])
  })
})

describe('mergeNews', () => {
  const item = (
    url: string,
    published: string,
    source: FeedSource = 'ars',
    title = url,
  ): FeedItem => ({
    id: url,
    title,
    url,
    source,
    region: SOURCE_REGION[source],
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

  it('caps each publisher, so one loud feed cannot own the board', () => {
    // The Indian Express really does return 200 items. Newest-first with no
    // per-source cap, it would take every slot.
    const many = Array.from({ length: 50 }, (_, n) =>
      item(
        `https://indianexpress.com/${n}`,
        `2026-09-01T00:${String(n).padStart(2, '0')}:00.000Z`,
        'indianexpress',
        `Indian Express story number ${n}`,
      ),
    )
    const merged = mergeNews([many])
    expect(merged).toHaveLength(MAX_PER_SOURCE)
    // Newest first, so the cap keeps the freshest ten and not an arbitrary ten.
    expect(merged[0].url).toBe('https://indianexpress.com/49')
  })

  it('caps the whole feed even when every publisher is full', () => {
    const lists = (['ars', 'verge', 'medianama', 'indianexpress'] as const).map((source) =>
      Array.from({ length: 30 }, (_, n) =>
        item(
          `https://example.com/${source}/${n}`,
          `2026-09-01T00:${String(n).padStart(2, '0')}:00.000Z`,
          source,
          `${source} distinct headline ${n}`,
        ),
      ),
    )
    const merged = mergeNews(lists)
    expect(merged.length).toBeLessThanOrEqual(MAX_NEWS_ITEMS)
    for (const source of ['ars', 'verge', 'medianama', 'indianexpress'] as const) {
      expect(merged.filter((i) => i.source === source)).toHaveLength(MAX_PER_SOURCE)
    }
  })

  it('collapses a near-identical headline across publishers, keeping the earliest', () => {
    const merged = mergeNews([
      [
        item(
          'https://arstechnica.com/a/',
          '2026-09-13T06:00:00.000Z',
          'ars',
          "Anthropic's Dario Amodei calls for a slower AI race",
        ),
      ],
      [
        item(
          'https://indianexpress.com/b/',
          '2026-09-13T12:00:00.000Z',
          'indianexpress',
          'Dario Amodei calls for slower AI race, says Anthropic',
        ),
      ],
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].source).toBe('ars')
  })

  it('does not collapse two different stories about the same company', () => {
    const merged = mergeNews([
      [item('https://a/', '2026-09-13T06:00:00.000Z', 'ars', 'OpenAI launches GPT-6 for developers')],
      [
        item(
          'https://b/',
          '2026-09-13T07:00:00.000Z',
          'indianexpress',
          'OpenAI signs data centre deal with Reliance in India',
        ),
      ],
    ])
    expect(merged).toHaveLength(2)
  })

  it('does not collapse two short headlines that merely share a subject', () => {
    const merged = mergeNews([
      [item('https://a/', '2026-09-13T06:00:00.000Z', 'ars', 'OpenAI raises again')],
      [item('https://b/', '2026-09-13T07:00:00.000Z', 'verge', 'OpenAI ships again')],
    ])
    expect(merged).toHaveLength(2)
  })

  it('merges all four real fixtures into one deduped, sorted, balanced feed', () => {
    const merged = mergeNews([
      parseArs(arsXml),
      parseVerge(vergeXml),
      parseMedianama(medianamaXml),
      parseIndianExpress(indianExpressXml),
    ])
    expect(merged.length).toBeLessThanOrEqual(MAX_NEWS_ITEMS)
    expect(new Set(merged.map((i) => i.url)).size).toBe(merged.length)
    for (const source of ['ars', 'verge', 'medianama', 'indianexpress'] as const) {
      expect(merged.filter((i) => i.source === source).length).toBeGreaterThan(0)
      expect(merged.filter((i) => i.source === source).length).toBeLessThanOrEqual(MAX_PER_SOURCE)
    }
    // Both regions actually make it onto the board.
    expect(merged.filter((i) => i.region === 'india').length).toBeGreaterThan(0)
    expect(merged.filter((i) => i.region === 'global').length).toBeGreaterThan(0)
    // And the region is never something other than the source's own.
    for (const i of merged) expect(i.region).toBe(SOURCE_REGION[i.source])
    // Items with no image survive the merge; the board renders them as text.
    expect(merged.some((i) => !i.image)).toBe(true)
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
