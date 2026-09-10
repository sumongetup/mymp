import Link from 'next/link';
import { parties, bn } from '@/lib/data';
import { requireAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminPage, Table, Td, Badge } from '@/app/admin/ui';

export default async function PartiesAdmin() {
  await requireAdmin();
  const { data: ov } = await supabaseAdmin().from('overrides').select('entity_id').eq('entity_type', 'party');
  const edited = new Set((ov ?? []).map((r) => r.entity_id as string));

  return (
    <AdminPage
      title="দল"
      lede={`সংসদে আসন আছে এমন ${bn(parties.length)}টি দল। দলের নাম বদলানো যায়; আসনসংখ্যা সংসদের তথ্যভান্ডার থেকে আসে।`}
    >
      <Table head={['দল', 'সংক্ষেপ', 'মোট আসন', 'নির্বাচিত', 'সংরক্ষিত', 'অবস্থা', '']}>
        {parties.map((p) => (
          <tr key={p.abbr}>
            <Td>
              <span className="serif font-bold">{p.nameBn}</span>
              <span className="block text-[12.5px] text-muted">{p.nameEn}</span>
            </Td>
            <Td className="whitespace-nowrap">{p.abbr}</Td>
            <Td className="tnum font-semibold">{bn(p.seats)}</Td>
            <Td className="tnum">{bn(p.seatsTerritorial)}</Td>
            <Td className="tnum">{bn(p.seatsReserved)}</Td>
            <Td>{edited.has(p.abbr) && <Badge tone="good">সম্পাদিত</Badge>}</Td>
            <Td className="text-end whitespace-nowrap">
              <Link href={`/admin/parties/${p.abbr}`} className="font-semibold text-brand hover:underline">সম্পাদনা →</Link>
            </Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
