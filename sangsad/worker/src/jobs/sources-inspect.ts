/**
 * `sources:inspect`: look at every news source before anything is ingested,
 * as the brief requires, and write down what was found.
 *
 * For each source: robots.txt first; then feed candidates from the homepage's
 * own <link rel="alternate"> tags, a short list of known feed addresses, and
 * the usual feed paths. A candidate counts only if robots.txt allows it, it
 * answers 200 with a real RSS/Atom document, and it has at least three items,
 * the newest less than 14 days old. A bot challenge or a robots.txt refusal
 * marks the source blocked; nothing tries to get past either.
 *
 * Results go to config/sources.json (rss_urls, status, notes, inspected_at)
 * and to the table in docs/SOURCES.md between the news-sources markers.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Parser from 'rss-parser';
import { mayFetch, politeGet, robotsFor } from '@sangsad/shared';

export const SOURCES_JSON = resolve(import.meta.dirname, '../../../config/sources.json');
const SOURCES_MD = resolve(import.meta.dirname, '../../../docs/SOURCES.md');
const MD_START = '<!-- news-sources:start -->';
const MD_END = '<!-- news-sources:end -->';
const FRESH_DAYS = 14;

export interface SourceConfig {
  id: string;
  name_bn: string;
  name_en: string;
  type: 'portal' | 'tv';
  group: 'bd-portal' | 'bd-tv' | 'international';
  homepage: string;
  rss_urls: string[];
  /** Google News sitemaps (headline, link, publication time) for outlets without an RSS feed. */
  news_sitemap_urls?: string[];
  youtube_channel_id: string | null;
  language: 'bn' | 'en';
  status: 'active' | 'no_feed' | 'blocked' | 'disabled' | 'pending_inspection';
  notes: string;
  inspected_at?: string;
}

/** Addresses published by the outlets themselves; each is still checked like any other candidate. */
const KNOWN_FEEDS: Record<string, string[]> = {
  'daily-star': ['https://www.thedailystar.net/frontpage/rss.xml', 'https://www.thedailystar.net/rss.xml'],
  'prothom-alo': ['https://www.prothomalo.com/feed/', 'https://www.prothomalo.com/stories.rss'],
  'bbc-bangla': ['https://feeds.bbci.co.uk/bengali/rss.xml'],
  'dw-bangla': ['https://rss.dw.com/rdf/rss-bn-all', 'https://rss.dw.com/xml/rss-bn-all'],
  tbs: ['https://www.tbsnews.net/top-news/rss.xml', 'https://www.tbsnews.net/rss.xml'],
  'daily-star-bangla': ['https://bangla.thedailystar.net/rss.xml'],
  'prothom-alo-english': ['https://en.prothomalo.com/feed/', 'https://en.prothomalo.com/stories.rss'],
  'bbc-news': ['https://feeds.bbci.co.uk/news/world/asia/rss.xml', 'https://feeds.bbci.co.uk/news/world/rss.xml'],
  'al-jazeera': ['https://www.aljazeera.com/xml/rss/all.xml'],
  guardian: ['https://www.theguardian.com/world/bangladesh/rss'],
  nyt: ['https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml'],
  cnn: ['http://rss.cnn.com/rss/edition_asia.rss'],
  economist: ['https://www.economist.com/asia/rss.xml'],
  bloomberg: ['https://feeds.bloomberg.com/politics/news.rss'],
};
const GENERIC_PATHS = ['/feed', '/rss', '/rss.xml', '/feed.xml', '/rss/rss.xml', '/feed/rss.xml', '/feeds/rss', '/atom.xml'];
const MAX_CANDIDATES = 12;

const parser = new Parser({ timeout: 20000 });

export interface FeedCheck {
  url: string;
  ok: boolean;
  items: number;
  newest: string | null;
  why: string;
  blocked: boolean;
}

/** <link rel="alternate" type="application/rss+xml" href="…"> tags, resolved against the page. */
export function feedLinksFromHtml(html: string, base: string): string[] {
  const out: string[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/type\s*=\s*["']application\/(rss|atom)\+xml["']/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      out.push(new URL(href.replace(/&amp;/g, '&'), base).href);
    } catch {
      /* ignore a malformed href */
    }
  }
  return out;
}

const looksLikeFeed = (text: string) => /<(rss|feed|rdf:RDF)[\s>]/i.test(text.slice(0, 3000));
/** Comment feeds are not news. */
const isCommentFeed = (url: string) => /comments?\/feed|feed=comments|\/comments\b/i.test(url);

const decodeXml = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').trim();

export interface SitemapItem {
  url: string;
  title: string;
  publishedAt: string | null;
}

