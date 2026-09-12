/**
 * The two collectors that cost money or quota: YouTube, and the search that
 * reaches the outlets with no feed.
 *
 * Both work their way through the 348 members a slice at a time rather than
 * all at once, so a run is small, predictable and inside its quota. Which
 * members a run takes is decided by the clock: the day is divided into slots
 * and each member belongs to one, with the members who hold a government or
 * House post taken twice as often as the rest.
 */
import { allMembers, currentPosts, districtOf, getMemberById } from '@/lib/data';
import { matchItem } from './matchMp';
import { buildIndex, ingest, type IngestCounts } from './collect';
import { searchProvider } from './searchProvider';
import { SEARCH_ONLY_SOURCES } from '../../../config/news-sources';
import { TRUSTED_CHANNELS } from '../../../config/feed-matching';
import { attach, finishRun, startRun, upsertItem, type FeedItemInput, type RunResult } from './store';

const YOUTUBE_KEY = () => process.env.YOUTUBE_API_KEY;
/**
 * search.list costs 100 units, and a default key gets 10,000 a day: a hundred
 * searches, for 348 members. So a run takes four members, once an hour, which
 * spends 9,600 units a day and walks the whole House in about three and a half
 * days. Members holding a post appear twice in the cycle, so they come round
 * twice as often. YOUTUBE_MEMBERS_PER_RUN raises it if the key's quota is.
 */
const SEARCH_COST = 100;
const PER_RUN = () => Math.max(1, Number(process.env.YOUTUBE_MEMBERS_PER_RUN ?? 4));

interface Target {
  id: string;
  nameBn: string | null;
  seatBn: string | null;
  priority: boolean;
}

/** Everyone, with the post holders marked so they come round twice as often. */
function targets(): Target[] {
  const withPost = new Set(currentPosts().map((p) => p.memberId).filter(Boolean) as string[]);
  return allMembers
    .filter((m) => !m.resignedOn)
    .map((m) => ({ id: m.id, nameBn: m.nameBn, seatBn: m.seat?.nameBn ?? null, priority: withPost.has(m.id) }));
}

/**
 * The few members this run takes, walking the same cycle every time so that
 * over a few days everyone is covered and nobody twice in a row. A member who
 * holds a post sits in the cycle twice.
 */
export function sliceFor(list: Target[], perRun: number, tick: number): Target[] {
  if (!list.length) return [];
  const cycle = [...list, ...list.filter((t) => t.priority)];
  const start = (tick * perRun) % cycle.length;
  const out: Target[] = [];
  for (let i = 0; out.length < perRun && i < cycle.length; i++) {
    const t = cycle[(start + i) % cycle.length]!;
    if (!out.some((x) => x.id === t.id)) out.push(t);
  }
  return out;
}

/** Which turn of the cycle it is: one per hour for videos, one per half hour for search. */
const tickNow = (minutes: number) => Math.floor(Date.now() / (minutes * 60_000));

/* ---------------------------------------------------------------- YouTube */

interface YtItem {
  id: { videoId?: string };
  snippet: { title: string; description: string; publishedAt: string; channelId: string; channelTitle: string; thumbnails?: { high?: { url: string } } };
}

/**
 * Videos for a slice of members. One search.list per member, ordered by date,
 * nothing older than the member's feed start. The quota used is recorded on
 * the run, so the admin can see how close to the ceiling a day is.
 */
