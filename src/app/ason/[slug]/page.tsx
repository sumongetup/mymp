import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  seats, getSeat, getMemberById, districtOf, bn, initial, dateBn, meta, partyColor,
} from '@/lib/data';
import { Page, Card, Breadcrumb, Empty, PartyDot } from '@/components/ui';
import MemberPhoto from '@/components/MemberPhoto';

export function generateStaticParams() {
  return seats.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<'/ason/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const s = getSeat(slug);
  if (!s) return { title: 'আসন পাওয়া যায়নি' };
  const m = getMemberById(s.memberId);
  return {
    title: `${s.nameBn} আসন`,
    alternates: { canonical: `/ason/${s.slug}` },
    description: `${s.nameBn} আসনের বর্তমান সংসদ সদস্য${m ? ` ${m.nameBn ?? m.nameEn}` : ''}। ত্রয়োদশ জাতীয় সংসদ।`,
  };
}

export default async function SeatPage({ params }: PageProps<'/ason/[slug]'>) {
  const { slug } = await params;
  const seat = getSeat(slug);
  if (!seat) notFound();

  const member = getMemberById(seat.memberId);
  const district = districtOf(seat);
  const neighbours = district
    ? seats.filter((s) => s.no !== seat.no && districtOf(s)?.en === district.en)
    : [];

  const idx = seats.findIndex((s) => s.no === seat.no);
  const prev = seats[idx - 1];
  const next = seats[idx + 1];

  return (
    <Page>
      <Breadcrumb
        items={[
          { href: '/', label: 'হোম' },
          { href: '/nirbachon', label: 'ত্রয়োদশ নির্বাচন' },
          ...(district ? [{ label: district.bn }] : []),
          { label: seat.nameBn ?? '' },
        ]}
      />

      <header className="pt-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-bold tracking-[1.5px] text-brand">
            ত্রয়োদশ জাতীয় সংসদ
          </span>
          <h1 className="serif text-[38px] sm:text-[50px] leading-[1.08] font-extrabold">
            {seat.nameBn}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-[16px] text-inksoft">
            {seat.nameEn && <span>{seat.nameEn}</span>}
            {seat.reserved
              ? <span className="px-3 py-1 rounded-full border border-rule text-[13px] font-semibold">সংরক্ষিত নারী আসন</span>
              : district && <span>{district.bn} জেলা</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {prev && (
            <Link href={`/ason/${prev.slug}`} className="flex items-center gap-2 h-11 px-4 border border-rule rounded-full bg-surface text-[14px] font-semibold hover:border-brand">
              <span aria-hidden="true" className="text-muted">‹</span> {prev.nameBn}
            </Link>
          )}
          {next && (
            <Link href={`/ason/${next.slug}`} className="flex items-center gap-2 h-11 px-4 border border-rule rounded-full bg-surface text-[14px] font-semibold hover:border-brand">
              {next.nameBn} <span aria-hidden="true" className="text-muted">›</span>
            </Link>
          )}
        </div>
      </header>

      <div className="pt-8 pb-14 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-10 items-start">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className="serif text-[24px] font-bold">বর্তমান সংসদ সদস্য</h2>
            {member ? (
              <Link
                href={`/mp/${member.slug}`}
                className="bg-surface border-[1.5px] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 hover:shadow-sm transition-shadow"
                style={{ borderColor: partyColor(member.party?.abbr) }}
              >
                <MemberPhoto src={member.photoUrl} alt="" initial={initial(member)} size={88} />
                <span className="grow flex flex-col gap-2">
                  <span className="serif text-[24px] sm:text-[28px] font-extrabold leading-tight">
                    {member.nameBn ?? member.nameEn}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-inksoft">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <PartyDot abbr={member.party?.abbr} />
                      {member.party?.nameBn ?? member.party?.abbr}
                    </span>
                    {member.professionBn && <span>{member.professionBn}</span>}
                  </span>
                </span>
                <span className="text-[14px] font-semibold text-brand shrink-0">প্রোফাইল →</span>
              </Link>
            ) : (
              <Empty title="এই আসনে বর্তমানে কোনো সদস্য নেই।" />
            )}
          </section>

          {seat.boundaryBn && (
            <section className="flex flex-col gap-4">
              <h2 className="serif text-[24px] font-bold">আসনের এলাকা</h2>
              <Card className="p-5">
                <p className="text-[15.5px] leading-relaxed">{seat.boundaryBn}</p>
              </Card>
            </section>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="serif text-[24px] font-bold">২০২৬ নির্বাচনের ফল</h2>
            <Empty
              title="এই আসনের প্রার্থী তালিকা ও ভোটের সংখ্যা এখনো যোগ করা হয়নি।"
              body="নির্বাচন কমিশনের গেজেট থেকে প্রার্থী, প্রতীক ও প্রাপ্ত ভোট যোগ করা হবে। যাচাই করা সংখ্যা ছাড়া কিছু দেখানো হবে না।"
            />
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-5 flex flex-col gap-3">
            <h2 className="serif text-[19px] font-bold">আসন তথ্য</h2>
            <div className="flex flex-col gap-2 text-[15px]">
              <div className="flex justify-between gap-3 py-1.5 border-b border-rulesoft">
                <span className="text-muted">আসন নম্বর</span>
                <span className="font-medium tnum">{bn(seat.no)}</span>
              </div>
              {district && (
                <div className="flex justify-between gap-3 py-1.5 border-b border-rulesoft">
                  <span className="text-muted">জেলা</span>
                  <span className="font-medium">{district.bn}</span>
                </div>
              )}
              <div className="flex justify-between gap-3 py-1.5">
                <span className="text-muted">ধরন</span>
                <span className="font-medium">{seat.reserved ? 'সংরক্ষিত নারী আসন' : 'সাধারণ আসন'}</span>
              </div>
            </div>
          </Card>

          {neighbours.length > 0 && (
            <Card className="p-5 flex flex-col gap-3">
              <h2 className="serif text-[19px] font-bold">{district?.bn} জেলার আসন</h2>
              <ul className="flex flex-col gap-2 text-[15px]">
                {neighbours.map((s) => {
                  const holder = getMemberById(s.memberId);
                  return (
                    <li key={s.no}>
                      <Link href={`/ason/${s.slug}`} className="flex justify-between gap-3 hover:text-brand">
                        <span>{s.nameBn}</span>
                        <span className="text-muted truncate max-w-[55%]">{holder?.nameBn}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <div className="p-4 rounded-xl bg-brandsoft flex flex-col gap-2">
            <span className="text-[14.5px] font-bold text-branddark">তথ্যসূত্র</span>
            <span className="text-[13px] leading-relaxed text-brand">
              বাংলাদেশ জাতীয় সংসদ। হালনাগাদ {dateBn(meta.syncedAt)}।
            </span>
          </div>
        </aside>
      </div>
    </Page>
  );
}

export const dynamicParams = false;
