/**
 * Everything the feed reads and writes in Supabase, in one place.
 *
 * It talks PostgREST with the service key rather than the admin's Supabase
 * client, because the same functions run inside a route handler and inside
 * scripts/feed-collect.ts under plain Node, where `server-only` cannot be
 * imported. No browser ever holds these keys: the public feed is served by the
 * site's own route handler.
 */
import { createHash } from 'node:crypto';
import { restDb, DbError, type Db } from '@/lib/posts/db';

export type FeedType = 'news' | 'video' | 'press' | 'social';
export type FeedSource = 'rss' | 'search' | 'youtube' | 'engine' | 'parliament' | 'manual';
export type AttachStatus = 'visible' | 'hidden' | 'removed';

export interface FeedItemInput {
  type: FeedType;
  title: string;
  url: string;
  summary?: string | null;
  outletName?: string | null;
  outletId?: string | null;
  channelId?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  publishedAt: string;
  source: FeedSource;
}

export interface AlsoIn { outletName: string | null; url: string }

export interface FeedItemRow {
  id: number;
  type: FeedType;
  title: string;
  url: string;
  canonical_url: string;
  summary: string | null;
  outlet_name: string | null;
  outlet_id: string | null;
  channel_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  published_at: string;
  source: FeedSource;
  also_in: AlsoIn[];
}

/** Tracking parameters and AMP paths make one story look like many. */
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = '';
    u.hostname = u.hostname.replace(/^www\./, '').toLowerCase();
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|ref_src|igshid|mc_cid|mc_eid|__twitter)/i.test(key)) u.searchParams.delete(key);
    }
    u.pathname = u.pathname.replace(/\/amp\/?$/, '/').replace(/\.amp$/, '').replace(/\/+$/, '') || '/';
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.toString();
  } catch {
    return raw.trim();
  }
}

/** Same story, same words: used to tell an edit at the source from a new item. */
export const contentHash = (title: string, summary?: string | null) =>
  createHash('sha256').update(`${title.trim()}\n${(summary ?? '').trim()}`).digest('hex');

/** Headlines compare past punctuation and spacing, for the 48-hour syndication check. */
export const headlineKey = (title: string) =>
  title.normalize('NFC').replace(/[^\p{L}\p{M}\p{N}]+/gu, '').toLowerCase();

