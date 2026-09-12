import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { seats, getMemberById, bn, bnGroup } from '@/lib/data';
import { parliamentLabel, parliamentsWithRecords, seatHolders } from '@/lib/history';
import { requireAdmin } from '@/lib/admin/auth';
import { getResult } from '@/lib/admin/store';
import { saveResult, changeResultStatus } from '@/app/admin/actions';
import { AdminPage, Panel, Field, Button, Badge, Notice, inputClass, when } from '@/app/admin/ui';

export async function generateMetadata({ params }: { params: Promise<{ seat: string }> }): Promise<Metadata> {
  const seatNo = Number((await params).seat);
  const seat = seats.find((s) => s.no === seatNo && !s.reserved);
  return { title: seat ? `${seat.nameBn ?? seat.nameEn} | নির্বাচনের ফল` : 'নির্বাচনের ফল' };
}

export default async function EditResult({
  params,
  searchParams,
}: {
  params: Promise<{ seat: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const { seat: seatParam } = await params;
  const flags = await searchParams;
  const seatNo = Number(seatParam);
  const seat = seats.find((s) => s.no === seatNo && !s.reserved);
  if (!seat) notFound();

  const parliamentNo = Number(flags.p || 13);
  let row: Awaited<ReturnType<typeof getResult>> = null;
  let tableMissing = false;
  try {
    row = await getResult(seatNo, parliamentNo);
  } catch {
    tableMissing = true;
  }
  const holder = seat.memberId ? getMemberById(seat.memberId) : undefined;
  const past = seatHolders(seatNo).find((h) => h.parliamentNo === parliamentNo);
  const candidatesText = (row?.candidates ?? []).map((c) => `${c.name} | ${c.party ?? ''} | ${c.votes}`).join('\n');

  return (
    <AdminPage
      title={`${seat.nameBn}, ${parliamentLabel(parliamentNo)}`}
      lede={`আসন ${bn(seat.no)}${seat.nameEn ? `, ${seat.nameEn}` : ''}। ${parliamentNo === 13 ? `বর্তমান সদস্য ${holder?.nameBn ?? 'নেই'}` : past ? `সংসদের রেকর্ডে সে সময়ের সদস্য ${past.nameBn ?? past.nameEn}${past.partyAbbr ? ` (${past.partyAbbr})` : ''}` : 'ওই সংসদের সদস্যের রেকর্ড নেই'}।`}
      crumbs={[{ href: '/admin/results', label: 'নির্বাচনের ফল' }, { label: seat.nameBn ?? String(seat.no) }]}
      actions={<Button kind="secondary" href={`/ason/${seat.slug}`}>সাইটে দেখুন ↗</Button>}
    >
      {tableMissing && <Notice tone="warn">election_results টেবিলটি ডেটাবেসে নেই; আগে supabase/migrations/002_election_results.sql চালান।</Notice>}
      {flags.saved && <Notice tone="good">সংরক্ষিত হয়েছে। সাইটে দেখাতে অবস্থা “প্রকাশিত” করুন, তারপর ড্যাশবোর্ড থেকে “সাইটে প্রকাশ করুন” চাপুন।</Notice>}
      {flags.status && <Notice tone="good">অবস্থা বদলেছে: {flags.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}।</Notice>}
      {flags.invalid === 'candidates' && <Notice tone="bad">প্রার্থীর তালিকা পড়া যায়নি। প্রতি লাইনে “নাম | দল | ভোট” এই আকারে লিখুন; ভোট সংখ্যা হতে হবে।</Notice>}
      {flags.invalid === 'source' && <Notice tone="bad">উৎসের লিংক দরকার, এবং সেটি https:// দিয়ে শুরু হতে হবে।</Notice>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <Panel title="ফল">
          <form action={saveResult} className="flex flex-col gap-4">
            <input type="hidden" name="seat_no" value={seatNo} />
            <label className="flex flex-col gap-1.5">
              <span className="text-[13.5px] font-semibold">নির্বাচন</span>
              <select name="parliament_no" defaultValue={String(parliamentNo)} className={inputClass}>
                {parliamentsWithRecords().map((p) => (
                  <option key={p.no} value={p.no}>{parliamentLabel(p.no)}</option>
                ))}
              </select>
            </label>
            <Field
              label="প্রার্থী, দল ও প্রাপ্ত ভোট"
              name="candidates"
              multiline
              rows={8}
              defaultValue={candidatesText}
              hint="প্রতি লাইনে একজন: নাম | দলের সংক্ষেপ (BNP, BJEI, Ind…) | ভোট। বাংলা বা ইংরেজি সংখ্যা দুটোই চলবে। যেমন: তারেক রহমান | BNP | 123456"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="মোট প্রদত্ত ভোট (ঐচ্ছিক)" name="total_votes" defaultValue={row?.total_votes != null ? String(row.total_votes) : ''} />
              <Field label="ভোট পড়ার হার % (ঐচ্ছিক)" name="turnout" defaultValue={row?.turnout != null ? String(row.turnout) : ''} />
            </div>
            <Field label="উৎস: গেজেট বা নির্বাচন কমিশনের নথির লিংক" name="source_url" type="url" defaultValue={row?.source_url ?? ''} required hint="যেমন নির্বাচন কমিশনের ওয়েবসাইটে প্রকাশিত ফলাফলের PDF।" />
            <Field label="উৎস সম্পর্কে টীকা (ঐচ্ছিক)" name="source_note" defaultValue={row?.source_note ?? ''} hint="যেমন: গেজেট নং ও তারিখ" />
            <label className="flex flex-col gap-1.5">
              <span className="text-[13.5px] font-semibold">অবস্থা</span>
              <select name="status" defaultValue={row?.status ?? 'draft'} className={inputClass}>
                <option value="draft">খসড়া (সাইটে যাবে না)</option>
                <option value="published">প্রকাশিত (পরের প্রকাশে সাইটে উঠবে)</option>
              </select>
            </label>
            <div className="flex gap-2 pt-1">
              <Button>সংরক্ষণ</Button>
              <Button kind="secondary" href="/admin/results">ফিরে যান</Button>
            </div>
          </form>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="এখন যা সংরক্ষিত">
            {row ? (
              <div className="flex flex-col gap-3 text-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">অবস্থা</span>
                  {row.status === 'published' ? <Badge tone="good">প্রকাশিত</Badge> : <Badge tone="warn">খসড়া</Badge>}
                </div>
                <div className="flex justify-between gap-3"><span className="text-muted">শেষ বদল</span><span>{when(row.updated_at)}</span></div>
                <ol className="flex flex-col divide-y divide-rulesoft border-t border-rulesoft pt-1">
                  {[...row.candidates].sort((a, b) => b.votes - a.votes).map((c, i) => (
                    <li key={`${c.name}-${i}`} className="py-1.5 flex justify-between gap-3">
                      <span className={i === 0 ? 'font-bold' : ''}>{c.name}{c.party ? <span className="text-muted">, {c.party}</span> : null}</span>
                      <span className="tnum">{bnGroup(c.votes)}</span>
                    </li>
                  ))}
                </ol>
                <form action={changeResultStatus} className="pt-2">
                  <input type="hidden" name="seat_no" value={seatNo} />
                  <input type="hidden" name="parliament_no" value={row.parliament_no} />
                  <input type="hidden" name="status" value={row.status === 'published' ? 'draft' : 'published'} />
                  <Button kind={row.status === 'published' ? 'secondary' : 'primary'} small>
                    {row.status === 'published' ? 'খসড়ায় ফেরান' : 'প্রকাশিত করুন'}
                  </Button>
                </form>
              </div>
            ) : (
              <p className="text-[14px] text-muted">এই আসন ও নির্বাচনের কোনো ফল এখনো তোলা হয়নি।</p>
            )}
          </Panel>
          <p className="px-1 text-[12.5px] text-muted leading-relaxed">
            সাইটে বিজয়ী হিসেবে যাঁকে দেখানো হবে তিনি সর্বোচ্চ ভোটপ্রাপ্ত প্রার্থী। তালিকার ক্রম গুরুত্বপূর্ণ নয়।
          </p>
        </div>
      </div>
    </AdminPage>
  );
}
