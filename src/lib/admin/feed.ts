/**
 * What the admin does to the feed: hide an item on one member's page, remove
 * it everywhere, pin it, attach one by hand, add a name variant.
 *
 * Nothing is deleted. Hiding and removing are statuses on the join row, so an
 * item that was wrong for one member stays right for another, and a removed
 * match is never made again by a later run. Every action is written to the
 * audit log and, where it teaches the matcher something, to
 * feed_match_feedback.
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import { audit, type Actor } from './store';
import type { AttachStatus, FeedType } from '@/lib/feed/store';

export interface AdminFeedRow {
  feed_item_id: number;
  mp_id: string;
  score: number;
  low_confidence: boolean;
  signals: { signal: string; points: number; detail?: string }[];
  status: AttachStatus;
  pinned: boolean;
  pinned_until: string | null;
  attached_by: string;
  attached_at: string;
  hide_reason: string | null;
  feed_items: {
    id: number;
    type: FeedType;
    title: string;
    url: string;
    summary: string | null;
    outlet_name: string | null;
    thumbnail_url: string | null;
    published_at: string;
    source: string;
  } | null;
}

export interface FeedQuery {
  mpId?: string;
  outlet?: string;
  type?: string;
  status?: string;
  lowOnly?: boolean;
  from?: string;
  to?: string;
  limit?: number;
}

const SELECT = 'feed_item_id,mp_id,score,low_confidence,signals,status,pinned,pinned_until,attached_by,attached_at,hide_reason,' +
  'feed_items!inner(id,type,title,url,summary,outlet_name,thumbnail_url,published_at,source)';

/** The admin list: newest attachment first, filtered the way the page asks. */
export async function listFeed(q: FeedQuery): Promise<AdminFeedRow[]> {
  let query = supabaseAdmin()
    .from('feed_item_mps')
    .select(SELECT)
    .order('attached_at', { ascending: false })
    .limit(q.limit ?? 100);
  if (q.mpId) query = query.eq('mp_id', q.mpId);
  if (q.status) query = query.eq('status', q.status);
  if (q.lowOnly) query = query.eq('low_confidence', true).eq('status', 'visible');
  if (q.type) query = query.eq('feed_items.type', q.type);
  if (q.outlet) query = query.eq('feed_items.outlet_name', q.outlet);
  if (q.from) query = query.gte('feed_items.published_at', `${q.from}T00:00:00+06:00`);
  if (q.to) query = query.lte('feed_items.published_at', `${q.to}T23:59:59+06:00`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AdminFeedRow[];
}

export async function feedOutlets(): Promise<string[]> {
  const { data } = await supabaseAdmin().from('feed_items').select('outlet_name').limit(2000);
  return [...new Set((data ?? []).map((r) => r.outlet_name as string).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'bn'));
}

export interface FeedCounts { total: number; visible: number; hidden: number; removed: number; review: number }

export async function feedCounts(): Promise<FeedCounts> {
  const sb = supabaseAdmin();
  const one = async (build: (q: ReturnType<typeof sb.from>) => unknown) => {
    const q = build(sb.from('feed_item_mps')) as { count: number | null };
    const { count } = (await q) as unknown as { count: number | null };
    return count ?? 0;
  };
  const [total, visible, hidden, removed, review] = await Promise.all([
    one((q) => (q as never as { select: (s: string, o: object) => unknown }).select('feed_item_id', { count: 'exact', head: true })),
    one((q) => (q as never as { select: (s: string, o: object) => { eq: (a: string, b: string) => unknown } }).select('feed_item_id', { count: 'exact', head: true }).eq('status', 'visible')),
    one((q) => (q as never as { select: (s: string, o: object) => { eq: (a: string, b: string) => unknown } }).select('feed_item_id', { count: 'exact', head: true }).eq('status', 'hidden')),
    one((q) => (q as never as { select: (s: string, o: object) => { eq: (a: string, b: string) => unknown } }).select('feed_item_id', { count: 'exact', head: true }).eq('status', 'removed')),
    one((q) => (q as never as { select: (s: string, o: object) => { eq: (a: string, b: boolean) => { eq: (c: string, d: string) => unknown } } }).select('feed_item_id', { count: 'exact', head: true }).eq('low_confidence', true).eq('status', 'visible')),
  ]);
  return { total, visible, hidden, removed, review };
}

/** Hide on one member's page, or remove so no run attaches it again. */
export async function setAttachmentStatus(a: Actor, itemId: number, mpId: string, status: AttachStatus, reason: string | null) {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from('feed_item_mps')
    .update({
      status,
      hidden_by: status === 'visible' ? null : a.email,
      hidden_at: status === 'visible' ? null : new Date().toISOString(),
      hide_reason: status === 'visible' ? null : reason,
      // A decision settles the item: it is no longer waiting for review.
      low_confidence: false,
    })
    .eq('feed_item_id', itemId)
    .eq('mp_id', mpId);
  if (error) throw error;
  await audit(a, { action: `feed.${status}`, entity_type: 'feed_item', entity_id: String(itemId), field: mpId, old_value: null, new_value: reason });
  if (status !== 'visible') await recordFeedback(itemId, mpId, 'reject', a.email);
}

/** Keep a match the matcher was unsure about. */
export async function confirmAttachment(a: Actor, itemId: number, mpId: string) {
  const { error } = await supabaseAdmin()
    .from('feed_item_mps')
    .update({ low_confidence: false, status: 'visible' })
    .eq('feed_item_id', itemId)
    .eq('mp_id', mpId);
  if (error) throw error;
  await audit(a, { action: 'feed.confirm', entity_type: 'feed_item', entity_id: String(itemId), field: mpId, old_value: null, new_value: null });
  await recordFeedback(itemId, mpId, 'confirm', a.email);
}

export async function setPinned(a: Actor, itemId: number, mpId: string, pinned: boolean, until: string | null) {
  const { error } = await supabaseAdmin()
    .from('feed_item_mps')
    .update({ pinned, pinned_until: pinned ? until : null })
    .eq('feed_item_id', itemId)
    .eq('mp_id', mpId);
  if (error) throw error;
  await audit(a, { action: pinned ? 'feed.pin' : 'feed.unpin', entity_type: 'feed_item', entity_id: String(itemId), field: mpId, old_value: null, new_value: until });
}

/** An editor gives an item to a member the matcher did not choose. */
export async function attachByHand(a: Actor, itemId: number, mpId: string) {
  const sb = supabaseAdmin();
  const { data: existing } = await sb.from('feed_item_mps').select('mp_id').eq('feed_item_id', itemId).eq('mp_id', mpId).maybeSingle();
  if (existing) {
    await sb.from('feed_item_mps').update({ status: 'visible', low_confidence: false }).eq('feed_item_id', itemId).eq('mp_id', mpId);
  } else {
    await sb.from('feed_item_mps').insert({
      feed_item_id: itemId, mp_id: mpId, score: 100, low_confidence: false, signals: [{ signal: 'by-hand', points: 100 }], attached_by: a.email,
    });
  }
  await audit(a, { action: 'feed.attach', entity_type: 'feed_item', entity_id: String(itemId), field: mpId, old_value: null, new_value: 'by hand' });
  await recordFeedback(itemId, mpId, 'manual_attach', a.email);
}

async function recordFeedback(itemId: number, mpId: string, action: 'confirm' | 'reject' | 'manual_attach', userId: string) {
  await supabaseAdmin().from('feed_match_feedback').insert({ feed_item_id: itemId, mp_id: mpId, action, user_id: userId });
}

/** Everything from one outlet, or one date range, hidden in a single action. */
export async function bulkHide(a: Actor, q: { outlet?: string; from?: string; to?: string }, reason: string): Promise<number> {
  const rows = await listFeed({ outlet: q.outlet, from: q.from, to: q.to, status: 'visible', limit: 500 });
  for (const r of rows) await setAttachmentStatus(a, r.feed_item_id, r.mp_id, 'hidden', reason);
  return rows.length;
}

/* ---------------------------------------------------------------- runs */

export interface FeedRunRow {
  id: number;
  collector: string;
  status: string;
  trigger: string | null;
  started_at: string;
  finished_at: string | null;
  items_found: number;
  items_new: number;
  items_attached: number;
  unmatched: number;
  low_confidence: number;
  quota_used: number;
  errors: { source: string; message: string }[] | null;
  detail: Record<string, number> | null;
}

export async function listFeedRuns(limit = 50): Promise<FeedRunRow[]> {
  const { data } = await supabaseAdmin().from('feed_runs').select('*').order('started_at', { ascending: false }).limit(limit);
  return (data ?? []) as FeedRunRow[];
}

/** Collectors that have failed their last three runs, for the red banner. */
export function brokenCollectors(runs: FeedRunRow[]): string[] {
  const by = new Map<string, FeedRunRow[]>();
  for (const r of runs) by.set(r.collector, [...(by.get(r.collector) ?? []), r]);
  return [...by.entries()]
    .filter(([, list]) => list.length >= 3 && list.slice(0, 3).every((r) => r.status === 'failed' || r.status === 'aborted'))
    .map(([collector]) => collector);
}

/* ---------------------------------------------------------------- name variants */

export interface VariantRow { id: number; mp_id: string; variant: string; source: string; weight: number; created_by: string | null }

export async function variantsFor(mpId: string): Promise<VariantRow[]> {
  const { data } = await supabaseAdmin().from('mp_name_variants').select('*').eq('mp_id', mpId).order('source').order('variant');
  return (data ?? []) as VariantRow[];
}

export async function addVariant(a: Actor, mpId: string, variant: string) {
  await supabaseAdmin().from('mp_name_variants').upsert(
    { mp_id: mpId, variant, source: 'manual', weight: 1, created_by: a.email },
    { onConflict: 'mp_id,variant' },
  );
  await audit(a, { action: 'feed.variant.add', entity_type: 'member', entity_id: mpId, field: null, old_value: null, new_value: variant });
}

export async function removeVariant(a: Actor, id: number, mpId: string, variant: string) {
  await supabaseAdmin().from('mp_name_variants').delete().eq('id', id);
  await audit(a, { action: 'feed.variant.remove', entity_type: 'member', entity_id: mpId, field: null, old_value: variant, new_value: null });
}
