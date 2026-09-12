/**
 * What the matcher learns from the editors.
 *
 * Every ঠিক আছে, every ভুল and every hand-made attachment is written to
 * feed_match_feedback. Once a week this reads them back and does two things:
 *
 *   * a name an editor attached by hand more than once, which no stored
 *     variant covers, becomes a learned variant at a lower weight, so the next
 *     run finds it by itself and a reviewer sees it as দুর্বল মিল rather than
 *     as a certainty;
 *   * it counts how often each outlet's items are rejected, which the runs
 *     page shows. Nothing is silently down-weighted: an outlet that produces
 *     bad matches is a decision for a person, not for a cron job.
 */
import { restDb, type Db } from '@/lib/posts/db';
import { getMemberById } from '@/lib/data';
import { variantTokens } from './matchMp';

function db(): Db {
  const d = restDb();
  if (!d) throw new Error('Supabase is not configured.');
  return d;
}

interface FeedbackRow {
  feed_item_id: number;
  mp_id: string;
  action: 'confirm' | 'reject' | 'manual_attach';
  created_at: string;
}

export interface OutletAccuracy { outlet: string; attached: number; rejected: number; rate: number }

export interface LearnResult {
  learned: { mpId: string; variant: string; seen: number }[];
  outlets: OutletAccuracy[];
  feedback: number;
}

/** Word runs of two and three words, which is what a name looks like. */
function phrases(tokens: string[]): string[] {
  const out: string[] = [];
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  }
  return out;
}

export async function learnFromFeedback(sinceDays = 30): Promise<LearnResult> {
  const sb = db();
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const feedback = await sb.get<FeedbackRow[]>(
    `feed_match_feedback?created_at=gte.${encodeURIComponent(since)}&select=feed_item_id,mp_id,action,created_at&limit=2000`,
  );
  if (!feedback.length) return { learned: [], outlets: [], feedback: 0 };

  const itemIds = [...new Set(feedback.map((f) => f.feed_item_id))];
  const items = new Map<number, { title: string; summary: string | null; outlet_name: string | null }>();
  for (let i = 0; i < itemIds.length; i += 100) {
    const batch = itemIds.slice(i, i + 100);
    const rows = await sb.get<{ id: number; title: string; summary: string | null; outlet_name: string | null }[]>(
      `feed_items?id=in.(${batch.join(',')})&select=id,title,summary,outlet_name`,
    );
    for (const r of rows) items.set(r.id, { title: r.title, summary: r.summary, outlet_name: r.outlet_name });
  }

  // ---- names an editor keeps attaching by hand
  const known = new Map<string, Set<string>>();
  const variantRows = await sb.get<{ mp_id: string; variant: string }[]>('mp_name_variants?select=mp_id,variant&limit=5000');
  for (const v of variantRows) {
    const set = known.get(v.mp_id) ?? new Set<string>();
    set.add(v.variant);
    known.set(v.mp_id, set);
  }

  const candidates = new Map<string, Map<string, number>>();
  for (const f of feedback) {
    if (f.action !== 'manual_attach' && f.action !== 'confirm') continue;
    const item = items.get(f.feed_item_id);
    if (!item) continue;
    const member = getMemberById(f.mp_id);
    if (!member) continue;
    const own = new Set(variantTokens(member.nameBn ?? ''));
    const seen = candidates.get(f.mp_id) ?? new Map<string, number>();
    for (const p of phrases(variantTokens(item.title))) {
      // Only a phrase that shares a word with the member's own name: an editor
      // attaching an article does not make every phrase in it their name.
      if (!p.split(' ').some((w) => own.has(w))) continue;
      if (known.get(f.mp_id)?.has(p)) continue;
      seen.set(p, (seen.get(p) ?? 0) + 1);
    }
    candidates.set(f.mp_id, seen);
  }

  const learned: LearnResult['learned'] = [];
  for (const [mpId, seen] of candidates) {
    for (const [variant, n] of seen) {
      if (n < 2) continue; // once is an accident
      learned.push({ mpId, variant, seen: n });
    }
  }
  for (const l of learned) {
    await sb.insert('mp_name_variants', { mp_id: l.mpId, variant: l.variant, source: 'learned', weight: 0.8, created_by: 'learning' })
      .catch(() => undefined); // already there
  }

  // ---- which outlets produce matches editors throw away
  const perOutlet = new Map<string, { attached: number; rejected: number }>();
  for (const f of feedback) {
    const item = items.get(f.feed_item_id);
    const outlet = item?.outlet_name;
    if (!outlet) continue;
    const e = perOutlet.get(outlet) ?? { attached: 0, rejected: 0 };
    if (f.action === 'reject') e.rejected++; else e.attached++;
    perOutlet.set(outlet, e);
  }
  const outlets = [...perOutlet.entries()]
    .map(([outlet, e]) => ({ outlet, ...e, rate: e.rejected / Math.max(1, e.attached + e.rejected) }))
    .filter((o) => o.attached + o.rejected >= 5)
    .sort((a, b) => b.rate - a.rate);

  return { learned, outlets, feedback: feedback.length };
}
