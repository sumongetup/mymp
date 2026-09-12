/**
 * The collectors: what runs on a schedule, what it writes, and the guards that
 * keep a broken source from emptying a feed.
 *
 * Safeguards, all of them learned from the engine this replaces:
 *   * a run that finds nothing when the last one found more than fifty is
 *     aborted without writing: a source that changes its page must not look
 *     like a quiet news day;
 *   * a member is given at most 50 new items a day by a collector; past that
 *     the rest wait for a reviewer, so one name collision cannot flood a page;
 *   * an attachment an editor has ruled on is never touched again.
 */
import { allMembers, currentPosts, districtOf } from '@/lib/data';
import { buildFeedIndex, matchItem, type FeedIndex, type FeedMp } from './matchMp';
import { RSS_SOURCES } from '../../../config/news-sources';
import { fetchFeed } from './rss';
import {
  attach, attachedToday, finishRun, lastRun, nameVariants, startRun, upsertItem,
  type FeedItemInput, type RunResult,
} from './store';

const DAILY_CAP_PER_MP = 50;

/** The member list the matcher works against, with posts and name variants. */
export async function buildIndex(): Promise<FeedIndex> {
  const variants = await nameVariants();
  const postsByMember = new Map<string, { titles: string[]; ministries: string[] }>();
  for (const p of currentPosts()) {
    if (!p.memberId) continue;
    const e = postsByMember.get(p.memberId) ?? { titles: [], ministries: [] };
    e.titles.push(p.title);
    if (p.ministryBn) e.ministries.push(p.ministryBn);
    postsByMember.set(p.memberId, e);
  }
  const mps: FeedMp[] = allMembers
    .filter((m) => !m.resignedOn)
    .map((m) => {
      const d = m.seat ? districtOf(m.seat) : null;
      const post = postsByMember.get(m.id);
      return {
        id: m.id,
        nameBn: m.nameBn,
        nameEn: m.nameEn,
        seatBn: m.seat?.nameBn ?? null,
        seatEn: m.seat?.nameEn ?? null,
        districtBn: d?.bn ?? null,
        districtEn: d?.en ?? null,
        partyBn: m.party?.nameBn ?? null,
        partyAbbr: m.party?.abbr ?? null,
        posts: post?.titles ?? [],
        ministries: post?.ministries ?? [],
        variants: variants.get(m.id) ?? [],
      };
    });
  return buildFeedIndex(mps);
}

export interface IngestCounts { found: number; stored: number; attached: number; lowConfidence: number; unmatched: number; ranOut?: boolean }

/**
 * Stores a batch of items and attaches each to the members it names. Shared by
 * every collector, so one story is matched the same way wherever it came from.
 */
export async function ingest(items: FeedItemInput[], index: FeedIndex, counts: IngestCounts, deadline?: number) {
  const givenToday = new Map<string, number>();
  for (const item of items) {
    // A serverless function has a minute; the terminal has as long as it takes.
    // Whatever is left over is picked up by the next run, which sees it as new.
    if (deadline && Date.now() > deadline) { counts.ranOut = true; break; }
    counts.found++;
    const stored = await upsertItem(item);
    if (!stored) continue;
    if (stored.isNew) counts.stored++;

    const matches = matchItem(index, { title: item.title, summary: item.summary });
    if (!matches.length) {
      counts.unmatched++;
      continue;
    }
    for (const m of matches) {
      let today = givenToday.get(m.mpId);
      if (today === undefined) {
        today = await attachedToday(m.mpId);
        givenToday.set(m.mpId, today);
      }
      // Past the cap the match is still recorded, but as something to review.
      const overCap = today >= DAILY_CAP_PER_MP;
      const result = await attach({
        itemId: stored.id,
        mpId: m.mpId,
        score: m.score,
        lowConfidence: m.lowConfidence || overCap,
        signals: overCap ? [...m.signals, { signal: 'daily-cap', points: 0, detail: `${today} already today` }] : m.signals,
      });
      if (result === 'new') {
        counts.attached++;
        givenToday.set(m.mpId, today + 1);
        if (m.lowConfidence || overCap) counts.lowConfidence++;
      }
    }
  }
}

export interface CollectorOptions {
  trigger?: string;
  dryRun?: boolean;
  /** Stop storing after this many milliseconds and leave the rest for the next run. */
  budgetMs?: number;
}

/** Every configured feed, once. */
export async function runRssCollector(opts: CollectorOptions = {}): Promise<RunResult & { runId?: number }> {
  const run = opts.dryRun ? null : await startRun('rss', opts.trigger ?? 'manual');
  const errors: { source: string; message: string }[] = [];
  const detail: Record<string, number> = {};
  const index = await buildIndex();
  const counts: IngestCounts = { found: 0, stored: 0, attached: 0, lowConfidence: 0, unmatched: 0 };

  const batches = await Promise.all(
    RSS_SOURCES.map(async (source) => {
      const items: FeedItemInput[] = [];
      for (const url of source.rss ?? []) {
        const { items: got, error } = await fetchFeed(url);
        if (error) {
          errors.push({ source: source.key, message: `${url}: ${error}` });
          continue;
        }
        for (const it of got) {
          if (!it.publishedAt) continue;
          items.push({
            type: 'news',
            title: it.title,
            url: it.url,
            summary: it.summary,
            outletName: source.nameBn,
            outletId: source.key,
            publishedAt: it.publishedAt,
            source: 'rss',
          });
        }
      }
      detail[source.key] = items.length;
      return items;
    }),
  );
  const items = batches.flat();

  // A collector that suddenly finds nothing has broken, not gone quiet.
  const previous = opts.dryRun ? null : await lastRun('rss');
  if (!items.length && (previous?.items_found ?? 0) > 50) {
    const result: RunResult = {
      status: 'aborted', itemsFound: 0, itemsNew: 0, itemsAttached: 0, unmatched: 0, lowConfidence: 0,
      errors: [...errors, { source: 'rss', message: `no items at all, while the last run found ${previous!.items_found}: nothing was written` }],
      detail,
    };
    if (run) await finishRun(run, result);
    return result;
  }

  if (!opts.dryRun) await ingest(items, index, counts, opts.budgetMs ? Date.now() + opts.budgetMs : undefined);
  else counts.found = items.length;

  const result: RunResult = {
    status: errors.length === RSS_SOURCES.length ? 'failed' : 'ok',
    itemsFound: counts.found,
    itemsNew: counts.stored,
    itemsAttached: counts.attached,
    unmatched: counts.unmatched,
    lowConfidence: counts.lowConfidence,
    errors: counts.ranOut
      ? [...errors, { source: 'rss', message: `stopped at the time budget with ${items.length - counts.found} items left; the next run takes them` }]
      : errors,
    detail,
  };
  if (run) await finishRun(run, result);
  return { ...result, runId: run?.id };
}
