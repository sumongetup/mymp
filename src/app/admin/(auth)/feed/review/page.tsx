import type { Metadata } from 'next';
import Link from 'next/link';
import { members, getMemberById, bn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { listFeed } from '@/lib/admin/feed';
import { confirmFeedItem, hideFeedItem, attachFeedItem } from '@/app/admin/actions';
import { AdminPage, Panel, Empty, Badge, when } from '@/app/admin/ui';

export const metadata: Metadata = { title: 'যাচাইয়ের অপেক্ষায়' };

const SIGNAL_BN: Record<string, string> = {
  'name-in-title': 'শিরোনামে নাম',
  'name-in-summary': 'সারাংশে নাম',
  seat: 'নিজের আসন',
  district: 'নিজের জেলা',
  party: 'নিজের দল',
  post: 'নিজের দায়িত্বের নাম',
  'namesake-context': 'একই নামের অন্য পেশা',
  'daily-cap': 'একদিনে অনেক খবর',
  'by-hand': 'হাতে যুক্ত',
};

export default async function FeedReview() {
  await requireAdmin();
  const rows = await listFeed({ lowOnly: true, limit: 80 });
  const picker = [...members].sort((a, b) => (a.nameBn ?? '').localeCompare(b.nameBn ?? '', 'bn'));

  return (
    <AdminPage
      title="যাচাইয়ের অপেক্ষায়"
      lede="ম্যাচার এই সংযুক্তিগুলো নিয়ে নিশ্চিত নয়, তাই সেগুলো সদস্যের পাতায় আছে কিন্তু চিহ্নিত করা আছে। ঠিক হলে রেখে দিন, ভুল হলে সরান, অথবা সঠিক সদস্যকে দিন। প্রতিটি সিদ্ধান্ত মনে রাখা হয়, যাতে ম্যাচার শেখে।"
      actions={<Link href="/admin/feed" className="hover:underline">সব সংযুক্তি →</Link>}
    >
      {rows.length === 0 ? (
        <Panel title="কিছু নেই"><Empty>এখন যাচাইয়ের অপেক্ষায় কিছু নেই।</Empty></Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const item = r.feed_items!;
            const m = getMemberById(r.mp_id);
            return (
              <div key={`${r.feed_item_id}-${r.mp_id}`} className="rounded-card border border-rule bg-surface p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  {item.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail_url} alt="" className="w-[120px] aspect-video object-cover rounded-lg border border-rulesoft" />
                  ) : null}
                  <div className="grow min-w-0">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[15.5px] hover:text-brand">{item.title}</a>
                    <p className="text-[13px] text-muted">{item.outlet_name ?? 'উৎস নেই'}, {when(item.published_at)}</p>
                    {item.summary && <p className="pt-1 text-[13.5px] text-inksoft line-clamp-2">{item.summary}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="text-muted">যাকে দেওয়া হয়েছে:</span>
                  <strong>{m ? m.nameBn : r.mp_id}</strong>
                  <span className="text-muted">{m?.seat?.nameBn}</span>
                  <Badge tone="warn">নম্বর {bn(r.score)}</Badge>
                  {(r.signals ?? []).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded border border-rulesoft text-[12px]">
                      {SIGNAL_BN[s.signal] ?? s.signal} {s.points > 0 ? `+${bn(s.points)}` : bn(s.points)}
                      {s.detail ? `, ${s.detail}` : ''}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={confirmFeedItem}>
                    <input type="hidden" name="item_id" value={r.feed_item_id} />
                    <input type="hidden" name="mp_id" value={r.mp_id} />
                    <button className="h-9 px-3.5 rounded-lg bg-brand text-white text-[13.5px] font-semibold hover:bg-branddark">ঠিক আছে</button>
                  </form>
                  <form action={hideFeedItem}>
                    <input type="hidden" name="item_id" value={r.feed_item_id} />
                    <input type="hidden" name="mp_id" value={r.mp_id} />
                    <input type="hidden" name="status" value="removed" />
                    <input type="hidden" name="reason" value="যাচাইয়ে ভুল বলে চিহ্নিত" />
                    <button className="h-9 px-3.5 rounded-lg border border-rule text-[13.5px] font-semibold hover:border-ink">ভুল, সরান</button>
                  </form>
                  <form action={attachFeedItem} className="flex items-center gap-2">
                    <input type="hidden" name="item_id" value={r.feed_item_id} />
                    <select name="mp_id" required defaultValue="" className="h-9 max-w-[240px] rounded-lg border border-rule bg-surface px-2 text-[13.5px]">
                      <option value="" disabled>অন্য সদস্যকে দিন</option>
                      {picker.map((p) => <option key={p.id} value={p.id}>{p.nameBn} ({p.seat?.nameBn ?? 'নেই'})</option>)}
                    </select>
                    <button className="h-9 px-3.5 rounded-lg border border-rule text-[13.5px] font-semibold hover:border-ink">দিন</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
