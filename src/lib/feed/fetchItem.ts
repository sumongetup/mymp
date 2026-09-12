/**
 * One item from an address an editor pasted.
 *
 * The page is read once for its title, its share image and its date, and
 * nothing else is kept: the site stores a headline and a link, never an
 * article. If the page cannot be read, the editor's own title is used, so a
 * paywalled or slow outlet still gets a working link.
 */
import { FEED_UA } from './rss';
import { canonicalUrl, type FeedItemInput } from './store';

const meta = (html: string, prop: string): string | null => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
  const alt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
  const m = html.match(re) ?? html.match(alt);
  return m ? m[1]!.trim() : null;
};

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();

const YOUTUBE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/;

export async function fetchItemForUrl(url: string, fallbackTitle = ''): Promise<FeedItemInput> {
  const youtube = url.match(YOUTUBE);
  let html = '';
  try {
    const res = await fetch(url, { headers: { 'user-agent': FEED_UA, accept: 'text/html' }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
    if (res.ok) html = (await res.text()).slice(0, 200_000);
  } catch {
    // The page would not answer; the editor's title carries the item.
  }

  const title = decode(meta(html, 'og:title') ?? (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') ?? '') || fallbackTitle;
  if (!title) throw new Error('পাতার শিরোনাম পাওয়া যায়নি; নিজে শিরোনাম লিখুন।');
  const published = meta(html, 'article:published_time') ?? meta(html, 'og:updated_time') ?? meta(html, 'datePublished');
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; } })();

  return {
    type: youtube ? 'video' : 'news',
    title,
    url: canonicalUrl(url),
    summary: meta(html, 'og:description') ? decode(meta(html, 'og:description')!).slice(0, 600) : null,
    outletName: meta(html, 'og:site_name') ? decode(meta(html, 'og:site_name')!) : host,
    outletId: null,
    channelId: null,
    thumbnailUrl: youtube ? `https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg` : meta(html, 'og:image'),
    publishedAt: published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : new Date().toISOString(),
    source: 'manual',
  };
}
