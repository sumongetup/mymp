import type { Metadata } from 'next';
import Link from 'next/link';
import { committees, bn } from '@/lib/data';
import { normalise } from '@/lib/search';
import { requireAdmin } from '@/lib/admin/auth';
import { hiddenList } from '@/lib/admin/store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminPage, Table, Td, Badge, Empty } from '@/app/admin/ui';

export const metadata: Metadata = { title: 'কমিটি' };

export default async function CommitteesAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = '' } = await searchParams;
  const [hidden, { data: ov }] = await Promise.all([
    hiddenList(),
    supabaseAdmin().from('overrides').select('entity_id').eq('entity_type', 'committee'),
  ]);
  const hiddenIds = new Set(hidden.filter((h) => h.entity_type === 'committee').map((h) => h.entity_id));
  const edited = new Set((ov ?? []).map((r) => r.entity_id as string));
  const current = committees.filter((c) => c.rosterCurrent).length;

  const words = normalise(q).split(' ').filter(Boolean);
  const list = committees.filter((c) => {
    if (!words.length) return true;
    const key = [c.nameBn, c.nameEn, c.type].map((s) => normalise(s ?? '')).join(' ');
    return words.every((w) => key.includes(w));
  });

  return (
    <AdminPage
      title="কমিটি"
      lede={`${bn(committees.length)}টি কমিটি, তার ${bn(current)}টির সদস্য তালিকা ত্রয়োদশ সংসদের জন্য হালনাগাদ। নাম বদলানো যায় ও সাইট থেকে সরানো যায়; সদস্য তালিকা সংসদের তথ্যভান্ডার থেকে আসে।`}
    >
      <form className="flex gap-2 max-w-[520px]">
        <input
          name="q"
          defaultValue={q}
          placeholder="কমিটির নাম, বাংলা বা ইংরেজি"
          className="grow rounded-lg border border-rule bg-surface px-3.5 h-11 text-[15px] focus:border-brand outline-none"
        />
        <button type="submit" className="h-11 px-5 rounded-lg bg-brand text-white font-semibold text-[14.5px]">খুঁজুন</button>
      </form>

      {list.length === 0 ? (
        <Empty>কোনো কমিটি মেলেনি। অন্য নামে খুঁজে দেখুন।</Empty>
      ) : (
      <Table head={['কমিটি', 'ধরন', 'সদস্য', 'অবস্থা', '']}>
        {list.map((c) => (
          <tr key={c.id}>
            <Td>
              <span className="display font-bold">{c.nameBn}</span>
              <span className="block text-[12.5px] text-muted">{c.nameEn}</span>
            </Td>
            <Td className="text-[13px] text-muted">{c.type}</Td>
            <Td className="tnum">{bn(c.members.length)}</Td>
            <Td>
              <span className="flex gap-1.5 flex-wrap">
                {c.rosterCurrent ? <Badge tone="good">হালনাগাদ</Badge> : <Badge tone="warn">অপেক্ষমাণ</Badge>}
                {edited.has(c.id) && <Badge tone="good">সম্পাদিত</Badge>}
                {hiddenIds.has(c.id) && <Badge tone="bad">সরানো</Badge>}
              </span>
            </Td>
            <Td className="text-end whitespace-nowrap">
              <Link href={`/admin/committees/${c.id}`} className="font-semibold text-brand hover:underline">সম্পাদনা →</Link>
            </Td>
          </tr>
        ))}
      </Table>
      )}
    </AdminPage>
  );
}
