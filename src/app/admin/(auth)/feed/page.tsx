import type { Metadata } from 'next';
import Link from 'next/link';
import { members, getMemberById, bn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { listFeed, feedOutlets, feedCounts } from '@/lib/admin/feed';
import { hideFeedItem, pinFeedItem, attachFeedItem } from '@/app/admin/actions';
import { AdminPage, Panel, Table, Td, Badge, Empty, Notice, when } from '@/app/admin/ui';
import FeedManualAdd from './FeedManualAdd';
import FeedBulkHide from './FeedBulkHide';

export const metadata: Metadata = { title: 'সংবাদ ফিড' };

const TYPE_BN: Record<string, string> = { news: 'সংবাদ', video: 'ভিডিও', press: 'প্রজ্ঞাপন', social: 'সোশ্যাল' };
const STATUS_BN: Record<string, string> = { visible: 'দেখানো হচ্ছে', hidden: 'লুকানো', removed: 'সরানো' };

export default async function FeedAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [rows, outlets, counts] = await Promise.all([
    listFeed({
      mpId: sp.mp,
      outlet: sp.outlet,
      type: sp.type,
      status: sp.status,
      lowOnly: sp.low === '1',
      from: sp.from,
      to: sp.to,
      limit: 120,
    }),
    feedOutlets(),
    feedCounts(),
  ]);
  const picker = [...members].sort((a, b) => (a.nameBn ?? '').localeCompare(b.nameBn ?? '', 'bn'));

  return (
    <AdminPage
      title="সংবাদ ফিড"
      lede={`সংসদ সদস্যদের পাতায় যে সংবাদ ও ভিডিও দেখানো হচ্ছে। সংগ্রহের সঙ্গে সঙ্গে প্রকাশ হয়; এখানে ভুল হলে লুকানো, সরানো বা উপরে তুলে রাখা যায়। মোট ${bn(counts.total)}টি সংযুক্তি, ${bn(counts.visible)}টি দেখানো হচ্ছে, ${bn(counts.review)}টি যাচাইয়ের অপেক্ষায়।`}
      actions={<Link href="/admin/feed/review" className="hover:underline">যাচাইয়ের তালিকা ({bn(counts.review)}) →</Link>}
    >
      {counts.review > 0 && (
        <Notice tone="warn">
          {bn(counts.review)}টি সংযুক্তি নিয়ে ম্যাচার নিশ্চিত নয়। <Link href="/admin/feed/review" className="underline">যাচাই করুন</Link>।
        </Notice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <FeedManualAdd members={picker.map((m) => ({ id: m.id, label: `${m.nameBn} (${m.seat?.nameBn ?? 'নেই'})` }))} />
        <FeedBulkHide outlets={outlets} />
      </div>

      <Panel title="ছাঁকনি" className="mt-4">
        <form className="flex flex-wrap items-end gap-2 text-[13.5px]">
          <label className="flex flex-col gap-1">
            <span className="text-muted text-[12.5px]">সংসদ সদস্য</span>
            <select name="mp" defaultValue={sp.mp ?? ''} className="h-9 max-w-[240px] rounded-lg border border-rule bg-surface px-2">
              <option value="">সবাই</option>
              {picker.map((m) => <option key={m.id} value={m.id}>{m.nameBn}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted text-[12.5px]">সংবাদমাধ্যম</span>
            <select name="outlet" defaultValue={sp.outlet ?? ''} className="h-9 rounded-lg border border-rule bg-surface px-2">
              <option value="">সব</option>
              {outlets.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted text-[12.5px]">ধরন</span>
            <select name="type" defaultValue={sp.type ?? ''} className="h-9 rounded-lg border border-rule bg-surface px-2">
              <option value="">সব</option>
              {Object.entries(TYPE_BN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted text-[12.5px]">অবস্থা</span>
            <select name="status" defaultValue={sp.status ?? ''} className="h-9 rounded-lg border border-rule bg-surface px-2">
              <option value="">সব</option>
              {Object.entries(STATUS_BN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted text-[12.5px]">থেকে</span>
            <input type="date" name="from" defaultValue={sp.from ?? ''} className="h-9 rounded-lg border border-rule bg-surface px-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted text-[12.5px]">পর্যন্ত</span>
            <input type="date" name="to" defaultValue={sp.to ?? ''} className="h-9 rounded-lg border border-rule bg-surface px-2" />
          </label>
          <label className="flex items-center gap-2 h-9">
            <input type="checkbox" name="low" value="1" defaultChecked={sp.low === '1'} className="w-4 h-4" />
            শুধু অনিশ্চিত
          </label>
          <button type="submit" className="h-9 px-4 rounded-lg bg-brand text-white font-semibold">দেখান</button>
          <Link href="/admin/feed" className="h-9 px-4 rounded-lg border border-rule font-semibold grid place-items-center">সব</Link>
        </form>
      </Panel>

      <Panel title={`সংযুক্তি (${bn(rows.length)})`} flush>
        {rows.length === 0 ? (
          <div className="p-5"><Empty>এই ছাঁকনিতে কিছু নেই।</Empty></div>
        ) : (
          <Table head={['শিরোনাম', 'সদস্য', 'নম্বর', 'অবস্থা', 'তারিখ', '']} minWidth={980}>
            {rows.map((r) => {
              const item = r.feed_items!;
              const m = getMemberById(r.mp_id);
              return (
                <tr key={`${r.feed_item_id}-${r.mp_id}`}>
                  <Td className="max-w-[380px]">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-brand">{item.title}</a>
                    <span className="block text-[12.5px] text-muted">
                      {TYPE_BN[item.type]}, {item.outlet_name ?? 'উৎস নেই'}, {item.source}
                      {r.pinned ? ', উপরে রাখা' : ''}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-[13.5px]">
                    {m ? <Link href={`/admin/members/${m.id}`} className="hover:text-brand">{m.nameBn}</Link> : r.mp_id}
                    <span className="block text-[12px] text-muted">{r.signals?.map((s) => s.signal).join('+')}</span>
                  </Td>
                  <Td className="tnum">{bn(r.score)}{r.low_confidence ? <Badge tone="warn">অনিশ্চিত</Badge> : null}</Td>
                  <Td>
                    <Badge tone={r.status === 'visible' ? 'good' : r.status === 'hidden' ? 'warn' : 'bad'}>{STATUS_BN[r.status]}</Badge>
                    {r.hide_reason ? <span className="block text-[12px] text-muted">{r.hide_reason}</span> : null}
                  </Td>
                  <Td className="whitespace-nowrap text-muted text-[13px]">{when(item.published_at)}</Td>
                  <Td className="whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.status === 'visible' ? (
                        <>
                          <form action={hideFeedItem}>
                            <input type="hidden" name="item_id" value={r.feed_item_id} />
                            <input type="hidden" name="mp_id" value={r.mp_id} />
                            <input type="hidden" name="status" value="hidden" />
                            <input type="hidden" name="reason" value="অ্যাডমিন লুকিয়েছেন" />
                            <button className="h-8 px-2.5 rounded-lg border border-rule text-[12.5px] font-semibold hover:border-ink">লুকান</button>
                          </form>
                          <form action={hideFeedItem}>
                            <input type="hidden" name="item_id" value={r.feed_item_id} />
                            <input type="hidden" name="mp_id" value={r.mp_id} />
                            <input type="hidden" name="status" value="removed" />
                            <input type="hidden" name="reason" value="ভুল সদস্য" />
                            <button className="h-8 px-2.5 rounded-lg border border-rule text-[12.5px] font-semibold hover:border-ink">সরান</button>
                          </form>
                          <form action={pinFeedItem} className="flex items-center gap-1">
                            <input type="hidden" name="item_id" value={r.feed_item_id} />
                            <input type="hidden" name="mp_id" value={r.mp_id} />
                            <input type="hidden" name="pinned" value={r.pinned ? '0' : '1'} />
                            {!r.pinned && <input type="date" name="until" className="h-8 w-[130px] rounded-lg border border-rule bg-surface px-1.5 text-[12px]" title="কত তারিখ পর্যন্ত" />}
                            <button className="h-8 px-2.5 rounded-lg border border-rule text-[12.5px] font-semibold hover:border-ink">{r.pinned ? 'নামান' : 'উপরে রাখুন'}</button>
                          </form>
                        </>
                      ) : (
                        <form action={hideFeedItem}>
                          <input type="hidden" name="item_id" value={r.feed_item_id} />
                          <input type="hidden" name="mp_id" value={r.mp_id} />
                          <input type="hidden" name="status" value="visible" />
                          <button className="h-8 px-2.5 rounded-lg border border-rule text-[12.5px] font-semibold hover:border-ink">ফিরিয়ে আনুন</button>
                        </form>
                      )}
                      <form action={attachFeedItem} className="flex items-center gap-1">
                        <input type="hidden" name="item_id" value={r.feed_item_id} />
                        <select name="mp_id" required defaultValue="" className="h-8 w-[150px] rounded-lg border border-rule bg-surface px-1.5 text-[12px]">
                          <option value="" disabled>অন্য সদস্যকে দিন</option>
                          {picker.map((p) => <option key={p.id} value={p.id}>{p.nameBn}</option>)}
                        </select>
                        <button className="h-8 px-2 rounded-lg border border-rule text-[12.5px] font-semibold hover:border-ink">দিন</button>
                      </form>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Panel>
    </AdminPage>
  );
}