/** Entries of a Google News sitemap (<url><loc/><news:news><news:title/><news:publication_date/></news:news></url>). */
export function parseNewsSitemap(xml: string): SitemapItem[] {
  const out: SitemapItem[] = [];
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/gi) ?? []) {
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1];
    const title = block.match(/<news:title>([\s\S]*?)<\/news:title>/i)?.[1];
    const date = block.match(/<news:publication_date>([\s\S]*?)<\/news:publication_date>/i)?.[1];
    if (!loc || !title) continue;
    const ms = date ? Date.parse(decodeXml(date)) : NaN;
    out.push({ url: decodeXml(loc), title: decodeXml(title), publishedAt: Number.isNaN(ms) ? null : new Date(ms).toISOString() });
  }
  return out;
}

/**
 * Checks a news sitemap. `scope` is the homepage when it has a path
 * (bbc.com/bengali, dw.com/bn): items must live under it, so a publisher's
 * other-language sitemap is never taken for this outlet. A sitemap index is
 * followed one level down.
 */
export async function checkNewsSitemap(url: string, scope: URL | null = null, now = Date.now(), depth = 0): Promise<FeedCheck> {
  const base = { url, ok: false, items: 0, newest: null as string | null, blocked: false };
  const allowed = await mayFetch(url);
  if (!allowed.ok) return { ...base, why: allowed.why, blocked: true };
  let r;
  try {
    r = await politeGet(url, 'application/xml,text/xml;q=0.9,*/*;q=0.5');
  } catch (err) {
    return { ...base, why: `fetch failed: ${(err as Error).message}` };
  }
  if (r.challenged) return { ...base, why: 'bot challenge', blocked: true };
  if (r.status !== 200) return { ...base, why: `HTTP ${r.status}` };
  if (depth === 0 && /<sitemapindex[\s>]/i.test(r.text.slice(0, 3000))) {
    const children = (r.text.match(/<loc>[\s\S]*?<\/loc>/gi) ?? []).map((l) => decodeXml(l.replace(/<\/?loc>/gi, ''))).slice(0, 2);
    for (const child of children) {
      const c = await checkNewsSitemap(child, scope, now, 1);
      if (c.ok) return c;
    }
    return { ...base, why: 'news sitemap index without a usable child' };
  }
  if (!/<urlset[\s>]/i.test(r.text.slice(0, 3000)) || !/<news:news>/i.test(r.text)) return { ...base, why: 'not a news sitemap' };
  const all = parseNewsSitemap(r.text);
  const prefix = scope && scope.pathname.replace(/\/$/, '') ? `${scope.origin}${scope.pathname.replace(/\/$/, '')}/` : null;
  const items = prefix ? all.filter((i) => i.url.startsWith(prefix)) : all;
  if (prefix && items.length < all.length / 2) return { ...base, items: items.length, why: `news sitemap mostly outside ${scope!.pathname}` };
  const dates = items.map((i) => (i.publishedAt ? Date.parse(i.publishedAt) : NaN)).filter((d) => !Number.isNaN(d));
  const newestMs = dates.length ? Math.max(...dates) : null;
  const newest = newestMs ? new Date(newestMs).toISOString() : null;
  if (items.length < 3) return { ...base, items: items.length, newest, why: `only ${items.length} items` };
  if (newestMs === null || now - newestMs >= FRESH_DAYS * 864e5) return { ...base, items: items.length, newest, why: 'stale news sitemap' };
  return { ...base, ok: true, items: items.length, newest, why: 'ok' };
}

/** News-sitemap candidates: robots.txt Sitemap lines that name news, children of a sitemap index that do, and the usual paths. */
async function sitemapCandidates(origin: string): Promise<string[]> {
  const out = new Set<string>();
  const robots = await robotsFor(origin);
  const listed = robots === 'deny' ? [] : robots.sitemaps;
  for (const s of listed) if (/news|google/i.test(s)) out.add(s);
  for (const index of listed.filter((s) => !/news|google/i.test(s)).slice(0, 1)) {
    if (!(await mayFetch(index)).ok) continue;
    try {
      const r = await politeGet(index, 'application/xml,text/xml;q=0.9,*/*;q=0.5');
      if (r.status === 200 && !r.challenged && /<sitemapindex[\s>]/i.test(r.text.slice(0, 3000))) {
        for (const loc of r.text.match(/<loc>[\s\S]*?<\/loc>/gi) ?? []) {
          const u = decodeXml(loc.replace(/<\/?loc>/gi, ''));
          if (/news/i.test(u)) out.add(u);
        }
      }
    } catch {
      /* an unreadable index just yields no candidates */
    }
  }
  for (const p of ['/sitemap-news.xml', '/news-sitemap.xml', '/googlenews.xml']) out.add(`${origin}${p}`);
  return [...out].slice(0, 5);
}