function db(): Db {
  const d = restDb();
  if (!d) throw new Error('Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  return d;
}

const q = (v: string | number) => encodeURIComponent(String(v));

export interface UpsertResult {
  id: number;
  isNew: boolean;
  /** True when the source changed the headline or summary since we stored it. */
  edited: boolean;
}

/**
 * Stores one item, or recognises one we already have. A story carried by
 * several outlets keeps the first row and lists the others in also_in, so a
 * member's page shows it once.
 */
export async function upsertItem(input: FeedItemInput): Promise<UpsertResult | null> {
  const canonical = canonicalUrl(input.url);
  const hash = contentHash(input.title, input.summary);
  const sb = db();

  const [existing] = await sb.get<{ id: number; content_hash: string | null }[]>(
    `feed_items?canonical_url=eq.${q(canonical)}&select=id,content_hash&limit=1`,
  );
  if (existing) {
    if (existing.content_hash !== hash) {
      await sb.patch(`feed_items?id=eq.${existing.id}`, {
        title: input.title,
        summary: input.summary ?? null,
        content_hash: hash,
        updated_at: new Date().toISOString(),
      });
      return { id: existing.id, isNew: false, edited: true };
    }
    return { id: existing.id, isNew: false, edited: false };
  }

  // The same headline from another outlet within two days is the same story.
  const since = new Date(new Date(input.publishedAt).getTime() - 48 * 3600 * 1000).toISOString();
  const until = new Date(new Date(input.publishedAt).getTime() + 48 * 3600 * 1000).toISOString();
  const near = await sb.get<{ id: number; title: string; also_in: AlsoIn[] | null }[]>(
    `feed_items?type=eq.${input.type}&published_at=gte.${q(since)}&published_at=lte.${q(until)}&select=id,title,also_in&limit=300`,
  );
  const key = headlineKey(input.title);
  const twin = near.find((n) => headlineKey(n.title) === key);
  if (twin) {
    const alsoIn = [...(twin.also_in ?? [])];
    if (!alsoIn.some((a) => canonicalUrl(a.url) === canonical)) {
      alsoIn.push({ outletName: input.outletName ?? null, url: input.url });
      await sb.patch(`feed_items?id=eq.${twin.id}`, { also_in: alsoIn });
    }
    return { id: twin.id, isNew: false, edited: false };
  }

  try {
    const [row] = await sb.insert<{ id: number }>('feed_items', {
      type: input.type,
      title: input.title,
      url: input.url,
      canonical_url: canonical,
      summary: input.summary ?? null,
      outlet_name: input.outletName ?? null,
      outlet_id: input.outletId ?? null,
      channel_id: input.channelId ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      duration_seconds: input.durationSeconds ?? null,
      published_at: input.publishedAt,
      source: input.source,
      content_hash: hash,
    });
    return row ? { id: row.id, isNew: true, edited: false } : null;
  } catch (e) {
    // Another run inserted the same address a moment ago.
    if (e instanceof DbError && /duplicate key|23505/.test(e.body)) {
      const [again] = await sb.get<{ id: number }[]>(`feed_items?canonical_url=eq.${q(canonical)}&select=id&limit=1`);
      return again ? { id: again.id, isNew: false, edited: false } : null;
    }
    throw e;
  }
}

export interface AttachInput {
  itemId: number;
  mpId: string;
  score: number;
  lowConfidence: boolean;
  signals: unknown;
  attachedBy?: string;
}

/**
 * Links an item to a member. An attachment an editor has already ruled on is
 * left exactly as it is: "removed" means never again, on this member's page.
 */
export async function attach(input: AttachInput): Promise<'new' | 'kept'> {
  const sb = db();
  const [existing] = await sb.get<{ status: string }[]>(
    `feed_item_mps?feed_item_id=eq.${input.itemId}&mp_id=eq.${q(input.mpId)}&select=status&limit=1`,
  );
  if (existing) return 'kept';
  await sb.insert('feed_item_mps', {
    feed_item_id: input.itemId,
    mp_id: input.mpId,
    score: input.score,
    low_confidence: input.lowConfidence,
    signals: input.signals,
    attached_by: input.attachedBy ?? 'system',
  });
  return 'new';
}

/** How many items a member has been given today, for the flood cap. */
export async function attachedToday(mpId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const rows = await db().get<{ feed_item_id: number }[]>(
    `feed_item_mps?mp_id=eq.${q(mpId)}&attached_at=gte.${q(start.toISOString())}&select=feed_item_id&limit=200`,
  );
  return rows.length;
}

export interface RunHandle { id: number }

export async function startRun(collector: string, trigger: string): Promise<RunHandle> {
  const [row] = await db().insert<{ id: number }>('feed_runs', { collector, trigger, status: 'running' });
  return { id: row!.id };
}

export interface RunResult {
  status: 'ok' | 'failed' | 'aborted';
  itemsFound: number;
  itemsNew: number;
  itemsAttached: number;
  unmatched: number;
  lowConfidence: number;
  quotaUsed?: number;
  errors: { source: string; message: string }[];
  detail?: unknown;
}

export async function finishRun(run: RunHandle, r: RunResult) {
  await db().patch(`feed_runs?id=eq.${run.id}`, {
    finished_at: new Date().toISOString(),
    status: r.status,
    items_found: r.itemsFound,
    items_new: r.itemsNew,
    items_attached: r.itemsAttached,
    unmatched: r.unmatched,
    low_confidence: r.lowConfidence,
    quota_used: r.quotaUsed ?? 0,
    errors: r.errors,
    detail: r.detail ?? null,
  });
}

/** What the last finished run of this collector found, for the empty-run guard. */
export async function lastRun(collector: string): Promise<{ items_found: number; status: string } | null> {
  const rows = await db().get<{ items_found: number; status: string }[]>(
    `feed_runs?collector=eq.${q(collector)}&status=neq.running&select=items_found,status&order=started_at.desc&limit=1`,
  );
  return rows[0] ?? null;
}

export async function nameVariants(): Promise<Map<string, { variant: string; weight: number }[]>> {
  const out = new Map<string, { variant: string; weight: number }[]>();
  const sb = db();
  for (let offset = 0; ; offset += 1000) {
    const rows = await sb.get<{ mp_id: string; variant: string; weight: string }[]>(
      `mp_name_variants?select=mp_id,variant,weight&order=id&limit=1000&offset=${offset}`,
    );
    for (const r of rows) {
      const list = out.get(r.mp_id) ?? [];
      list.push({ variant: r.variant, weight: Number(r.weight) });
      out.set(r.mp_id, list);
    }
    if (rows.length < 1000) break;
  }
  return out;
}

export interface FeedSettings { mpId: string; feedStartAt: string | null; needsConfirming: boolean }

export async function feedSettings(): Promise<Map<string, FeedSettings>> {
  const rows = await db().get<{ mp_id: string; feed_start_at: string | null; nomination_filed_at: string | null; needs_confirming: boolean }[]>(
    'mp_feed_settings?select=mp_id,feed_start_at,nomination_filed_at,needs_confirming&limit=500',
  );
  const out = new Map<string, FeedSettings>();
  for (const r of rows) {
    out.set(r.mp_id, { mpId: r.mp_id, feedStartAt: r.feed_start_at ?? r.nomination_filed_at, needsConfirming: Boolean(r.needs_confirming) });
  }
  return out;
}

/* ---------------------------------------------------------------- reading a member's feed */

export interface FeedEntry {
  id: number;
  type: FeedType;
  title: string;
  url: string;
  summary: string | null;
  outletName: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  publishedAt: string;
  alsoIn: AlsoIn[];
  pinned: boolean;
  lowConfidence: boolean;
}

interface JoinRow {
  feed_item_id: number;
  pinned: boolean;
  pinned_until: string | null;
  low_confidence: boolean;
  feed_items: FeedItemRow | null;
}

const SELECT_ITEM = 'feed_item_id,pinned,pinned_until,low_confidence,feed_items(id,type,title,url,summary,outlet_name,thumbnail_url,duration_seconds,published_at,also_in)';

const toEntry = (r: JoinRow): FeedEntry | null => {
  const i = r.feed_items;
  if (!i) return null;
  const pinned = r.pinned && (!r.pinned_until || new Date(r.pinned_until) > new Date());
  return {
    id: i.id,
    type: i.type,
    title: i.title,
    url: i.url,
    summary: i.summary,
    outletName: i.outlet_name,
    thumbnailUrl: i.thumbnail_url,
    durationSeconds: i.duration_seconds,
    publishedAt: i.published_at,
    alsoIn: i.also_in ?? [],
    pinned,
    lowConfidence: r.low_confidence,
  };
};

/** One member's visible items for a month ("2026-09"), newest first. */
export async function monthItems(mpId: string, month: string, type?: FeedType): Promise<FeedEntry[]> {
  const from = `${month}-01T00:00:00+06:00`;
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y! + 1}-01` : `${y}-${String(m! + 1).padStart(2, '0')}`;
  const to = `${next}-01T00:00:00+06:00`;
  const typeFilter = type ? `&feed_items.type=eq.${type}` : '';
  const rows = await db().get<JoinRow[]>(
    `feed_item_mps?mp_id=eq.${q(mpId)}&status=eq.visible&select=${SELECT_ITEM}` +
      `&feed_items.published_at=gte.${q(from)}&feed_items.published_at=lt.${q(to)}${typeFilter}` +
      '&order=feed_items(published_at).desc&limit=300',
  );
  return rows.map(toEntry).filter((x): x is FeedEntry => !!x);
}

/** The items pinned to the top of a member's feed. */
export async function pinnedItems(mpId: string): Promise<FeedEntry[]> {
  const rows = await db().get<JoinRow[]>(
    `feed_item_mps?mp_id=eq.${q(mpId)}&status=eq.visible&pinned=is.true&select=${SELECT_ITEM}&order=feed_items(published_at).desc&limit=20`,
  );
  return rows.map(toEntry).filter((x): x is FeedEntry => !!x && x.pinned);
}

export interface MonthCount { month: string; total: number; news: number; video: number }

/**
 * How many items a member has in each month. Read in one go and counted here,
 * because PostgREST cannot group, and a member's whole feed is small.
 */
export async function monthCounts(mpId: string): Promise<{ months: MonthCount[]; total: number; news: number; video: number; outlets: string[] }> {
  const rows = await db().get<{ feed_items: { published_at: string; type: FeedType; outlet_name: string | null } | null }[]>(
    `feed_item_mps?mp_id=eq.${q(mpId)}&status=eq.visible&select=feed_items(published_at,type,outlet_name)&limit=5000`,
  );
  const by = new Map<string, MonthCount>();
  const outlets = new Set<string>();
  let total = 0;
  let news = 0;
  let video = 0;
  for (const r of rows) {
    const i = r.feed_items;
    if (!i) continue;
    // Months are Bangladesh months: an item published at 1am Dhaka belongs to that day.
    const month = new Date(i.published_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7);
    const e = by.get(month) ?? { month, total: 0, news: 0, video: 0 };
    e.total++;
    if (i.type === 'video') e.video++; else e.news++;
    by.set(month, e);
    total++;
    if (i.type === 'video') video++; else news++;
    if (i.outlet_name) outlets.add(i.outlet_name);
  }
  return {
    months: [...by.values()].sort((a, b) => b.month.localeCompare(a.month)),
    total,
    news,
    video,
    outlets: [...outlets].sort((a, b) => a.localeCompare(b, 'bn')),
  };
}
