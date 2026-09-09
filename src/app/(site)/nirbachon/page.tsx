import type { Metadata } from 'next';
import Link from 'next/link';
import { seats, getMemberById, parties, statistics, districtOf, bn, bnGroup, dateBn, meta, ecs } from '@/lib/data';
import { Page, PageHead, Card, Stat, CompositionBar, Empty, PartyDot } from '@/components/ui';

export const metadata: Metadata = {
  alternates: { canonical: '/nirbachon' },
  title: 'ত্রয়োদশ জাতীয় সংসদ নির্বাচন',
  description: 'ত্রয়োদশ জাতীয় সংসদ নির্বাচনের আসনভিত্তিক ফলাফল ও নির্বাচিত সদস্যদের তালিকা।',
};

export default function ElectionPage() {
  const s = statistics();
  const territorial = seats.filter((x) => !x.reserved);

  const byDistrict = new Map<string, { bn: string; list: typeof territorial }>();
  for (const seat of territorial) {
    const d = districtOf(seat);
    if (!d) continue;
    const e = byDistrict.get(d.en) ?? { bn: d.bn, list: [] as typeof territorial };
    e.list.push(seat);
    byDistrict.set(d.en, e);
  }
  const districts = [...byDistrict.values()].sort((a, b) => a.bn.localeCompare(b.bn, 'bn'));

  return (
    <Page>
      <PageHead
        eyebrow="২০২৬"
        title="ত্রয়োদশ জাতীয় সংসদ নির্বাচন"
        lede={`${bn(300)}টি আসনে নির্বাচন। বর্তমানে ${bn(s.territorial)}টি আসনে সদস্য আছেন, সেই সঙ্গে ${bn(s.reserved)}টি সংরক্ষিত নারী আসন মিলিয়ে সংসদে ${bn(s.total)} জন।`}
        aside={
          <div className="grid grid-cols-3 gap-3">
            <Stat label="আসন" value={bn(300)} />
            <Stat label="পূর্ণ" value={bn(s.territorial)} />
            <Stat label="দল" value={bn(parties.length)} />
          </div>
        }
      />

      <Card className="mt-8 p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="serif text-[21px] font-bold">সংসদের গঠন</h2>
          <p className="text-[13px] text-muted">
            সংরক্ষিত আসনসহ মোট {bn(s.total)}টি আসন। শুধু নির্বাচনের ফল আলাদা, নিচে দেখুন।
          </p>
        </div>
        <CompositionBar parties={parties} total={s.total} majority={s.majority} />
        <div className="border-t border-rule pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[14px]">
          {parties.slice(0, 4).map((p) => (
            <div key={p.abbr} className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-muted">
                <PartyDot abbr={p.abbr} />
                {p.nameBn ?? p.abbr}
              </span>
              <span className="tnum">
                <strong className="text-[17px]">{bn(p.seatsTerritorial)}</strong>
                <span className="text-muted"> আসনে নির্বাচিত</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="serif text-[21px] font-bold">ভোটার ও ভোটকেন্দ্র</h2>
          <p className="text-[13px] text-muted">
            সারা দেশের হিসাব, নির্বাচন কমিশনের প্রকাশিত তথ্য অনুযায়ী
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <span className="serif tnum text-[26px] font-extrabold leading-none">{bnGroup(ecs.national.registeredVoters)}</span>
            <span className="text-[13px] text-muted">মোট ভোটার</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="serif tnum text-[26px] font-extrabold leading-none">{bnGroup(ecs.national.maleVoters)}</span>
            <span className="text-[13px] text-muted">পুরুষ ভোটার</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="serif tnum text-[26px] font-extrabold leading-none">{bnGroup(ecs.national.femaleVoters)}</span>
            <span className="text-[13px] text-muted">নারী ভোটার</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="serif tnum text-[26px] font-extrabold leading-none">{bnGroup(ecs.national.pollingCentres)}</span>
            <span className="text-[13px] text-muted">ভোটকেন্দ্র</span>
          </div>
        </div>
        <p className="text-[12.5px] text-muted border-t border-rule pt-3">
          তথ্যসূত্র: {ecs.source} · পড়া হয়েছে {dateBn(ecs.readOn)}
        </p>
      </Card>

      <div className="mt-4">
        <Empty
          title="আসনভিত্তিক প্রার্থী তালিকা ও ভোটের সংখ্যা এখনো যোগ করা হয়নি"
          body="নির্বাচন কমিশনের গেজেট থেকে প্রতিটি আসনের প্রার্থী, প্রতীক ও প্রাপ্ত ভোট যোগ করা হবে। যাচাই করা সংখ্যা ছাড়া কিছু দেখানো হবে না।"
        />
      </div>

      <section className="mt-10 pb-14 flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="serif text-[26px] font-bold">জেলা অনুযায়ী আসন</h2>
          <span className="text-[14px] text-muted tnum">{bn(districts.length)} জেলা</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {districts.map((d) => (
            <Card key={d.bn} className="p-5 flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="serif text-[18px] font-bold">{d.bn}</h3>
                <span className="text-[13px] text-muted tnum">{bn(d.list.length)} আসন</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-[14.5px]">
                {d.list.map((seat) => {
                  const m = seat.memberId ? getMemberById(seat.memberId) : undefined;
                  return (
                    <li key={seat.no}>
                      <Link href={`/ason/${seat.slug}`} className="flex items-center gap-2 hover:text-brand">
                        <PartyDot abbr={m?.party?.abbr} />
                        <span className="font-medium shrink-0">{seat.nameBn}</span>
                        <span className="text-muted truncate">{m?.nameBn ?? m?.nameEn}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
        <p className="text-[13px] text-muted">
          তথ্যসূত্র: বাংলাদেশ জাতীয় সংসদ · হালনাগাদ {dateBn(meta.syncedAt)}
        </p>
      </section>
    </Page>
  );
}
