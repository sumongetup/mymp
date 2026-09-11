/**
 * Polite HTTP for news sources: at most one request per second per host (or
 * fewer, when the host's robots.txt sets a Crawl-delay),
 * our bot string on every request, a timeout and a size cap, and an explicit
 * signal when a site answers with a bot challenge (Cloudflare and the like)
 * so callers stop instead of retrying. Nothing here ever tries to get past a
 * challenge.
 */
import { parseRobots, robotsAllows, robotsCrawlDelay, type Robots } from './robots';

export const BOT_UA = process.env.SCRAPER_USER_AGENT ?? 'MyMPBot/1.0 (+https://mymp.bd/somporke)';
const MIN_GAP_MS = 1000;
const MAX_BYTES = 5 * 1024 * 1024;

const nextSlot = new Map<string, number>();
/** Per-host gap from robots.txt Crawl-delay, once that file has been read. */
const hostGap = new Map<string, number>();
async function waitForHost(host: string) {
  const now = Date.now();
  const slot = Math.max(now, nextSlot.get(host) ?? 0);
  nextSlot.set(host, slot + Math.max(MIN_GAP_MS, hostGap.get(host) ?? 0));
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
}

export interface PoliteResponse {
  url: string;
  status: number;
  contentType: string;
  text: string;
  /** True when the site served a bot challenge instead of content. */
  challenged: boolean;
}

export async function politeGet(url: string, accept = '*/*', timeoutMs = 20000): Promise<PoliteResponse> {
  const u = new URL(url);
  await waitForHost(u.host);
  const res = await fetch(u, {
    headers: { 'user-agent': BOT_UA, accept, 'accept-language': 'bn,en;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const contentType = res.headers.get('content-type') ?? '';
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }
  const text = new TextDecoder('utf-8').decode(Buffer.concat(chunks));
  const challenged =
    res.headers.get('cf-mitigated') === 'challenge' ||
    ((res.status === 403 || res.status === 503 || res.status === 429) && /just a moment|cf-chl|challenge-platform|attention required|captcha/i.test(text));
  return { url: res.url || url, status: res.status, contentType, text, challenged };
}

const robotsCache = new Map<string, Promise<Robots | 'deny'>>();

/** robots.txt for a host, cached per run. 'deny' means the file could not be read (5xx or network) and nothing may be fetched. */
export function robotsFor(origin: string): Promise<Robots | 'deny'> {
  let p = robotsCache.get(origin);
  if (!p) {
    p = politeGet(`${origin}/robots.txt`, 'text/plain,*/*')
      .then((r): Robots | 'deny' => {
        if (r.challenged || r.status >= 500) return 'deny';
        if (r.status >= 400) return { groups: [], sitemaps: [] };
        const robots = parseRobots(r.text);
        const delay = robotsCrawlDelay(robots, BOT_UA);
        if (delay) hostGap.set(new URL(origin).host, delay * 1000);
        return robots;
      })
      .catch((): 'deny' => 'deny');
    robotsCache.set(origin, p);
  }
  return p;
}

/** Whether our bot may fetch this URL according to its host's robots.txt. */
export async function mayFetch(url: string): Promise<{ ok: boolean; why: string }> {
  const u = new URL(url);
  const robots = await robotsFor(u.origin);
  if (robots === 'deny') return { ok: false, why: `robots.txt of ${u.host} unreadable (5xx, challenge or network)` };
  const path = `${u.pathname}${u.search}`;
  return robotsAllows(robots, BOT_UA, path) ? { ok: true, why: 'allowed by robots.txt' } : { ok: false, why: `robots.txt of ${u.host} disallows ${path}` };
}
