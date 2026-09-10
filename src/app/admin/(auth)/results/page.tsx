import Link from 'next/link';
import { seats, bn } from '@/lib/data';
import { parliamentLabel, parliamentsWithRecords } from '@/lib/history';
import { requireAdmin } from '@/lib/admin/auth';
import { listResults } from '@/lib/admin/store';
import { AdminPage, Panel, Table, Td, Badge, Empty, Notice, Button, inputClass } from '@/app/admin/ui';

export default async function ResultsAdmin() {
  await requireAdmin();
  let rows: Awaited<ReturnType<typeof listResults>> = [];
  let tableMissing = false;
  try {
    rows = await listResults();
  } catch {
    tableMissing = true;
  }
  const territorial = seats.filter((s) => !s.reserved);
  const parliaments = parliamentsWithRecords();
  const published = rows.filter((r) => r.status === 'published').length;

  return (
    <AdminPage
      title="নির্বাচনের ফল"
      lede="আসনভিত্তিক প্রার্থী ও প্রাপ্ত ভোট, নির্বাচন কমিশনের গেজেট থেকে হাতে তোলা। খসড়া কখনো সাইটে যায় না; “প্রকাশিত” করার পর পরের প্রকাশে আসনের পাতায় ওঠে।"
    >
      {tableMissing && (
        <Notice tone="warn">
          election_results টেবিলটি এখনো ডেটাবেসে নেই। Supabase → SQL Editor-এ <code>supabase/migrations/002_election_results.sql</code> ফাইলটি একবার চালান, তারপর এই পাতা আবার খুলুন।
        </Notice>
      )}

      <Panel title="ফল যোগ বা সম্পাদনা করুন">
        <form action="/admin/results/go" method="get" className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13.5px] font-semibold">আসন</span>
            <select name="seat" className={inputClass} required defaultValue="">
              <option value="" disabled>আসন বাছুন</option>
              {territorial.map((s) => (
                <option key={s.no} value={s.no}>{bn(s.no)} · {s.nameBn}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13.5px] font-semibold">নির্বাচন</span>
            <select name="p" className={inputClass} defaultValue="13">
              {parliaments.map((p) => (
                <option key={p.no} value={p.no}>{parliamentLabel(p.no)}</option>
              ))}
            </select>
          </label>
          <Button type="submit">খুলুন</Button>
        </form>
        <p className="mt-3 text-[12.5px] text-muted leading-relaxed">
          প্রতিটি ফলের সঙ্গে গেজেট বা নির্বাচন কমিশনের প্রকাশিত নথির লিংক বাধ্যতামূলক। যে সংখ্যা যাচাই করা যায় না, তা তুলবেন না।
        </p>
      </Panel>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Panel><span className="text-[12px] font-semibold text-muted">মোট এন্ট্রি</span><span className="block display tnum text-[26px]">{bn(rows.length)}</span></Panel>
        <Panel><span className="text-[12px] font-semibold text-muted">প্রকাশিত</span><span className="block display tnum text-[26px] text-brand">{bn(published)}</span></Panel>
        <Panel><span className="text-[12px] font-semibold text-muted">২০২৬-এর আসন বাকি</span><span className="block display tnum text-[26px]">{bn(300 - rows.filter((r) => r.parliament_no === 13 && r.status === 'published').length)}</span></Panel>
      </div>

      {rows.length === 0 ? (
        <Empty>এখনো কোনো ফল তোলা হয়নি।</Empty>
      ) : (
        <Table head={['আসন', 'নির্বাচন', 'বিজয়ী', 'প্রার্থী', 'অবস্থা', '']} minWidth={720}>
          {rows.map((r) => {
            const seat = seats.find((s) => s.no === r.seat_no);
            const winner = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
            return (
              <tr key={r.id}>
                <Td><span className="font-semibold">{seat?.nameBn ?? bn(r.seat_no)}</span></Td>
                <Td className="text-muted whitespace-nowrap">{parliamentLabel(r.parliament_no)}</Td>
                <Td>{winner ? `${winner.name}${winner.party ? ` (${winner.party})` : ''}` : '—'}</Td>
                <Td className="tnum">{bn(r.candidates.length)}</Td>
                <Td>{r.status === 'published' ? <Badge tone="good">প্রকাশিত</Badge> : <Badge tone="warn">খসড়া</Badge>}</Td>
                <Td className="text-end whitespace-nowrap">
                  <Link href={`/admin/results/${r.seat_no}?p=${r.parliament_no}`} className="font-semibold text-brand hover:underline">সম্পাদনা →</Link>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </AdminPage>
  );
}
