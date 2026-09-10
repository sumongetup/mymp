import Link from 'next/link';
import { committees, bn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { hiddenList } from '@/lib/admin/store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminPage, Table, Td, Badge } from '@/app/admin/ui';

export default async function CommitteesAdmin() {
  await requireAdmin();
  const [hidden, { data: ov }] = await Promise.all([
    hiddenList(),
    supabaseAdmin().from('overrides').select('entity_id').eq('entity_type', 'committee'),
  ]);
  const hiddenIds = new Set(hidden.filter((h) => h.entity_type === 'committee').map((h) => h.entity_id));
  const edited = new Set((ov ?? []).map((r) => r.entity_id as string));
  const current = committees.filter((c) => c.rosterCurrent).length;

  return (
    <AdminPage
      title="কমিটি"
      lede={`${bn(committees.length)}টি কমিটি, তার ${bn(current)}টির সদস্য তালিকা ত্রয়োদশ সংসদের জন্য হালনাগাদ। নাম বদলানো যায় ও সাইট থেকে সরানো যায়; সদস্য তালিকা সংসদের তথ্যভান্ডার থেকে আসে।`}
    >
      <Table head={['কমিটি', 'ধরন', 'সদস্য', 'অবস্থা', '']}>
        {committees.map((c) => (
          <tr key={c.id}>
            <Td>
              <span className="serif font-bold">{c.nameBn}</span>
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
    </AdminPage>
  );
}