export async function checkFeed(url: string, now = Date.now()): Promise<FeedCheck> {
  const base = { url, ok: false, items: 0, newest: null as string | null, blocked: false };
  const allowed = await mayFetch(url);
  if (!allowed.ok) return { ...base, why: allowed.why, blocked: true };
  let r;
  try {
    r = await politeGet(url, 'application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.9,*/*;q=0.5');
  } catch (err) {
    return { ...base, why: `fetch failed: ${(err as Error).message}` };
  }
  if (r.challenged) return { ...base, why: 'bot challenge', blocked: true };
  if (r.status !== 200) return { ...base, why: `HTTP ${r.status}` };
  if (!looksLikeFeed(r.text)) return { ...base, why: `not a feed (${r.contentType.split(';')[0] || 'no type'})` };
  try {
    const feed = await parser.parseString(r.text);
    const items = feed.items.filter((i) => i.title && i.link);
    const dates = items.map((i) => Date.parse(i.isoDate ?? i.pubDate ?? '')).filter((d) => !Number.isNaN(d));
    const newestMs = dates.length ? Math.max(...dates) : null;
    const newest = newestMs ? new Date(newestMs).toISOString() : null;
    const fresh = newestMs !== null && now - newestMs < FRESH_DAYS * 864e5;
    if (items.length < 3) return { ...base, items: items.length, newest, why: `only ${items.length} items` };
    if (!fresh) return { ...base, items: items.length, newest, why: newest ? `stale, newest ${newest.slice(0, 10)}` : 'items carry no dates' };
    return { ...base, ok: true, items: items.length, newest, why: 'ok' };
  } catch (err) {
    return { ...base, why: `unparseable: ${(err as Error).message.slice(0, 60)}` };
  }
}

export async function inspectSource(s: SourceConfig): Promise<{ status: SourceConfig['status']; rss_urls: string[]; news_sitemap_urls?: string[]; notes: string }> {
  const home = new URL(s.homepage);
  const candidates = new Set<string>(KNOWN_FEEDS[s.id] ?? []);
  const notes: string[] = [];
  let homeBlocked = false;

  const homeAllowed = await mayFetch(home.href);
  if (!homeAllowed.ok) {
    homeBlocked = true;
    notes.push(homeAllowed.why);
  } else {
    try {
      const r = await politeGet(home.href, 'text/html,application/xhtml+xml');
      if (r.challenged) {
        homeBlocked = true;
        notes.push('homepage serves a bot challenge');
      } else if (r.status === 200) {
        for (const u of feedLinksFromHtml(r.text, r.url)) if (!isCommentFeed(u)) candidates.add(u);
      } else notes.push(`homepage HTTP ${r.status}`);
    } catch (err) {
      notes.push(`homepage unreachable: ${(err as Error).message}`);
    }
  }
  const basePath = home.pathname.replace(/\/$/, '');
  for (const p of GENERIC_PATHS) candidates.add(`${home.origin}${basePath}${p}`);

  const checks: FeedCheck[] = [];
  for (const url of [...candidates].slice(0, MAX_CANDIDATES)) {
    const c = await checkFeed(url);
    checks.push(c);
    if (c.ok) {
      return { status: 'active', rss_urls: [c.url], news_sitemap_urls: [], notes: `feed ${c.url}: ${c.items} items, newest ${c.newest?.slice(0, 16).replace('T', ' ')} UTC` };
    }
    // A challenge on one path means the whole site challenges bots; stop asking.
    if (c.why === 'bot challenge') break;
  }
  if (!homeBlocked && !checks.some((c) => c.why === 'bot challenge')) {
    for (const url of await sitemapCandidates(home.origin)) {
      const c = await checkNewsSitemap(url, home);
      checks.push(c);
      if (c.ok) {
        return { status: 'active', rss_urls: [], news_sitemap_urls: [c.url], notes: `news sitemap ${c.url}: ${c.items} items, newest ${c.newest?.slice(0, 16).replace('T', ' ')} UTC` };
      }
    }
  }
  const tally = new Map<string, number>();
  for (const c of checks) {
    const k = c.why.replace(/https?:\/\/\S+/g, '').replace(/\/[^\s]*/g, '').slice(0, 40);
    tally.set(k, (tally.get(k) ?? 0) + 1);
  }
  const summary = [...tally].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join('; ');
  const blocked = homeBlocked || checks.some((c) => c.blocked);
  return {
    status: blocked ? 'blocked' : 'no_feed',
    rss_urls: [],
    news_sitemap_urls: [],
    notes: [...notes, `no usable feed among ${checks.length} candidates (${summary})`].join('; '),
  };
}