export async function runYoutubeCollector(opts: { trigger?: string; perRun?: number; since?: string } = {}): Promise<RunResult & { runId?: number }> {
  const key = YOUTUBE_KEY();
  const run = await startRun('youtube', opts.trigger ?? 'manual');
  const counts: IngestCounts = { found: 0, stored: 0, attached: 0, lowConfidence: 0, unmatched: 0 };
  const errors: { source: string; message: string }[] = [];

  if (!key) {
    const result: RunResult = {
      status: 'aborted', itemsFound: 0, itemsNew: 0, itemsAttached: 0, unmatched: 0, lowConfidence: 0, quotaUsed: 0,
      errors: [{ source: 'youtube', message: 'YOUTUBE_API_KEY is not set, so no video was fetched' }],
    };
    await finishRun(run, result);
    return result;
  }

  const perRun = opts.perRun ?? PER_RUN();
  const slice = sliceFor(targets(), perRun, tickNow(60));
  const index = await buildIndex();
  const trusted = new Set(TRUSTED_CHANNELS.map((c) => c.id));
  let quota = 0;
  const items: FeedItemInput[] = [];
  const published = opts.since ?? new Date(Date.now() - 30 * 86_400_000).toISOString();

  for (const t of slice) {
    if (!t.nameBn) continue;
    const q = [t.nameBn, t.seatBn].filter(Boolean).join(' ');
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', q);
    url.searchParams.set('type', 'video');
    url.searchParams.set('order', 'date');
    url.searchParams.set('maxResults', '10');
    url.searchParams.set('relevanceLanguage', 'bn');
    url.searchParams.set('publishedAfter', published);
    url.searchParams.set('key', key);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      quota += SEARCH_COST;
      if (!res.ok) {
        const body = await res.text();
        errors.push({ source: 'youtube', message: `${t.nameBn}: ${res.status} ${body.slice(0, 120)}` });
        // A quota error ends the run; hammering it only wastes the rest of the day.
        if (res.status === 403 && /quota/i.test(body)) break;
        continue;
      }
      const json = (await res.json()) as { items?: YtItem[] };
      for (const v of json.items ?? []) {
        if (!v.id.videoId) continue;
        items.push({
          type: 'video',
          title: v.snippet.title,
          url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
          summary: v.snippet.description?.slice(0, 600) ?? null,
          outletName: v.snippet.channelTitle,
          outletId: trusted.has(v.snippet.channelId) ? 'youtube-trusted' : 'youtube',
          channelId: v.snippet.channelId,
          thumbnailUrl: v.snippet.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${v.id.videoId}/hqdefault.jpg`,
          publishedAt: new Date(v.snippet.publishedAt).toISOString(),
          source: 'youtube',
        });
      }
    } catch (e) {
      errors.push({ source: 'youtube', message: `${t.nameBn}: ${(e as Error).message}` });
    }
  }

  await ingest(items, index, counts);
  const result: RunResult = {
    status: errors.length && !counts.found ? 'failed' : 'ok',
    itemsFound: counts.found,
    itemsNew: counts.stored,
    itemsAttached: counts.attached,
    unmatched: counts.unmatched,
    lowConfidence: counts.lowConfidence,
    quotaUsed: quota,
    errors,
    detail: { members: slice.length, priority: slice.filter((t) => t.priority).length, searches: quota / SEARCH_COST },
  };
  await finishRun(run, result);
  return { ...result, runId: run.id };
}

/* ---------------------------------------------------------------- search */

/**
 * The outlets with no feed, reached by asking a search engine for each
 * member's name and constituency. 348 members are spread across the six-hour
 * window, about one a minute, so no provider sees a burst.
 */
export async function runSearchCollector(opts: { trigger?: string; perRun?: number } = {}): Promise<RunResult & { runId?: number }> {
  const provider = searchProvider();
  const run = await startRun('search', opts.trigger ?? 'manual');
  const counts: IngestCounts = { found: 0, stored: 0, attached: 0, lowConfidence: 0, unmatched: 0 };
  const errors: { source: string; message: string }[] = [];

  if (!provider) {
    const result: RunResult = {
      status: 'aborted', itemsFound: 0, itemsNew: 0, itemsAttached: 0, unmatched: 0, lowConfidence: 0,
      errors: [{ source: 'search', message: 'FEED_SEARCH_KEY is not set, so the outlets without a feed were not searched' }],
    };
    await finishRun(run, result);
    return result;
  }

  // A search provider is billed per call, not per quota unit, so this one takes
  // more members at a time: twelve every half hour is a pass a day.
  const perRun = opts.perRun ?? 12;
  const slice = sliceFor(targets(), perRun, tickNow(30));
  const index = await buildIndex();
  const sites = SEARCH_ONLY_SOURCES.map((s) => new URL(s.homepage).hostname.replace(/^www\./, ''));
  const items: FeedItemInput[] = [];

  for (const t of slice) {
    if (!t.nameBn) continue;
    // "নাম" seat (site:… OR site:…) keeps the search on the outlets we cannot read.
    const q = `"${t.nameBn}" ${t.seatBn ?? ''} (${sites.map((s) => `site:${s}`).join(' OR ')})`.trim();
    try {
      const hits = await provider.search(q, { limit: 20 });
      for (const h of hits) {
        items.push({
          type: 'news',
          title: h.title,
          url: h.url,
          summary: h.summary,
          outletName: h.outletName ?? SEARCH_ONLY_SOURCES.find((s) => h.url.includes(new URL(s.homepage).hostname.replace(/^www\./, '')))?.nameBn ?? null,
          outletId: SEARCH_ONLY_SOURCES.find((s) => h.url.includes(new URL(s.homepage).hostname.replace(/^www\./, '')))?.key ?? null,
          publishedAt: h.publishedAt ?? new Date().toISOString(),
          source: 'search',
        });
      }
    } catch (e) {
      errors.push({ source: 'search', message: `${t.nameBn}: ${(e as Error).message}` });
    }
    // About one member a minute, so the provider sees a trickle.
    await new Promise((r) => setTimeout(r, 400));
  }

  await ingest(items, index, counts);
  const result: RunResult = {
    status: errors.length === slice.length ? 'failed' : 'ok',
    itemsFound: counts.found,
    itemsNew: counts.stored,
    itemsAttached: counts.attached,
    unmatched: counts.unmatched,
    lowConfidence: counts.lowConfidence,
    errors,
    detail: { members: slice.length, provider: provider.name },
  };
  await finishRun(run, result);
  return { ...result, runId: run.id };
}

/* ---------------------------------------------------------------- parliament notices */

/**
 * Notices and gazette items that name a member. They are already synced into
 * data/activity.json for the profile's own notice list; here they become feed
 * items too, so one page shows everything about a member in date order.
 */
export async function runPressCollector(opts: { trigger?: string } = {}): Promise<RunResult & { runId?: number }> {
  const run = await startRun('press', opts.trigger ?? 'manual');
  const index = await buildIndex();
  const counts: IngestCounts = { found: 0, stored: 0, attached: 0, lowConfidence: 0, unmatched: 0 };
  const { activity } = await import('@/lib/activity');
  const notices = activity.notices.filter((n) => n.pdfUrl && n.date && n.titleBn);
  const items: FeedItemInput[] = notices.map((n) => ({
    type: 'press' as const,
    title: n.titleBn!,
    url: n.pdfUrl!,
    summary: null,
    outletName: 'বাংলাদেশ জাতীয় সংসদ',
    outletId: 'parliament',
    publishedAt: new Date(`${n.date}T10:00:00+06:00`).toISOString(),
    source: 'parliament' as const,
  }));
  // A notice names its member by seat, which the matcher already reads, but the
  // sync has also matched many of them by hand: those attachments come first.
  await ingest(items, index, counts);
  for (const n of notices) {
    if (!n.memberId) continue;
    const stored = await upsertItem({
      type: 'press', title: n.titleBn!, url: n.pdfUrl!, summary: null,
      outletName: 'বাংলাদেশ জাতীয় সংসদ', outletId: 'parliament',
      publishedAt: new Date(`${n.date}T10:00:00+06:00`).toISOString(), source: 'parliament',
    });
    if (!stored) continue;
    const already = matchItem(index, { title: n.titleBn! }).some((m) => m.mpId === n.memberId);
    if (already) continue;
    const r = await attach({ itemId: stored.id, mpId: n.memberId, score: 100, lowConfidence: false, signals: [{ signal: 'parliament-notice', points: 100 }] });
    if (r === 'new') counts.attached++;
  }
  const result: RunResult = {
    status: 'ok',
    itemsFound: counts.found,
    itemsNew: counts.stored,
    itemsAttached: counts.attached,
    unmatched: counts.unmatched,
    lowConfidence: counts.lowConfidence,
    errors: [],
  };
  await finishRun(run, result);
  return { ...result, runId: run.id };
}

/** Used by the admin to say what is configured and what is not. */
export const collectorReadiness = () => ({
  rss: true,
  youtube: !!YOUTUBE_KEY(),
  search: !!searchProvider(),
  press: true,
  memberCount: allMembers.filter((m) => !m.resignedOn).length,
  district: (id: string) => districtOf(getMemberById(id)?.seat ?? null)?.bn ?? null,
});
