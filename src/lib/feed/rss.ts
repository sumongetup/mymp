/**
 * A small RSS and Atom reader. No dependency: the feeds the site reads are
 * plain, and a parser we own is one less thing to break on a Sunday.
 *
 * Only the headline, the address, the date and the feed's own summary are
 * taken. The article body is never stored, and never even asked for.
 */

export interface RssItem {
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string | null;
  /** The outlet's own picture for the story, if its feed names one. */
  thumbnailUrl?: string | null;
}

const strip = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();

const tag = (block: string, name: string): string | null => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? strip(m[1]!) : null;
};

/** Atom puts the address in an attribute. */
const atomLink = (block: string): string | null => {
  const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (alt) return strip(alt[1]!);
  const any = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return any ? strip(any[1]!) : null;
};

/**
 * The story's own picture, taken from the feed entry and never from the page.
 *
 * Outlets name it in whichever way their publishing system happens to use —
 * `media:content` at প্রথম আলো and জাগো নিউজ, `image:loc` in a news sitemap, an
 * `enclosure` elsewhere — and some only put an `<img>` in the summary. The
 * address is kept; the picture itself is left on the outlet's server, where a
 * reader's browser loads it from and where the outlet can change or remove it.
 */
function itemImage(block: string): string | null {
  const attr = (name: string, extra = '') => {
    const m = block.match(new RegExp(`<${name}\\b[^>]*${extra}[^>]*\\surl=["']([^"']+)["']`, 'i'))
      ?? block.match(new RegExp(`<${name}\\b[^>]*\\surl=["']([^"']+)["'][^>]*${extra}`, 'i'));
    return m?.[1] ?? null;
  };
  const candidates = [
    attr('media:content', 'medium=["\']image["\']'),
    attr('media:thumbnail'),
    attr('media:content'),
    tag(block, 'image:loc'),
    block.match(/<enclosure\b[^>]*type=["']image\/[^"']*["'][^>]*\surl=["']([^"']+)["']/i)?.[1] ?? null,
    block.match(/<enclosure\b[^>]*\surl=["']([^"']+)["'][^>]*type=["']image\/[^"']*["']/i)?.[1] ?? null,
    // A picture inside the summary's HTML, before the tags are stripped away.
    block.match(/<img[^>]*\ssrc=["']([^"']+)["']/i)?.[1] ?? null,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const url = strip(raw);
    if (!/^https?:\/\//i.test(url)) continue;
    // Some outlets fill the picture field with their "no image" house graphic.
    // Showing that is worse than showing nothing. The file name is what is
    // tested, and only as a whole word: YouTube's own thumbnail is called
    // hqdefault.jpg, and a rule that read "default" inside it threw away every
    // video's picture.
    const file = url.split('?')[0]!.split('/').pop() ?? '';
    if (/^(no[-_]?image|noimg|placeholder|default|blank)[-_.]?/i.test(file)) continue;
    return url.slice(0, 800);
  }
  return null;
}

function toIso(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  // A feed dated in the future is a clock problem at the source, not news.
  if (d.getTime() > Date.now() + 6 * 3600 * 1000) return new Date().toISOString();
  return d.toISOString();
}

export function parseFeed(xml: string): RssItem[] {
  const blocks = [
    ...(xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []),
    ...(xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []),
  ];
  const items: RssItem[] = [];
  for (const b of blocks) {
    const title = tag(b, 'title');
    const url = tag(b, 'link') || atomLink(b) || tag(b, 'guid');
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    const summary = tag(b, 'description') ?? tag(b, 'summary') ?? tag(b, 'content:encoded') ?? tag(b, 'content');
    items.push({
      title,
      url,
      publishedAt: toIso(tag(b, 'pubDate') ?? tag(b, 'published') ?? tag(b, 'updated') ?? tag(b, 'dc:date')),
      summary: summary ? summary.slice(0, 600) : null,
      thumbnailUrl: itemImage(b),
    });
  }
  return items;
}

/**
 * A Google News sitemap: what an outlet publishes for machines, with the
 * headline and the time beside each address. bdnews24 has one and no feed, so
 * this reads it exactly as if it were a feed.
 */
export function parseNewsSitemap(xml: string): RssItem[] {
  const items: RssItem[] = [];
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/gi) ?? []) {
    const url = tag(block, 'loc');
    const title = tag(block, 'news:title');
    if (!url || !title || !/^https?:\/\//i.test(url)) continue;
    items.push({ title, url, publishedAt: toIso(tag(block, 'news:publication_date')), summary: null, thumbnailUrl: itemImage(block) });
  }
  return items;
}

export const FEED_UA = 'mymp-feed/1.0 (+https://mymp.bd)';

/** One feed, with a timeout. Errors come back as a message, never as a throw. */
export async function fetchFeed(url: string, timeoutMs = 20000): Promise<{ items: RssItem[]; error?: string }> {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': FEED_UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
      signal: control.signal,
      redirect: 'follow',
    });
    if (!res.ok) return { items: [], error: `HTTP ${res.status}` };
    const text = await res.text();
    const items = /<urlset/i.test(text) ? parseNewsSitemap(text) : parseFeed(text);
    return items.length ? { items } : { items: [], error: 'no items in the feed' };
  } catch (e) {
    const err = e as Error;
    return { items: [], error: err.name === 'AbortError' ? 'timed out' : err.message };
  } finally {
    clearTimeout(timer);
  }
}
