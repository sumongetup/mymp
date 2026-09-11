import type { Metadata } from 'next';
import Link from 'next/link';
import { seats, getMemberById, bn } from '@/lib/data';
import { normalise } from '@/lib/search';
import { requireAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminPage, Table, Td, Badge, Empty } from '@/app/admin/ui';

export const metadata: Metadata = { title: 'আসন' };

export default async function SeatsAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = '' } = await searchParams;

  const { data: ov } = await supabaseAdmin().from('overrides').select('entity_id').eq('entity_type', 'seat');
  const edited = new Set((ov ?? []).map((r) => r.entity_id as string));

  const words = normalise(q).split(' ').filter(Boolean);
  const list = seats
    .filter((s) => {
      if (!words.length) return true;
      const key = [s.nameBn, s.nameEn].map((x) => normalise(x ?? '')).join(' ');
      return words.every((w) => key.includes(w));
    })
    .slice(0, 120);

  return (
    <AdminPage
      title="আসন"
      lede={`${bn(seats.length)}টি আসন। ${bn(edited.size)}টির তথ্য হাতে সম্পাদিত। আসনের নাম ও এলাকার বিবরণ বদলানো যায়।`}
    >
      <form className="flex gap-2 max-w-[520px]">
        <input
          name="q"
          defaultValue={q}
          placeholder="আসনের নাম, বাংলা বা ইংরেজি"
          className="grow rounded-lg border border-rule bg-surface px-3.5 h-11 text-[15px] focus:border-brand outline-none"
        />
        <button type="submit" className="h-11 px-5 rounded-lg bg-brand text-white font-semibold text-[14.5px]">খুঁজুন</button>
      </form>

      {list.length === 0 ? (
        <Empty>কিছু পাওয়া যায়নি।</Empty>
      ) : (
        <Table head={['নং', 'আসন', 'বর্তমান সদস্য', 'অবস্থা', '']}>
          {list.map((s) => {
            const m = s.memberId ? getMemberById(s.memberId) : undefined;
            return (
              <tr key={s.no}>
                <Td className="tnum text-muted">{bn(s.no)}</Td>
                <Td>
                  <span className="display font-bold">{s.nameBn}</span>
                  <span className="block text-[12.5px] text-muted">{s.nameEn}</span>
                </Td>
                <Td className="text-[13.5px]">{m?.nameBn ?? '—'}</Td>
                <Td>
                  <span className="flex gap-1.5 flex-wrap">
                    {edited.has(String(s.no)) && <Badge tone="good">সম্পাদিত</Badge>}
                    {s.reserved && <Badge>সংরক্ষিত</Badge>}
                  </span>
                </Td>
                <Td className="text-end whitespace-nowrap">
                  <Link href={`/admin/seats/${s.no}`} className="font-semibold text-brand hover:underline">সম্পাদনা →</Link>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
      {list.length === 120 && <p className="text-[13px] text-muted">প্রথম ১২০টি দেখানো হচ্ছে, খুঁজে সংকীর্ণ করুন।</p>}
    </AdminPage>
  );
}