export function readSources(): { note: string; sources: SourceConfig[] } {
  const doc = JSON.parse(readFileSync(SOURCES_JSON, 'utf8')) as { _note: string; sources: SourceConfig[] };
  return { note: doc._note, sources: doc.sources };
}

export function writeSources(note: string, sources: SourceConfig[]) {
  const lines = ['{', `  "_note": ${JSON.stringify(note)},`, '  "sources": ['];
  sources.forEach((s, i) => lines.push(`    ${JSON.stringify(s)}${i < sources.length - 1 ? ',' : ''}`));
  lines.push('  ]', '}', '');
  writeFileSync(SOURCES_JSON, lines.join('\n'));
}

const GROUP_LABEL: Record<SourceConfig['group'], string> = {
  'bd-portal': 'Newspapers and portals (Bangladesh)',
  'bd-tv': 'TV channel websites (Bangladesh)',
  international: 'International',
};

export function sourcesTable(sources: SourceConfig[], when: string): string {
  const counts = { active: 0, no_feed: 0, blocked: 0 } as Record<string, number>;
  for (const s of sources) counts[s.status] = (counts[s.status] ?? 0) + 1;
  const out = [
    MD_START,
    `Inspected ${when} by \`pnpm worker sources:inspect\` (robots.txt, the homepage's feed links, known feed addresses, the usual feed paths). ${counts.active ?? 0} active, ${counts.no_feed ?? 0} without a usable feed, ${counts.blocked ?? 0} blocked. Only active sources are read by the news job; the others are re-inspected on the next inspection run, never worked around.`,
    '',
  ];
  for (const group of Object.keys(GROUP_LABEL) as SourceConfig['group'][]) {
    out.push(`### ${GROUP_LABEL[group]}`, '', '| Source | Status | Feed | Notes |', '|---|---|---|---|');
    for (const s of sources.filter((x) => x.group === group)) {
      const feed = s.rss_urls[0] ? `RSS \`${s.rss_urls[0]}\`` : s.news_sitemap_urls?.[0] ? `news sitemap \`${s.news_sitemap_urls[0]}\`` : '';
      out.push(`| ${s.name_en} (${new URL(s.homepage).host}) | ${s.status} | ${feed} | ${s.notes.replace(/\|/g, '/')} |`);
    }
    out.push('');
  }
  out.push(MD_END);
  return out.join('\n');
}

export function writeSourcesMd(table: string) {
  let md = readFileSync(SOURCES_MD, 'utf8');
  if (md.includes(MD_START) && md.includes(MD_END)) {
    md = md.slice(0, md.indexOf(MD_START)) + table + md.slice(md.indexOf(MD_END) + MD_END.length);
  } else {
    const at = md.indexOf('## News sources');
    const head = at >= 0 ? md.slice(0, at) : `${md.trimEnd()}\n\n`;
    md = `${head}## News sources (80)\n\nThe owner's list of 80 outlets (2026-09-11). Link-only: a headline, the outlet, the time and the link are shown; never the text or an image. One request per second per host, robots.txt respected, Facebook never read.\n\n${table}\n`;
  }
  writeFileSync(SOURCES_MD, md);
}

export async function runSourcesInspect(): Promise<{ itemsFound: number; itemsNew: number }> {
  const { note, sources } = readSources();
  const when = new Date().toISOString();
  const results = new Map<string, Awaited<ReturnType<typeof inspectSource>>>();
  // Different hosts in parallel; each host still gets one request per second.
  const queue = [...sources];
  const workers = Array.from({ length: 10 }, async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      const r = await inspectSource(s).catch((err: Error) => ({ status: 'no_feed' as const, rss_urls: [], notes: `inspection failed: ${err.message}` }));
      results.set(s.id, r);
      process.stdout.write(`  ${r.status.padEnd(8)} ${s.id}: ${r.notes.slice(0, 120)}\n`);
    }
  });
  await Promise.all(workers);
  const updated = sources.map((s) => ({ ...s, ...results.get(s.id)!, inspected_at: when }));
  writeSources(note, updated);
  writeSourcesMd(sourcesTable(updated, when.slice(0, 10)));
  const active = updated.filter((s) => s.status === 'active').length;
  process.stdout.write(`  ${active} of ${updated.length} sources have a usable feed\n`);
  return { itemsFound: updated.length, itemsNew: active };
}
