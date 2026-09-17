import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { allMembers } from '@/lib/data';

/**
 * How the site is doing, for the dashboard and the member list: whether each
 * collector ran when it should have, and which members' pages are thin.
 */

/** How long each collector may go without a run before the dashboard says so. */
export const COLLECTORS: { key: string; label: string; staleHours: number }[] = [
  { key: 'rss', label: 'সংবাদপত্রের ফিড', staleHours: 2 },
  { key: 'sitemap', label: 'সংবাদপত্রের সাইটম্যাপ', staleHours: 2 },
  { key: 'youtube', label: 'ইউটিউব ভিডিও', staleHours: 3 },
  { key: 'press', label: 'সংসদের প্রজ্ঞাপন', staleHours: 36 },
  { key: 'search', label: 'সার্চ (গুগল)', staleHours: 24 * 365 },
];

export interface CollectorHealth {
  key: string;
  label: string;
  lastAt: string | null;
  status: string | null;
  attached: number;
  message: string | null;
  stale: boolean;
}

export async function collectorHealth(): Promise<CollectorHealth[]> {
  const sb = supabaseAdmin();
  return Promise.all(COLLECTORS.map(async (c) => {
    const { data } = await sb
      .from('feed_runs')
      .select('started_at,status,items_attached,errors')
      .eq('collector', c.key)
      .neq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1);
    const r = data?.[0] as { started_at: string; status: string; items_attached: number; errors: { message: string }[] | null } | undefined;
    const age = r ? (Date.now() - new Date(r.started_at).getTime()) / 3_600_000 : Infinity;
    return {
      key: c.key,
      label: c.label,
      lastAt: r?.started_at ?? null,
      status: r?.status ?? null,
      attached: r?.items_attached ?? 0,
      message: r && r.status !== 'ok' ? r.errors?.[0]?.message ?? null : null,
      stale: age > c.staleHours,
    };
  }));
}

export interface Coverage { news: number; video: number }

/**
 * News and video counts per member, for every member. Read a page at a time
 * (there are thousands of attachments) and kept for ten minutes, so opening
 * the dashboard or the member list does not walk the table each time.
 */
export const memberCoverage = unstable_cache(
  async (): Promise<Record<string, Coverage>> => {
    const out: Record<string, Coverage> = {};
    for (const m of allMembers) out[m.id] = { news: 0, video: 0 };
    const sb = supabaseAdmin();
    for (let from = 0; ; from += 1000) {
      const { data } = await sb
        .from('feed_item_mps')
        .select('mp_id,feed_item_id,feed_items!inner(type)')
        .eq('status', 'visible')
        .eq('low_confidence', false)
        .order('feed_item_id')
        .order('mp_id')
        .range(from, from + 999);
      const rows = (data ?? []) as unknown as { mp_id: string; feed_items: { type: string } }[];
      for (const r of rows) {
        const e = (out[r.mp_id] ??= { news: 0, video: 0 });
        if (r.feed_items.type === 'video') e.video++;
        else if (r.feed_items.type === 'news') e.news++;
      }
      if (rows.length < 1000) return out;
    }
  },
  ['admin-member-coverage'],
  { revalidate: 600 },
);

/** Members whose biography an editor has written. */
export async function membersWithBio(): Promise<Set<string>> {
  const out = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabaseAdmin()
      .from('overrides')
      .select('entity_id')
      .eq('entity_type', 'member')
      .eq('field', 'bioBn')
      .not('value', 'is', null)
      .order('entity_id')
      .range(from, from + 999);
    for (const r of data ?? []) out.add(r.entity_id as string);
    if ((data ?? []).length < 1000) break;
  }
  // A biography parliament.gov.bd itself publishes counts too.
  for (const m of allMembers) if (m.bioBn) out.add(m.id);
  return out;
}

/** Names the cabinet sync could not match on its last run. */
export async function postsUnmatched(): Promise<number> {
  const { data } = await supabaseAdmin()
    .from('post_sync_runs')
    .select('unmatched_names')
    .eq('status', 'ok')
    .order('started_at', { ascending: false })
    .limit(1);
  const names = (data?.[0]?.unmatched_names ?? []) as { stored_as_non_mp?: boolean }[];
  return names.filter((n) => !n.stored_as_non_mp).length;
}
