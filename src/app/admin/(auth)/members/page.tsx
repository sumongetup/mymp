import Link from 'next/link';
import { allMembers as members, bn } from '@/lib/data';
import { normalise } from '@/lib/search';
import { requireAdmin } from '@/lib/admin/auth';
import { hiddenList, overrideCounts } from '@/lib/admin/store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminPage, Table, Td, Badge, Empty } from '@/app/admin/ui';

export default async function MembersAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = '' } = await searchParams;

  const [hidden, oc, { data: ov }] = await Promise.all([
    hiddenList(),
    overrideCounts(),
    supabaseAdmin().from('overrides').select('entity_id').eq('entity_type', 'member'),
  ]);
  const hiddenIds = new Set(hidden.filter((h) => h.entity_type === 'member').map((h) => h.entity_id));
  const editedIds = new Set((ov ?? []).map((r) => r.entity_id as string));

  const nq = normalise(q);
  const words = nq.split(' ').filter(Boolean);
  const list = members
    .filter((m) => {
      if (!words.length) return true;
      const key = [m.nameBn, m.nameEn, m.seat?.nameBn, m.seat?.nameEn, m.party?.abbr].map((s) => normalise(s ?? '')).join(' ');
      return words.every((w) => key.includes(w));
    })
    .sort((a, b) => (a.seat?.no ?? 999) - (b.seat?.no ?? 999))
    .slice(0, 120);

  return (
    <AdminPage
      title="সংসদ সদস্য"
      lede={`${bn(members.length)} জন সদস্য সংসদের তথ্যভান্ডার থেকে। ${bn(oc.member)}টি ফিল্ড হাতে সম্পাদিত, ${bn(hiddenIds.size)} জন সাইট থেকে লুকানো।`}
    >
      <form className="flex gap-2 max-w-[520px]">
        <input
          name="q"
          defaultValue={q}
          placeholder="নাম বা আসন, বাংলা বা ইংরেজি"
          className="grow rounded-lg border border-rule bg-surface px-3.5 h-11 text-[15px] focus:border-brand outline-none"
        />
        <button type="submit" className="h-11 px-5 rounded-lg bg-brand text-white font-semibold text-[14.5px]">খুঁজুন</button>
      </form>

      {list.length === 0 ? (
        <Empty>কিছু পাওয়া যায়নি।</Empty>
      ) : (
        <Table head={['আসন', 'নাম', 'দল', 'অবস্থা', '']}>
          {list.map((m) => (
            <tr key={m.id}>
              <Td className="whitespace-nowrap">{m.seat?.nameBn ?? '—'}</Td>
              <Td>
                <span className="display font-bold">{m.nameBn}</span>
                <span className="block text-[12.5px] text-muted">{m.nameEn}</span>
              </Td>
              <Td className="whitespace-nowrap">{m.party?.abbr ?? '—'}</Td>
              <Td>
                <span className="flex gap-1.5 flex-wrap">
                  {editedIds.has(m.id) && <Badge tone="good">সম্পাদিত</Badge>}
                  {hiddenIds.has(m.id) && <Badge tone="bad">লুকানো</Badge>}
                  {m.seat?.reserved && <Badge>সংরক্ষিত</Badge>}
                </span>
              </Td>
              <Td className="text-end whitespace-nowrap">
                <Link href={`/admin/members/${m.id}`} className="font-semibold text-brand hover:underline">সম্পাদনা →</Link>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {list.length === 120 && <p className="text-[13px] text-muted">প্রথম ১২০ জন দেখানো হচ্ছে, খুঁজে সংকীর্ণ করুন।</p>}
    </AdminPage>
  );
}
